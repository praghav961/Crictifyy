import { auth } from '../../../lib/firebase';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, writeBatch, collection, query, orderBy, limit, getDocs, where, getDoc, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match, TournamentPlayer } from '../../../types';
import { InningsState, BallEvent } from '../../../lib/scoring/types';
import { processEvent } from '../../../lib/scoring/engine';
import { PlayerNameResolver } from '../../../components/PlayerNameResolver';
import { addToSyncQueue, getSyncDB, startSyncDaemon, undoLastEvent } from '../../../lib/scoring/syncManager';
import { Modal } from '../../../components/ui/Modal';
import { GroupStandingsWidget } from '../../../components/GroupStandingsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';


import { Button } from '../../../components/ui/Button';
import { logAudit } from '../../../lib/audit';

export function LiveScoring({ match }: { match: Match }) {
    const [innings, setInnings] = useState<InningsState | null>(null);
  const [recentBalls, setRecentBalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSynced, setShowSynced] = useState(false);
  
  
    const [newBatterName, setNewBatterName] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');
  const [isImpactPlayer, setIsImpactPlayer] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>('');
  
    const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [extraType, setExtraType] = useState<'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' | ''>('');
  const [extraRuns, setExtraRuns] = useState(1);
  const [extraBatterRuns, setExtraBatterRuns] = useState(0);

  const openExtrasModal = (type: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY') => {
    setExtraType(type);
    setExtraRuns(type === 'PENALTY' ? 5 : 1);
    setExtraBatterRuns(0);
    setExtrasModalOpen(true);
  };
  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState('CAUGHT');
  const [playerOut, setPlayerOut] = useState('STRIKER'); // 'STRIKER' or 'NON_STRIKER'
  const [fielderName, setFielderName] = useState('');

  
  const [battingPlayers, setBattingPlayers] = useState<TournamentPlayer[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<TournamentPlayer[]>([]);
  
  useEffect(() => {
    if (!match.tournamentId || !innings) return;
    
    const fetchPlayers = async () => {
       const battingTeamId = innings.teamId;
       const bowlingTeamId = battingTeamId === match.team1Id ? match.team2Id : match.team1Id;
       
       try {
          const batQ = query(collection(db, `tournaments/${match.tournamentId}/players`), where('teamId', '==', battingTeamId));
          const bowlQ = query(collection(db, `tournaments/${match.tournamentId}/players`), where('teamId', '==', bowlingTeamId));
          const [batSnap, bowlSnap] = await Promise.all([getDocs(batQ), getDocs(bowlQ)]);
          setBattingPlayers(batSnap.docs.map(d => d.data() as TournamentPlayer));
          setBowlingPlayers(bowlSnap.docs.map(d => d.data() as TournamentPlayer));
       } catch(err) {
          console.error(err);
       }
    };
    fetchPlayers();
  }, [match.tournamentId, innings?.teamId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let timeout: any;
    const stopDaemon = startSyncDaemon((count) => {
      if (pendingSync > 0 && count === 0 && isOnline) {
        setShowSynced(true);
        timeout = setTimeout(() => setShowSynced(false), 3000);
      }
      setPendingSync(count);
    });
    return () => {
      stopDaemon();
      if (timeout) clearTimeout(timeout);
    };
  }, [pendingSync, isOnline]);

  useEffect(() => {
    if (!match.currentInningId) return;
    const unsub = onSnapshot(doc(db, 'matches', match.id, 'innings', match.currentInningId), async (snap) => {
            if (snap.exists()) {
        let baseState = snap.data() as InningsState;
        
        try {
          const syncDb = await getSyncDB();
          const pendingEvents = await syncDb.getAll('sync_queue');
          const matchEvents = pendingEvents.filter(e => e.matchId === match.id && e.inningId === match.currentInningId);
          
          for (const item of matchEvents) {
            if (!baseState.processedEvents?.includes(item.event.eventId)) {
              baseState = processEvent(baseState, item.event);
            }
          }
        } catch (e) {
          console.error("Failed to apply local queue", e);
        }
        
        setInnings(baseState);
      }
      setLoading(false);
    });

    // Listen to recent balls
    const ballsQuery = query(collection(db, 'matches', match.id, 'innings', match.currentInningId, 'balls'), orderBy('timestamp', 'desc'), limit(12));
    const unsubBalls = onSnapshot(ballsQuery, (snap) => {
      setRecentBalls(snap.docs.map(d => d.data()).reverse());
    });

    return () => {
      unsub();
      unsubBalls();
    };
  }, [match.id, match.currentInningId]);

    const handleScoreEvent = async (runs: number, eType?: any, isBoundary = false, boundaryType?: any, isWicket = false, rawExtraRuns?: number) => {
    if (!innings || !match.currentInningId) return;
    if (!innings.currentStrikerId || !innings.currentNonStrikerId || !innings.currentBowlerId) {
      alert("Please assign all active players first.");
      return;
    }

    const eventId = `ball_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event: BallEvent = {
      eventId,
      timestamp: Date.now(),
      matchId: match.id,
      inningId: match.currentInningId,
      bowlerId: innings.currentBowlerId,
      strikerId: innings.currentStrikerId,
      nonStrikerId: innings.currentNonStrikerId,
      runs: runs,
      isBoundary,
      ...(boundaryType != null && { boundaryType }),
      ...(innings.freeHitActive !== undefined && { isFreeHit: innings.freeHitActive }),
      ...(selectedZone ? { shotZone: selectedZone } : {})
    };
    setSelectedZone(''); 
    
    if (eType) {
      event.extras = [{ type: eType, runs: rawExtraRuns || 1 }];
    }

    if (isWicket) {
      event.wickets = [{ type: wicketType as any, playerOutId: playerOut === 'STRIKER' ? innings.currentStrikerId : innings.currentNonStrikerId }];
      if (fielderName) {
        event.wickets[0].assistIds = [`temp_${fielderName.replace(/\s+/g, '_')}`];
      }
    }

    const optimisticState = processEvent(innings, event);
    setInnings(optimisticState);
    await addToSyncQueue(match.id, match.currentInningId, event);
    logAudit(auth.currentUser?.uid || '', 'BALL_ADDED', { matchId: match.id, metadata: { eventId: event.eventId, runs: event.runs, isBoundary: event.isBoundary } });
  
    if (optimisticState.status === 'COMPLETED' && innings.status !== 'COMPLETED') {
      await finalizeInnings(optimisticState);
    }
  };

  const assignPlayer = async (role: 'STRIKER' | 'NON_STRIKER' | 'BOWLER', nameOrId: string) => {
    if (!nameOrId || !innings || !match.currentInningId) return;
    
    // Check if it's an ID from the dropdowns
    const allPlayers = [...battingPlayers, ...bowlingPlayers];
    const playerObj = allPlayers.find(p => p.id === nameOrId);
    let name = playerObj ? playerObj.id : nameOrId;
    
    const finalName = isImpactPlayer && !playerObj ? `${name} (Sub)` : name;
    const displayName = playerObj ? (isImpactPlayer ? `${playerObj.name} (Sub)` : playerObj.name) : finalName;
    
    // Check if player already exists in the inning by name to avoid duplicate temp IDs
    let tempId = playerObj ? playerObj.id : '';
    
    if (!tempId) {
       if (role === 'STRIKER' || role === 'NON_STRIKER') {
         const existing = Object.values(innings.batterStats).find((b: any) => b.name === displayName || b.id.replace('temp_', '').replace(/_/g, ' ') === finalName || b.id === finalName) as any;
         if (existing) tempId = existing.id;
       } else {
         const existing = Object.values(innings.bowlerStats).find((b: any) => b.name === displayName || b.id.replace('temp_', '').replace(/_/g, ' ') === finalName || b.id === finalName) as any;
         if (existing) tempId = existing.id;
       }
       if (!tempId) tempId = `temp_${finalName.replace(/\s+/g, '_')}`;
    }
    
    const updates: any = {};
    if (role === 'STRIKER') {
      updates.currentStrikerId = tempId;
      if (!innings.batterStats[tempId]) updates[`batterStats.${tempId}`] = { id: tempId, name: displayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    } else if (role === 'NON_STRIKER') {
      updates.currentNonStrikerId = tempId;
      if (!innings.batterStats[tempId]) updates[`batterStats.${tempId}`] = { id: tempId, name: displayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    } else {
      // Check max overs
      const maxOvers = match.overs ? Math.ceil(match.overs / 5) : 4;
      const bStats = innings.bowlerStats[tempId];
      if (bStats && bStats.overs >= maxOvers) {
        if (!confirm(`This bowler has already reached their maximum limit of ${maxOvers} overs. Continue anyway?`)) {
          return;
        }
      }
      updates.currentBowlerId = tempId;
      if (!innings.bowlerStats[tempId]) updates[`bowlerStats.${tempId}`] = { id: tempId, name: displayName, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 };
    }

    await updateDoc(doc(db, 'matches', match.id, 'innings', match.currentInningId), updates);
    if (role === 'BOWLER') setNewBowlerName('');
    else setNewBatterName('');
  };

  const forceEndOver = async () => {
    if (!innings || !match.currentInningId) return;
    if (!confirm('Are you sure you want to manually end this over?')) return;
    
    // Simplification for MVP: We just update the overs.
    const updates = {
      completedOvers: innings.completedOvers + 1,
      currentOverBalls: 0,
      currentOverRunsConcededByBowler: 0,
      currentStrikerId: innings.currentNonStrikerId,
      currentNonStrikerId: innings.currentStrikerId,
      currentBowlerId: ''
    };
    await updateDoc(doc(db, 'matches', match.id, 'innings', match.currentInningId), updates);
  };

  
  
  const finalizeInnings = async (finalState: InningsState) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', match.id, 'innings', match.currentInningId!), { status: 'COMPLETED' });
    
    if (finalState.inningId.startsWith('inning_2_')) {
      let resultText = '';
      let t1Won = false;
      let t2Won = false;
      let tie = false;

      if (finalState.targetRuns) {
        if (finalState.totalRuns >= finalState.targetRuns) {
          const wicketsRemaining = 10 - finalState.totalWickets;
          resultText = `${match.team2Name} won by ${wicketsRemaining} wickets`;
          t2Won = true;
        } else if (finalState.totalRuns === finalState.targetRuns - 1) {
          resultText = 'Match Tied';
          tie = true;
        } else {
          const runsShort = (finalState.targetRuns - 1) - finalState.totalRuns;
          resultText = `${match.team1Name} won by ${runsShort} runs`;
          t1Won = true;
        }
      } else {
         resultText = 'Match Completed';
      }

      batch.update(doc(db, 'matches', match.id), { status: 'COMPLETED', result: resultText });
      logAudit(auth.currentUser?.uid || '', 'MATCH_FINALIZED', { matchId: match.id, metadata: { result: resultText } });

      // Trigger update to the tournament teams Points Table
      if (match.tournamentId) {
        const t1Ref = doc(db, `tournaments/${match.tournamentId}/teams`, match.team1Id);
        const t2Ref = doc(db, `tournaments/${match.tournamentId}/teams`, match.team2Id);
        
        batch.update(t1Ref, { 
          played: increment(1),
          won: increment(t1Won ? 1 : 0),
          lost: increment(t2Won ? 1 : 0),
          tied: increment(tie ? 1 : 0),
          points: increment(t1Won ? 2 : tie ? 1 : 0)
        });

        batch.update(t2Ref, { 
          played: increment(1),
          won: increment(t2Won ? 1 : 0),
          lost: increment(t1Won ? 1 : 0),
          tied: increment(tie ? 1 : 0),
          points: increment(t2Won ? 2 : tie ? 1 : 0)
        });
      }

    } else {
      batch.update(doc(db, 'matches', match.id), { currentInningId: '' });
    }
    await batch.commit();
  };


  const forceEndInnings = async () => {
    if (!innings || !match.currentInningId) return;
    if (!confirm('End the innings here?')) return;
    
    
    await finalizeInnings(innings);
  };

  if (loading || !innings) return <div className="p-4 text-center">Loading live scoring...</div>;

  const striker = innings.batterStats[innings.currentStrikerId || ''] || null;
  const nonStriker = innings.batterStats[innings.currentNonStrikerId || ''] || null;
  const bowler = innings.bowlerStats[innings.currentBowlerId || ''] || null;
  
  const crr = innings.completedOvers || innings.currentOverBalls ? 
    (innings.totalRuns / (innings.completedOvers + innings.currentOverBalls/6)).toFixed(2) : '0.00';
  const rrr = innings.targetRuns && innings.maxOvers ?
    ((innings.targetRuns - innings.totalRuns) / (innings.maxOvers - (innings.completedOvers + innings.currentOverBalls/6))).toFixed(2) : '0.00';

  // Powerplay Logic
  const isPowerplay = match.overs ? (innings.completedOvers < Math.ceil(match.overs * 0.3)) : false;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-48">
            {isPowerplay && (
        <div className="bg-warning/20 border-2 border-warning text-warning font-black uppercase text-sm px-2 py-1 rounded inline-block mb-2">
          POWERPLAY 1
        </div>
      )}
      {innings.freeHitActive && (
        <div className="bg-primary/20 border-2 border-primary text-primary font-black uppercase text-xl p-3 rounded-lg text-center animate-pulse">
          FREE HIT
        </div>
      )}
{/* Offline Sync Banner */}
      {(!isOnline || pendingSync > 0 || showSynced) && (
        <div className={`p-2 text-center text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 ${!isOnline ? 'bg-error/10 text-error' : showSynced ? 'bg-green-500/10 text-green-500' : 'bg-warning/10 text-warning'}`}>
          {!isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              OFFLINE: {pendingSync > 0 ? `${pendingSync} scoring events waiting to sync` : 'Disconnected'}
            </>
          ) : showSynced ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              SYNCED
            </>
          ) : (
            <>
              <span className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin"></span>
              SYNCING...
            </>
          )}
        </div>
      )}

      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between">
          <div className="text-center sm:text-left">
            <h2 className="text-4xl font-black">{innings.totalRuns}-{innings.totalWickets}</h2>
            <p className="text-primary-foreground/80 font-medium tracking-widest uppercase">
              Overs {innings.completedOvers}.{innings.currentOverBalls} {innings.maxOvers ? `/ ${innings.maxOvers}` : ''}
            </p>
          </div>
          <div className="text-center sm:text-right mt-4 sm:mt-0">
            <p className="text-sm font-bold opacity-90">CRR: {crr}</p>
            {innings.targetRuns && (
              <>
                <p className="text-sm font-bold opacity-90">RRR: {rrr}</p>
                <p className="text-lg font-black text-warning">Target: {innings.targetRuns}</p>
                <div className="mt-1 bg-surface/20 px-2 py-1 rounded text-xs font-bold text-center">
                  Need {innings.targetRuns - innings.totalRuns} runs off {(innings.maxOvers * 6) - (innings.completedOvers * 6 + innings.currentOverBalls)} balls
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider">Batters</h3>
            </div>
            <div className="space-y-3">
              {striker ? (
                <div className="flex justify-between items-center bg-surface-hover p-2 rounded border-l-2 border-primary">
                  <span className="font-bold text-sm"><PlayerNameResolver playerId={striker.id} fallbackName={striker.name} /> *</span>
                  <div className="text-right flex flex-col">
                    <span className="font-mono font-bold">{striker.runs} ({striker.ballsFaced})</span>
                    <span className="text-[10px] text-foreground-muted">4s: {striker.fours} | 6s: {striker.sixes} | SR: {striker.ballsFaced ? ((striker.runs / striker.ballsFaced) * 100).toFixed(1) : '0.0'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" placeholder="New Striker" className="flex-1 p-2 border rounded text-sm" value={newBatterName} onChange={e => setNewBatterName(e.target.value)} />
                  <Button size="sm" onClick={() => assignPlayer('STRIKER', newBatterName)}>Add</Button>
                </div>
              )}
              
              {nonStriker ? (
                <div className="flex justify-between items-center bg-surface-hover p-2 rounded">
                  <span className="text-foreground-muted text-sm"><PlayerNameResolver playerId={nonStriker.id} fallbackName={nonStriker.name} /></span>
                  <div className="text-right flex flex-col opacity-70">
                    <span className="font-mono font-bold">{nonStriker.runs} ({nonStriker.ballsFaced})</span>
                    <span className="text-[10px] text-foreground-muted">4s: {nonStriker.fours} | 6s: {nonStriker.sixes} | SR: {nonStriker.ballsFaced ? ((nonStriker.runs / nonStriker.ballsFaced) * 100).toFixed(1) : '0.0'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" placeholder="New Non-Striker" className="flex-1 p-2 border rounded text-sm" value={newBatterName} onChange={e => setNewBatterName(e.target.value)} />
                  <Button size="sm" onClick={() => assignPlayer('NON_STRIKER', newBatterName)}>Add</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Balls */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold">This Over</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recentBalls.slice(-6).map((b, i) => {
                 let label = b.runs.toString();
                 let isW = b.wickets && b.wickets.length > 0;
                 let isExtra = b.extras && b.extras.length > 0;
                 let color = 'bg-surface-hover';
                 
                 if (isW) { label = 'W'; color = 'bg-error text-error-foreground'; }
                 else if (isExtra) { 
                   const type = b.extras[0].type;
                   if (type === 'WIDE') { label = b.extras[0].runs + 'WD'; color = 'bg-warning text-warning-foreground'; }
                   if (type === 'NO_BALL') { label = b.extras[0].runs + 'NB'; color = 'bg-warning text-warning-foreground'; }
                   if (type === 'BYE') { label = b.extras[0].runs + 'B'; color = 'bg-surface-hover'; }
                   if (type === 'LEG_BYE') { label = b.extras[0].runs + 'LB'; color = 'bg-surface-hover'; }
                 } else if (b.runs === 4 || b.runs === 6) {
                   color = 'bg-primary text-primary-foreground';
                 }

                 return (
                   <div key={i} className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${color}`}>
                     {label}
                   </div>
                 );
              })}
              {recentBalls.length === 0 && <span className="text-sm text-foreground-muted">No balls yet in this innings.</span>}
            </div>
          </CardContent>
        </Card>

        {/* Bowler */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider">Current Bowler</h3>
              {bowler && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => updateDoc(doc(db, 'matches', match.id, 'innings', match.currentInningId!), { currentBowlerId: '' })}>Replace</Button>
              )}
            </div>
            {bowler ? (
              <div className="flex justify-between items-center bg-surface-hover p-2 rounded">
                <span className="font-bold text-sm"><PlayerNameResolver playerId={bowler.id} fallbackName={bowler.name} /></span>
                <div className="text-right flex flex-col">
                  <span className="font-mono font-bold">{bowler.wickets}-{bowler.runs}</span>
                  <span className="text-[10px] text-foreground-muted">O: {bowler.overs}.{bowler.balls} | M: {bowler.maidens} | ECO: {bowler.overs || bowler.balls ? (bowler.runs / (bowler.overs + bowler.balls/6)).toFixed(1) : '0.0'}</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input type="text" placeholder="New Bowler" className="w-full p-2 border rounded text-sm bg-background" value={newBowlerName} onChange={e => setNewBowlerName(e.target.value)} />
                  <label className="flex items-center gap-1 text-xs text-foreground-muted"><input type="checkbox" checked={isImpactPlayer} onChange={e => setIsImpactPlayer(e.target.checked)} /> Substitute/Impact Player</label>
                </div>
                <Button size="sm" onClick={() => assignPlayer('BOWLER', newBowlerName)}>Add</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
          {match.tournamentId && (
            <div className="col-span-1 md:col-span-2 mt-4">
              <GroupStandingsWidget tournamentId={match.tournamentId} groupId={match.groupId} />
            </div>
          )}
        

      {/* Action Pad */}
      {innings.status !== 'COMPLETED' && (
        <div className="fixed bottom-[230px] sm:bottom-[210px] left-0 right-0 z-40 bg-surface/90 backdrop-blur border-t border-border overflow-x-auto p-2 scrollbar-none flex gap-2">
           <span className="text-xs font-bold text-foreground-muted flex items-center shrink-0 mr-2">Wagon Wheel:</span>
           {['Third Man', 'Point', 'Cover', 'Mid Off', 'Mid On', 'Mid Wicket', 'Square Leg', 'Fine Leg'].map(z => (
             <Button key={z} size="sm" variant={selectedZone === z ? "default" : "outline"} className={`shrink-0 text-xs h-7 ${selectedZone === z ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setSelectedZone(z === selectedZone ? '' : z)}>{z}</Button>
           ))}
        </div>
      )}
      {innings.status !== 'COMPLETED' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t shadow-2xl">
          <div className="max-w-2xl mx-auto p-2 sm:p-4">
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none opacity-80 mb-2">
              <Button 
  variant="outline" 
  size="sm" 
  className="shrink-0 text-xs h-7" 
  onClick={async () => { 
    if (window.confirm('Are you sure you want to undo the last ball?')) {
      const success = await undoLastEvent(match.id, match.currentInningId);
      if (success) {
        logAudit(auth.currentUser?.uid || '', 'BALL_CORRECTED', { matchId: match.id, metadata: { action: 'undo' } });
      } else {
        alert('Nothing to undo.');
      }
    }
  }}>
  Undo
</Button>
              <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={() => { const val = prompt('Enter corrected score (e.g., 45/2):'); if (val) { logAudit(auth.currentUser?.uid || '', 'SCORE_CORRECTED', { matchId: match.id, metadata: { newScore: val } }); alert('Score correction recorded in audit.'); } }}>Edit</Button>
              <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={forceEndOver}>End Over</Button>
              <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 text-error border-error/20" onClick={forceEndInnings}>End Innings</Button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              {[0, 1, 2, 3].map(r => (
                <Button key={r} variant="outline" className="h-16 text-xl font-bold bg-surface-hover" onClick={() => handleScoreEvent(r)}>{r}</Button>
              ))}
              <Button variant="outline" className="h-16 text-xl font-bold bg-primary/10 text-primary border-primary/20" onClick={() => handleScoreEvent(4, null, true, 'FOUR')}>4</Button>
              <Button variant="outline" className="h-16 text-xl font-bold bg-primary/20 text-primary border-primary/30" onClick={() => handleScoreEvent(6, null, true, 'SIX')}>6</Button>
              
              <Button variant="outline" className="h-16 text-sm font-bold border-warning/50 text-warning" onClick={() => openExtrasModal('WIDE')}>WD</Button>
              <Button variant="outline" className="h-16 text-sm font-bold border-warning/50 text-warning" onClick={() => openExtrasModal('NO_BALL')}>NB</Button>
              
              <Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick={() => openExtrasModal('BYE')}>B</Button>
              <Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick={() => openExtrasModal('LEG_BYE')}>LB</Button>
              
              <Button variant="destructive" className="h-16 text-sm font-bold col-span-2 shadow-lg" onClick={() => { setWicketType('CAUGHT'); setPlayerOut('STRIKER'); setFielderName(''); setWicketModalOpen(true); }}>
                WICKET
              </Button>
            </div>
          </div>
        </div>
      )}
    
      
      <Modal isOpen={!innings.currentBowlerId && innings.status !== 'COMPLETED'} onClose={() => {}} title="Select New Bowler">
        <div className="space-y-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20">
            Over completed. Please select the next bowler.
          </div>
          <div className="space-y-1">
            <input type="text" placeholder="Bowler Name" className="w-full p-2 border rounded text-sm bg-background" value={newBowlerName} onChange={e => setNewBowlerName(e.target.value)} />
            <label className="flex items-center gap-1 text-xs text-foreground-muted">
              <input type="checkbox" checked={isImpactPlayer} onChange={e => setIsImpactPlayer(e.target.checked)} /> Substitute/Impact Player
            </label>
          </div>
          <div className="flex justify-end gap-2">
             <Button onClick={() => assignPlayer('BOWLER', newBowlerName)} disabled={!newBowlerName}>Start Over</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={extrasModalOpen} onClose={() => setExtrasModalOpen(false)} title="Extras Details">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-bold">{extraType === 'WIDE' ? 'Wide Runs (Total)' : extraType === 'BYE' || extraType === 'LEG_BYE' ? 'Total Extras' : 'Extra Penalty Runs'}</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(r => (
                 <Button key={r} variant={extraRuns === r ? 'default' : 'outline'} onClick={() => setExtraRuns(r)}>{r}</Button>
              ))}
            </div>
          </div>
          {extraType === 'NO_BALL' && (
            <div>
              <label className="block text-sm mb-1 font-bold">Batter Runs off No Ball</label>
              <div className="flex gap-2">
                {[0,1,2,3,4,6].map(r => (
                   <Button key={r} variant={extraBatterRuns === r ? 'default' : 'outline'} onClick={() => setExtraBatterRuns(r)}>{r}</Button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setExtrasModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setExtrasModalOpen(false);
              handleScoreEvent(extraType === 'NO_BALL' ? extraBatterRuns : 0, extraType, false, null, false, extraRuns);
            }}>Confirm {extraType?.replace('_', ' ')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={wicketModalOpen} onClose={() => setWicketModalOpen(false)} title="Wicket Details">
        
          
            
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Dismissal Type</label>
              <select className="w-full p-2 border rounded bg-background" value={wicketType} onChange={e => setWicketType(e.target.value)}>
                
                
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="LBW">LBW</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                  <option value="RETIRED_HURT">Retired Hurt</option>
                  <option value="RETIRED_OUT">Retired Out</option>
                  <option value="OBSTRUCTING_THE_FIELD">Obstructing the Field</option>
                
              </select>
            </div>
            
            {innings.freeHitActive && (
               <div className="p-2 bg-primary/20 text-primary text-xs rounded">
                 FREE HIT is active. Only Run Out or Obstructing the Field are valid dismissals!
               </div>
            )}
            
            <div>
              <label className="block text-sm mb-1">Who is Out?</label>
              <select className="w-full p-2 border rounded bg-background" value={playerOut} onChange={e => setPlayerOut(e.target.value)}>
                
                
                  <option value="STRIKER">{striker?.id?.replace('temp_', '').replace(/_/g, ' ') || 'Striker'} (Striker)</option>
                  <option value="NON_STRIKER">{nonStriker?.id?.replace('temp_', '').replace(/_/g, ' ') || 'Non-Striker'} (Non-Striker)</option>
                
              </select>
            </div>
            
            {(wicketType === 'CAUGHT' || wicketType === 'RUN_OUT' || wicketType === 'STUMPED') && (
              <div>
                <label className="block text-sm mb-1">Fielder Name (Optional)</label>
                <input type="text" className="w-full p-2 border rounded text-sm bg-background" value={fielderName} onChange={e => setFielderName(e.target.value)} placeholder="E.g., Virat" />
              </div>
            )}
            
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setWicketModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                 setWicketModalOpen(false);
                 handleScoreEvent(0, null, false, null, true);
              }}>Confirm Wicket</Button>
            </div>
          </div>
        
      </Modal>
    </div>
  );
}
