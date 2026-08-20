import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { Player } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { User, Plus, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, hasRole } = useAuth();
  
  const canManage = hasRole('SUPER_ADMIN') || hasRole('TOURNAMENT_ADMIN') || hasRole('TEAM_MANAGER') || profile?.canHostTournament;

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const q = query(collection(db, 'players'));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        
        fetched.sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(fetched);
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Players</h1>
          <p className="mt-2 text-sm text-foreground-muted">Discover player profiles and statistics.</p>
        </div>
        {canManage && (
          <Link
            to="/players/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary-hover transition-colors shrink-0"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Player
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
        <Input 
          placeholder="Search players by name or role..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-border">
          <User className="mx-auto h-12 w-12 text-foreground-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No players found</h3>
          <p className="text-foreground-muted">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPlayers.map(player => (
            <Link key={player.id} to={`/players/${player.id}`} className="block group">
              <Card className="h-full group-hover:border-primary/50 transition-colors text-center overflow-hidden">
                <div className="aspect-square bg-surface-hover flex items-center justify-center p-4">
                  {player.avatarUrl ? (
                    <img loading="lazy" src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover rounded-full shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary opacity-80" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 border-t border-border">
                  <h3 className="font-bold text-foreground truncate" title={player.name}>{player.name}</h3>
                  <p className="text-xs text-foreground-muted font-medium mt-1">{player.role.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
