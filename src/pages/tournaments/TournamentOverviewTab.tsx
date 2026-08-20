import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match, TournamentTeam, TournamentPlayer, Sponsor } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Trophy, Activity, CalendarDays, Users, Shield, Target } from 'lucide-react';
import { useTournamentStats } from '../../hooks/useTournamentStats';

interface Props {
  tournament: Tournament;
}

export function TournamentOverviewTab({ tournament }: Props) {
  const { batting, bowling, teams: statsTeams, loading: statsLoading } = useTournamentStats(tournament.id);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamCount, setTeamCount] = useState(0);
    const [playerCount, setPlayerCount] = useState(0);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mSnap = await getDocs(query(collection(db, 'matches')));
        setMatches(mSnap.docs.map(d => d.data() as Match).filter(m => m.tournamentId === tournament.id));

        const tSnap = await getDocs(collection(db, `tournaments/${tournament.id}/teams`));
        setTeamCount(tSnap.size);

        const pSnap = await getDocs(collection(db, `tournaments/${tournament.id}/players`));
        setPlayerCount(pSnap.size);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournament.id]);

  if (loading || statsLoading) return <div className="p-4 text-center">Loading overview...</div>;

  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING' || !m.status).length;
  const liveMatches = matches.filter(m => m.status === 'LIVE').length;
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length;

  const totalRuns = batting.reduce((acc, b) => acc + b.runs, 0);
  const totalWickets = bowling.reduce((acc, b) => acc + b.wickets, 0);
  const totalFours = batting.reduce((acc, b) => acc + b.fours, 0);
  const totalSixes = batting.reduce((acc, b) => acc + b.sixes, 0);

  const sortedBatters = [...batting].sort((a, b) => b.runs - a.runs);
  const topBatter = sortedBatters.length > 0 ? sortedBatters[0] : null;

  const sortedBowlers = [...bowling].sort((a, b) => b.wickets - a.wickets);
  const topBowler = sortedBowlers.length > 0 ? sortedBowlers[0] : null;

  const sortedTeams = [...statsTeams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
  const currentLeader = sortedTeams.length > 0 ? sortedTeams[0] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About Tournament</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {tournament.description && (
            <div>
              <p className="text-sm text-foreground-muted whitespace-pre-wrap leading-relaxed">{tournament.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-hover/50 rounded-xl border border-border/50">
            <div>
              <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Format</span>
              <span className="text-sm font-bold text-foreground">{tournament.format || 'Not specified'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Venue</span>
              <span className="text-sm font-bold text-foreground">{tournament.venue || 'Not specified'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Organizer</span>
              <span className="text-sm font-bold text-foreground">{tournament.organizer || 'Not specified'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Overs</span>
              <span className="text-sm font-bold text-foreground">{tournament.overs ? `${tournament.overs} Overs` : 'Not specified'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

            {sponsors.length > 0 && (
        <Card className="bg-surface border-border overflow-hidden">
           <div className="bg-primary/5 px-4 py-2 border-b border-border/50 text-xs font-bold text-primary uppercase tracking-widest flex items-center justify-center">
             Tournament Sponsors
           </div>
           <CardContent className="p-4 flex gap-6 overflow-x-auto items-center justify-center">
             {sponsors.map(s => (
               <div key={s.id} className="flex flex-col items-center">
                 {s.logoUrl ? (
                   <img src={s.logoUrl} alt={s.name} className="h-16 w-auto object-contain rounded" />
                 ) : (
                   <div className="h-12 px-4 bg-surface-hover rounded flex items-center justify-center border border-border"><span className="font-bold">{s.name}</span></div>
                 )}
               </div>
             ))}
           </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
           <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Shield className="w-6 h-6 text-primary mb-2" />
              <span className="text-2xl font-black">{teamCount}</span>
              <span className="text-xs font-bold text-foreground-muted uppercase">Teams</span>
           </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
           <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Users className="w-6 h-6 text-success mb-2" />
              <span className="text-2xl font-black">{playerCount}</span>
              <span className="text-xs font-bold text-foreground-muted uppercase">Players</span>
           </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
           <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <CalendarDays className="w-6 h-6 text-warning mb-2" />
              <span className="text-2xl font-black">{matches.length}</span>
              <span className="text-xs font-bold text-foreground-muted uppercase">Total Matches</span>
           </CardContent>
        </Card>
        <Card className="bg-error/5 border-error/20">
           <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Activity className="w-6 h-6 text-error mb-2" />
              <div className="flex gap-2">
                 <div className="flex flex-col items-center"><span className="font-bold text-lg">{upcomingMatches}</span><span className="text-[10px] uppercase">UP</span></div>
                 <div className="flex flex-col items-center"><span className="font-bold text-lg">{liveMatches}</span><span className="text-[10px] uppercase">LIV</span></div>
                 <div className="flex flex-col items-center"><span className="font-bold text-lg">{completedMatches}</span><span className="text-[10px] uppercase">COM</span></div>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card><CardContent className="p-4 text-center"><span className="block text-2xl font-black text-primary">{totalRuns}</span><span className="text-xs text-foreground-muted font-bold uppercase">Runs Scored</span></CardContent></Card>
         <Card><CardContent className="p-4 text-center"><span className="block text-2xl font-black text-primary">{totalWickets}</span><span className="text-xs text-foreground-muted font-bold uppercase">Wickets</span></CardContent></Card>
         <Card><CardContent className="p-4 text-center"><span className="block text-2xl font-black text-primary">{totalFours}</span><span className="text-xs text-foreground-muted font-bold uppercase">Fours</span></CardContent></Card>
         <Card><CardContent className="p-4 text-center"><span className="block text-2xl font-black text-primary">{totalSixes}</span><span className="text-xs text-foreground-muted font-bold uppercase">Sixes</span></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col">
            <span className="text-xs font-bold text-foreground-muted uppercase mb-2">Current Leader</span>
            <span className="text-lg font-black">{currentLeader ? currentLeader.name : 'N/A'}</span>
            <span className="text-sm text-primary">{currentLeader ? `${currentLeader.points} PTS (NRR: ${currentLeader.nrr.toFixed(3)})` : ''}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col">
            <span className="text-xs font-bold text-foreground-muted uppercase mb-2">Top Batter</span>
            <span className="text-lg font-black">{topBatter ? topBatter.name : 'N/A'}</span>
            <span className="text-sm text-primary">{topBatter ? `${topBatter.runs} Runs (SR: ${topBatter.strikeRate.toFixed(1)})` : ''}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col">
            <span className="text-xs font-bold text-foreground-muted uppercase mb-2">Top Bowler</span>
            <span className="text-lg font-black">{topBowler ? topBowler.name : 'N/A'}</span>
            <span className="text-sm text-primary">{topBowler ? `${topBowler.wickets} Wkts (Econ: ${topBowler.economy.toFixed(2)})` : ''}</span>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
