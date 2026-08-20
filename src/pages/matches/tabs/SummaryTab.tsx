import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match } from '../../../types';
import { InningsState, BallEvent, BatterStats, BowlerStats } from '../../../lib/scoring/types';

import { POTMCard } from './POTMCard';

export function SummaryTab({ match, isAdmin = false }: { match: Match, isAdmin?: boolean }) {
  const [inningsList, setInningsList] = useState<InningsState[]>([]);
  const [recentBalls, setRecentBalls] = useState<BallEvent[]>([]);

  useEffect(() => {
    if (!match?.id) return;
    const q = query(collection(db, 'matches', match.id, 'innings'), orderBy('inningId', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: InningsState[] = [];
      snap.forEach(d => data.push(d.data() as InningsState));
      setInningsList(data);
    });
    return () => unsub();
  }, [match?.id]);

  useEffect(() => {
    if (!match?.currentInningId) return;
    const q = query(
      collection(db, 'matches', match.id, 'innings', match.currentInningId, 'balls'),
      orderBy('timestamp', 'desc'),
      limit(6)
    );
    const unsub = onSnapshot(q, (snap) => {
      const balls: BallEvent[] = [];
      snap.forEach(d => balls.push(d.data() as BallEvent));
      setRecentBalls(balls);
    });
    return () => unsub();
  }, [match?.id, match?.currentInningId]);

  if (inningsList.length === 0) {
    return <div className="p-8 text-center text-foreground-muted">Match has not started yet.</div>;
  }

  const currentInning = inningsList[inningsList.length - 1];
  
  return (
    <div className="space-y-6">
      <POTMCard match={match} isAdmin={isAdmin} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider mb-4">Top Batters</h3>
          <div className="space-y-2">
            {(Object.values(currentInning.batterStats) as BatterStats[])
              .sort((a, b) => b.runs - a.runs)
              .slice(0, 3)
              .map(b => (
                <div key={b.id} className="flex justify-between items-center text-sm">
                  <span>{b.name || b.id.replace('temp_', '').replace(/_/g, ' ')} {b.id === currentInning.currentStrikerId || b.id === currentInning.currentNonStrikerId ? '*' : ''}</span>
                  <span className="font-bold">{b.runs} <span className="text-foreground-muted font-normal">({b.ballsFaced})</span></span>
                </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider mb-4">Top Bowlers</h3>
          <div className="space-y-2">
            {(Object.values(currentInning.bowlerStats) as BowlerStats[])
              .sort((a, b) => {
                if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                return a.runs - b.runs;
              })
              .slice(0, 3)
              .map(b => (
                <div key={b.id} className="flex justify-between items-center text-sm">
                  <span>{b.name || b.id.replace('temp_', '').replace(/_/g, ' ')} {b.id === currentInning.currentBowlerId ? '*' : ''}</span>
                  <span className="font-bold">{b.wickets}-{b.runs} <span className="text-foreground-muted font-normal">({b.overs}.{b.balls})</span></span>
                </div>
            ))}
          </div>
        </div>
      </div>
      
      {match.status === 'LIVE' && recentBalls.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider mb-4">Recent Deliveries</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentBalls.map(b => b).reverse().map(b => {
              let label = b.runs.toString();
              let isBoundary = b.isBoundary;
              let isWicket = b.wickets && b.wickets.length > 0;
              let isExtra = b.extras && b.extras.length > 0;
              
              if (isWicket) label = 'W';
              else if (isExtra) {
                if (b.extras![0].type === 'WIDE') label = `${b.runs + 1}Wd`;
                if (b.extras![0].type === 'NO_BALL') label = `${b.runs + 1}Nb`;
                if (b.extras![0].type === 'LEG_BYE') label = `${b.runs}Lb`;
                if (b.extras![0].type === 'BYE') label = `${b.runs}B`;
              }

              let bg = 'bg-surface-hover text-foreground';
              if (isWicket) bg = 'bg-error text-error-foreground';
              else if (isBoundary) bg = 'bg-primary text-primary-foreground';
              
              return (
                <div key={b.eventId} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${bg}`}>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
