import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PlayerNameResolver } from '../../../components/PlayerNameResolver';
import { Match } from '../../../types';
import { InningsState, BatterStats, BowlerStats } from '../../../lib/scoring/types';

export function ScorecardTab({ match }: { match: Match }) {
  const [inningsList, setInningsList] = useState<InningsState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!match?.id) return;
    const q = query(collection(db, 'matches', match.id, 'innings'), orderBy('inningId', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: InningsState[] = [];
      snap.forEach(d => data.push(d.data() as InningsState));
      setInningsList(data);
      setLoading(false);
    });
    return () => unsub();
  }, [match?.id]);

  if (loading) return <div className="p-8 text-center text-foreground-muted animate-pulse">Loading scorecard...</div>;
  
  if (inningsList.length === 0) {
    return <div className="p-8 text-center text-foreground-muted">No innings started yet.</div>;
  }

  return (
    <div className="space-y-6">
      {inningsList.map((innings, idx) => (
        <div key={innings.inningId} className="border border-border rounded-lg overflow-hidden bg-surface">
          <div className="bg-surface-hover px-4 py-3 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-foreground">
              {innings.teamId === match.team1Id ? match.team1Name : match.team2Name} Innings
            </h3>
            <span className="font-extrabold text-lg">{innings.totalRuns}-{innings.totalWickets} ({innings.completedOvers}.{innings.currentOverBalls})</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted bg-surface-hover/50 uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-2">Batter</th>
                  <th className="px-4 py-2 text-right">R</th>
                  <th className="px-4 py-2 text-right">B</th>
                  <th className="px-4 py-2 text-right">4s</th>
                  <th className="px-4 py-2 text-right">6s</th>
                  <th className="px-4 py-2 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.values(innings.batterStats).map((batter: BatterStats) => (
                  <tr key={batter.id} className={batter.isOut ? 'opacity-60' : ''}>
                    <td className="px-4 py-2 font-medium">
                      <PlayerNameResolver playerId={batter.id} fallbackName={batter.name} />
                      {!batter.isOut && batter.id === innings.currentStrikerId && ' *'}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{batter.runs}</td>
                    <td className="px-4 py-2 text-right">{batter.ballsFaced}</td>
                    <td className="px-4 py-2 text-right">{batter.fours}</td>
                    <td className="px-4 py-2 text-right">{batter.sixes}</td>
                    <td className="px-4 py-2 text-right">
                      {batter.ballsFaced ? ((batter.runs / batter.ballsFaced) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-surface-hover/30 border-y border-border text-sm flex gap-4">
            <span className="font-bold">Extras: {innings.extras.total}</span>
            <span className="text-foreground-muted">(W {innings.extras.wides}, NB {innings.extras.noBalls}, B {innings.extras.byes}, LB {innings.extras.legByes})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted bg-surface-hover/50 uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-2">Bowler</th>
                  <th className="px-4 py-2 text-right">O</th>
                  <th className="px-4 py-2 text-right">M</th>
                  <th className="px-4 py-2 text-right">R</th>
                  <th className="px-4 py-2 text-right">W</th>
                  <th className="px-4 py-2 text-right">ECON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.values(innings.bowlerStats).map((bowler: BowlerStats) => (
                  <tr key={bowler.id}>
                    <td className="px-4 py-2 font-medium">
                      <PlayerNameResolver playerId={bowler.id} fallbackName={bowler.name} />
                      {bowler.id === innings.currentBowlerId && ' *'}
                    </td>
                    <td className="px-4 py-2 text-right">{bowler.overs}.{bowler.balls}</td>
                    <td className="px-4 py-2 text-right">{bowler.maidens}</td>
                    <td className="px-4 py-2 text-right">{bowler.runs}</td>
                    <td className="px-4 py-2 text-right font-bold">{bowler.wickets}</td>
                    <td className="px-4 py-2 text-right">
                      {bowler.overs || bowler.balls ? (bowler.runs / (bowler.overs + bowler.balls/6)).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-hover/30 border-t border-border grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border text-sm">
            <div className="p-4">
              <h4 className="font-bold mb-2 uppercase text-xs text-foreground-muted">Fall of Wickets</h4>
              {innings.fallOfWickets?.length > 0 ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {innings.fallOfWickets.map((fow, i) => (
                    <span key={i}>
                      <span className="font-bold">{fow.runs}-{fow.wicketNumber}</span> 
                      <span className="text-foreground-muted"> ({fow.playerOutId.replace('temp_', '').replace(/_/g, ' ')}, {fow.overs}.{fow.balls})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-foreground-muted">No wickets fallen</span>
              )}
            </div>

            <div className="p-4">
              <h4 className="font-bold mb-2 uppercase text-xs text-foreground-muted">Current Partnership</h4>
              {innings.currentPartnership && innings.currentPartnership.player1Id ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold">{innings.currentPartnership.runs}</span>
                  <span className="text-foreground-muted"> runs off </span>
                  <span className="font-bold">{innings.currentPartnership.balls}</span>
                  <span className="text-foreground-muted"> balls</span>
                </div>
              ) : (
                <span className="text-foreground-muted">No active partnership</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
