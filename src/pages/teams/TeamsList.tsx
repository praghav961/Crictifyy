import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { Team } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Shield, Plus, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function TeamsList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, hasRole } = useAuth();
  
  const canManage = hasRole('SUPER_ADMIN') || hasRole('TOURNAMENT_ADMIN') || hasRole('TEAM_MANAGER') || profile?.canHostTournament;

  useEffect(() => {
    async function fetchTeams() {
      try {
        const q = query(collection(db, 'teams'));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Team[];
        
        fetched.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(fetched);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teams</h1>
          <p className="mt-2 text-sm text-foreground-muted">Browse participating cricket teams.</p>
        </div>
        {canManage && (
          <Link
            to="/teams/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary-hover transition-colors shrink-0"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Team
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
        <Input 
          placeholder="Search teams by name or short name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-border">
          <Shield className="mx-auto h-12 w-12 text-foreground-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No teams found</h3>
          <p className="text-foreground-muted">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTeams.map(team => (
            <Link key={team.id} to={`/teams/${team.id}`} className="block group">
              <Card className="h-full group-hover:border-primary/50 transition-colors text-center overflow-hidden">
                <div className="aspect-square bg-surface-hover flex items-center justify-center p-4">
                  {team.logoUrl ? (
                    <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                  ) : (
                    <Shield className="h-12 w-12 text-foreground-muted opacity-30" />
                  )}
                </div>
                <CardContent className="p-4 border-t border-border">
                  <h3 className="font-bold text-foreground truncate" title={team.name}>{team.name}</h3>
                  <p className="text-xs text-foreground-muted font-medium mt-1">{team.shortName}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
