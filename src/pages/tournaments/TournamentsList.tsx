import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { Tournament } from '../../types';
import { Trophy, Plus, Calendar, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  
  const loadMore = async () => {
    if (!lastVisible || !hasMore) return;
    try {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      setTournaments(prev => [...prev, ...fetched]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      if (querySnapshot.docs.length < PAGE_SIZE) setHasMore(false);
    } catch (error) {
      console.error("Error fetching more tournaments:", error);
    }
  };

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tournament[];
        setTournaments(fetched);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        if (querySnapshot.docs.length < PAGE_SIZE) setHasMore(false);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Browse active and past cricket tournaments.
          </p>
        </div>
        <Link to="/tournaments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-border shadow-sm">
          <Trophy className="mx-auto h-12 w-12 text-foreground-muted opacity-50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No tournaments found</h3>
          <p className="text-foreground-muted">
            Get started by creating a new tournament.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="bg-surface rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all group block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-surface-hover border border-border flex items-center justify-center overflow-hidden">
                  {tournament.logoUrl ? (
                    <img loading="lazy" src={tournament.logoUrl} alt={tournament.name} className="w-full h-full object-contain" />
                  ) : (
                    <Trophy className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  tournament.status === 'ONGOING' ? 'bg-success/10 text-success' :
                  tournament.status === 'UPCOMING' ? 'bg-warning/10 text-warning-strong' :
                  'bg-surface-hover text-foreground-muted'
                }`}>
                  {tournament.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-1">
                {tournament.name}
              </h3>
              <p className="text-sm text-foreground-muted mb-4 line-clamp-2 min-h-[40px]">
                {tournament.description || "No description provided."}
              </p>
              
              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <div className="flex items-center text-xs text-foreground-muted font-medium">
                  <Calendar className="h-3.5 w-3.5 mr-2 opacity-70" />
                  {new Date(tournament.startDate).toLocaleDateString()}
                  {tournament.endDate ? ` - ${new Date(tournament.endDate).toLocaleDateString()}` : ''}
                </div>
                {tournament.venue && (
                  <div className="flex items-center text-xs text-foreground-muted font-medium line-clamp-1">
                    <MapPin className="h-3.5 w-3.5 mr-2 opacity-70" />
                    {tournament.venue}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button onClick={loadMore} variant="outline" className="w-full sm:w-auto">
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
