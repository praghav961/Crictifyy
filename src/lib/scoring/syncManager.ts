import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { doc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { BallEvent, InningsState } from './types';
import { processEvent, createInitialState } from './engine';
import { query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';

interface ScoringSyncDB extends DBSchema {
  sync_queue: {
    key: number;
    value: {
      id?: number;
      matchId: string;
      inningId: string;
      event: BallEvent;
      timestamp: number;
    };
    indexes: { 'by-match': string };
  };
}

let dbPromise: Promise<IDBPDatabase<ScoringSyncDB>> | null = null;

export function getSyncDB() {
  if (!dbPromise) {
    dbPromise = openDB<ScoringSyncDB>('crictify-sync', 1, {
      upgrade(db) {
        const store = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-match', 'matchId');
      },
    });
  }
  return dbPromise;
}

export async function addToSyncQueue(matchId: string, inningId: string, event: BallEvent) {
  const db = await getSyncDB();
  await db.add('sync_queue', {
    matchId,
    inningId,
    event,
    timestamp: Date.now(),
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await getSyncDB();
  return db.count('sync_queue');
}

export async function processSyncQueue() {
  if (!navigator.onLine) return;

  const idb = await getSyncDB();
  const tx = idb.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const events = await store.getAll();
  await tx.done;

  if (events.length === 0) return;

  // Process sequentially to handle conflicts and dependencies
  for (const item of events) {
    if (!navigator.onLine) break; // stop if we go offline during processing
    
    try {
      const matchRef = doc(db, 'matches', item.matchId);
      const innRef = doc(db, 'matches', item.matchId, 'innings', item.inningId);
      const ballRef = doc(collection(db, 'matches', item.matchId, 'innings', item.inningId, 'balls'), item.event.eventId);
      
      const innSnap = await getDoc(innRef);
      const matchSnap = await getDoc(matchRef);
      
      if (!innSnap.exists() || !matchSnap.exists()) {
        // Match or inning deleted, discard event
        await idb.delete('sync_queue', item.id!);
        continue;
      }

      let currentState = innSnap.data() as InningsState;
      let matchData = matchSnap.data() as any;

      // Conflict detection: Has this event already been processed?
      if (currentState.processedEvents?.includes(item.event.eventId)) {
        await idb.delete('sync_queue', item.id!);
        continue;
      }

      // Compute new state based on LATEST remote state
      let newState: InningsState;
      try {
        newState = processEvent(currentState, item.event);
      } catch (logicErr) {
        console.error('Poison event dropped:', item.event.eventId, logicErr);
        await idb.delete('sync_queue', item.id!);
        continue;
      }

      const summary = `${newState.totalRuns}/${newState.totalWickets} (${newState.completedOvers}.${newState.currentOverBalls})`;
      const updateObj: any = {};
      if (newState.teamId === matchData.team1Id) updateObj.team1Score = summary;
      else updateObj.team2Score = summary;

      if (newState.status === 'COMPLETED') {
        if (newState.inningId.startsWith('inning_2_')) {
          updateObj.status = 'COMPLETED';
          if (newState.totalRuns >= (newState.targetRuns || 0)) {
            updateObj.result = `${matchData.team2ShortName || matchData.team2Name} won`;
          } else if (newState.totalRuns === (newState.targetRuns || 0) - 1) {
            updateObj.result = 'Match Tied';
          } else {
            updateObj.result = `${matchData.team1ShortName || matchData.team1Name} won`;
          }
        } else {
          updateObj.currentInningId = '';
        }
      }

      const batch = writeBatch(db);
      batch.set(ballRef, JSON.parse(JSON.stringify(item.event)));
      batch.update(innRef, JSON.parse(JSON.stringify(newState)));
      batch.update(matchRef, updateObj);

      await batch.commit();

      // Remove from queue after successful sync
      await idb.delete('sync_queue', item.id!);
    } catch (err: any) {
      console.error('Error syncing event:', item.event.eventId, err);
      // If it's a permission or not found error, drop it. Otherwise it's likely network, so break and retry later.
      if (err.code === 'permission-denied' || err.code === 'not-found') {
         await idb.delete('sync_queue', item.id!);
      } else {
         break;
      }
    }
  }
}

// Set up periodic sync
let syncInterval: any = null;
export function startSyncDaemon(onStatusChange: (pending: number) => void) {
  if (syncInterval) clearInterval(syncInterval);
  
  const checkAndSync = async () => {
    const count = await getPendingCount();
    onStatusChange(count);
    if (count > 0 && navigator.onLine) {
      await processSyncQueue();
      const newCount = await getPendingCount();
      onStatusChange(newCount);
    }
  };

  syncInterval = setInterval(checkAndSync, 3000);
  window.addEventListener('online', checkAndSync);
  
  return () => {
    clearInterval(syncInterval);
    window.removeEventListener('online', checkAndSync);
  };
}



export async function undoLastEvent(matchId: string, inningId: string) {
  // 1. Try local queue first
  const dbIdb = await getSyncDB();
  const tx = dbIdb.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const allQueue = await store.getAll();
  const matchQueue = allQueue.filter(e => e.matchId === matchId && e.inningId === inningId).sort((a, b) => b.timestamp - a.timestamp);
  
  if (matchQueue.length > 0) {
    await store.delete(matchQueue[0].id!);
    await tx.done;
    return true;
  }
  await tx.done;

  // 2. If not in local queue, undo from Firestore
  const ballsRef = collection(db, 'matches', matchId, 'innings', inningId, 'balls');
  const ballsSnap = await getDocs(query(ballsRef, orderBy('timestamp', 'asc')));
  
  if (ballsSnap.empty) return false;

  const events = ballsSnap.docs.map(d => ({ ref: d.ref, data: d.data() as BallEvent }));
  const lastEvent = events.pop();
  
  const innRef = doc(db, 'matches', matchId, 'innings', inningId);
  const innSnap = await getDoc(innRef);
  if (!innSnap.exists()) return false;
  
  const currentState = innSnap.data() as InningsState;
  
  // Reconstruct initial state using the very first event, or the one we are deleting if it was the only one
  const firstEvent = events.length > 0 ? events[0].data : lastEvent!.data;
  
  let newState = createInitialState(
    matchId, 
    inningId, 
    currentState.teamId, 
    firstEvent.strikerId, 
    firstEvent.nonStrikerId, 
    firstEvent.bowlerId, 
    currentState.maxOvers, 
    currentState.targetRuns
  );

  // Replay remaining events
  for (const e of events) {
    newState = processEvent(newState, e.data);
  }

  const batch = writeBatch(db);
  batch.delete(lastEvent!.ref);
  batch.update(innRef, JSON.parse(JSON.stringify(newState)));
  
  const matchRef = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (matchSnap.exists()) {
    const matchData = matchSnap.data();
    const summary = `${newState.totalRuns}/${newState.totalWickets} (${newState.completedOvers}.${newState.currentOverBalls})`;
    const updateObj: any = {};
    if (newState.teamId === matchData.team1Id) updateObj.team1Score = summary;
    else updateObj.team2Score = summary;
    
    // If we undo a match-ending ball, we need to revert the match status to LIVE
    if (newState.status === 'IN_PROGRESS' && matchData.status === 'COMPLETED') {
      updateObj.status = 'LIVE';
      updateObj.result = '';
    }
    batch.update(matchRef, updateObj);
  }

  await batch.commit();
  return true;
}
