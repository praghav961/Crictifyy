import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { Match } from '../../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Card, CardContent } from '../../components/ui/Card';
import { Activity, Calendar } from 'lucide-react';
import { NetworkStatus } from '../../components/NetworkStatus';

export function MatchesList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIVE');
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('scheduledAt', 'asc'));
    const unsub = onSnapshot(q, (querySnapshot) => {
      setHasPendingWrites(querySnapshot.metadata.hasPendingWrites);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      setMatches(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching matches:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredMatches = matches.filter(m => m.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Matches</h1>
          <p className="mt-2 text-sm text-foreground-muted">Live scores, recent results, and upcoming fixtures.</p>
        </div>
        <NetworkStatus hasPendingWrites={hasPendingWrites} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
          <TabsTrigger value="LIVE" isActive={activeTab === 'LIVE'}>Live</TabsTrigger>
          <TabsTrigger value="UPCOMING" isActive={activeTab === 'UPCOMING'}>Upcoming</TabsTrigger>
          <TabsTrigger value="COMPLETED" isActive={activeTab === 'COMPLETED'}>Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} activeValue={activeTab}>
          {loading ? (
            <div className="text-center p-8 animate-pulse text-foreground-muted">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center p-8 text-foreground-muted bg-surface rounded-lg border border-border">
              No matches found in this category.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMatches.map(match => (
                <Link key={match.id} to={`/matches/${match.id}`} className="block group">
                  <Card className="hover:border-primary/50 transition-colors bg-surface">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex justify-between items-center mb-3 text-xs font-bold text-foreground-muted">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(match.scheduledAt).toLocaleDateString()}
                        </span>
                        {match.status === 'LIVE' && (
                          <span className="flex items-center gap-1.5 text-error uppercase tracking-wider">
                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">{match.team1Name}</span>
                          {match.team1Score && <span className="font-extrabold font-mono text-sm sm:text-base">{match.team1Score}</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">{match.team2Name}</span>
                          {match.team2Score && <span className="font-extrabold font-mono text-sm sm:text-base">{match.team2Score}</span>}
                        </div>
                      </div>
                      
                      {(match.result || match.status === 'UPCOMING') && (
                        <div className="mt-4 pt-3 border-t border-border text-xs font-bold text-primary text-center">
                          {match.result || (match.tossWinnerId ? `Toss: ${match.tossDecision}` : 'Match yet to begin')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
