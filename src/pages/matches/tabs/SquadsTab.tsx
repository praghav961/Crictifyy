import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match, TournamentPlayer } from '../../../types';
import { Card, CardContent } from '../../../components/ui/Card';

export function SquadsTab({ match }: { match: Match }) {
  const [team1Squad, setTeam1Squad] = useState<TournamentPlayer[]>([]);
  const [team2Squad, setTeam2Squad] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!match?.tournamentId || !match?.team1Id || !match?.team2Id) {
      setLoading(false);
      return;
    }
    
    const fetchSquads = async () => {
      try {
        const q1 = query(collection(db, 'tournaments', match.tournamentId!, 'teams', match.team1Id, 'players'));
        const q2 = query(collection(db, 'tournaments', match.tournamentId!, 'teams', match.team2Id, 'players'));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const t1: TournamentPlayer[] = [];
        const t2: TournamentPlayer[] = [];
        
        snap1.forEach(d => t1.push(d.data() as TournamentPlayer));
        snap2.forEach(d => t2.push(d.data() as TournamentPlayer));
        
        setTeam1Squad(t1);
        setTeam2Squad(t2);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSquads();
  }, [match?.tournamentId, match?.team1Id, match?.team2Id]);

  if (loading) return <div className="p-8 text-center text-foreground-muted animate-pulse">Loading squads...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-0">
          <div className="bg-surface-hover px-4 py-3 border-b border-border">
            <h3 className="font-bold text-foreground text-center">{match.team1Name} Playing XI</h3>
          </div>
          <div className="divide-y divide-border">
            {team1Squad.length === 0 ? (
              <div className="p-4 text-center text-foreground-muted text-sm">No players found</div>
            ) : (
              team1Squad.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-foreground-muted bg-surface-hover px-2 py-1 rounded">{p.role}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <div className="bg-surface-hover px-4 py-3 border-b border-border">
            <h3 className="font-bold text-foreground text-center">{match.team2Name} Playing XI</h3>
          </div>
          <div className="divide-y divide-border">
            {team2Squad.length === 0 ? (
              <div className="p-4 text-center text-foreground-muted text-sm">No players found</div>
            ) : (
              team2Squad.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-foreground-muted bg-surface-hover px-2 py-1 rounded">{p.role}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
