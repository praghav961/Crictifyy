import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, Star, Medal, Award, Crown } from 'lucide-react';
import { useTournamentStats } from '../../hooks/useTournamentStats';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentCompletionTab({ tournament, isHostOrAdmin }: Props) {
  const { loading, batting, bowling, fielding, teams } = useTournamentStats(tournament.id);
  const [finalizing, setFinalizing] = useState(false);
  const [championId, setChampionId] = useState(tournament.championId || '');
  const [runnerUpId, setRunnerUpId] = useState(tournament.runnerUpId || '');

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  const sortedBatters = [...batting].sort((a, b) => b.runs - a.runs);
  const topBatter = sortedBatters.length > 0 ? sortedBatters[0] : null;

  const sortedBowlers = [...bowling].sort((a, b) => b.wickets - a.wickets);
  const topBowler = sortedBowlers.length > 0 ? sortedBowlers[0] : null;

  const sortedFielders = [...fielding].sort((a, b) => b.dismissals - a.dismissals);
  const topFielder = sortedFielders.length > 0 ? sortedFielders[0] : null;

  const handleFinalize = async () => {
    if (!championId) {
      alert("Please select the Champion.");
      return;
    }
    if (!window.confirm("Are you sure you want to finalize this tournament? This will mark it as COMPLETED and save the awards.")) return;
    
    setFinalizing(true);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        status: 'COMPLETED',
        isFinalized: true,
        championId,
        runnerUpId,
        awards: {
          bestBatter: topBatter?.name || '',
          bestBowler: topBowler?.name || '',
          bestFielder: topFielder?.name || ''
        }
      });
      alert("Tournament Finalized Successfully!");
      window.location.reload();
    } catch(err) {
      console.error(err);
      alert("Failed to finalize tournament");
    } finally {
      setFinalizing(false);
    }
  };

  const champTeam = teams.find(t => t.id === tournament.championId);
  const runnerTeam = teams.find(t => t.id === tournament.runnerUpId);

  return (
    <div className="space-y-6">
      {tournament.isFinalized ? (
        <Card className="border-warning/50 bg-warning/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-48 h-48" />
          </div>
          <CardHeader>
            <CardTitle className="text-3xl font-black text-warning flex items-center gap-2">
              <Crown className="w-8 h-8" /> TOURNAMENT CHAMPION
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 relative z-10">
            <div>
              <h2 className="text-4xl font-black text-foreground">{champTeam?.name || 'Unknown Team'}</h2>
              {runnerTeam && <p className="text-lg text-foreground-muted mt-2">Runner Up: {runnerTeam.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center text-center">
                <Star className="w-8 h-8 text-orange-500 mb-2" />
                <span className="text-xs font-bold text-foreground-muted uppercase">Orange Cap (Most Runs)</span>
                <span className="font-black text-xl">{tournament.awards?.bestBatter || 'N/A'}</span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center text-center">
                <Medal className="w-8 h-8 text-purple-500 mb-2" />
                <span className="text-xs font-bold text-foreground-muted uppercase">Purple Cap (Most Wickets)</span>
                <span className="font-black text-xl">{tournament.awards?.bestBowler || 'N/A'}</span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center text-center">
                <Award className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-xs font-bold text-foreground-muted uppercase">Best Fielder</span>
                <span className="font-black text-xl">{tournament.awards?.bestFielder || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Finalization & Awards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-foreground-muted">Review the calculated awards and select the Champion to finalize the tournament.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-1"><Trophy className="w-4 h-4 text-warning" /> Champion</label>
                <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface" value={championId} onChange={e => setChampionId(e.target.value)} disabled={!isHostOrAdmin}>
                  <option value="">Select Champion...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-1"><Medal className="w-4 h-4 text-foreground-muted" /> Runner Up</label>
                <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface" value={runnerUpId} onChange={e => setRunnerUpId(e.target.value)} disabled={!isHostOrAdmin}>
                  <option value="">Select Runner Up...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-surface-hover mt-6">
               <h3 className="font-bold mb-4">Calculated Awards (Auto-generated from stats)</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center bg-surface p-2 rounded border border-border">
                   <span className="text-sm font-bold text-foreground-muted">Best Batter</span>
                   <span className="font-bold">{topBatter ? `${topBatter.name} (${topBatter.runs} runs)` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center bg-surface p-2 rounded border border-border">
                   <span className="text-sm font-bold text-foreground-muted">Best Bowler</span>
                   <span className="font-bold">{topBowler ? `${topBowler.name} (${topBowler.wickets} wkts)` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center bg-surface p-2 rounded border border-border">
                   <span className="text-sm font-bold text-foreground-muted">Best Fielder</span>
                   <span className="font-bold">{topFielder ? `${topFielder.name} (${topFielder.dismissals} dismissals)` : 'N/A'}</span>
                 </div>
               </div>
            </div>

            {isHostOrAdmin && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleFinalize} disabled={finalizing || !championId} className="bg-warning text-warning-foreground hover:bg-warning/90">
                  <Trophy className="w-4 h-4 mr-2" /> Finalize Tournament
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
