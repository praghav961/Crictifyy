import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Team, Player } from '../../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ArrowLeft, Shield, MapPin, PenSquare, Trash2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ShareButton } from '../../components/ui/ShareButton';

export function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SQUAD');
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([]);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const { profile, hasRole } = useAuth();
  
  const canManage = hasRole('SUPER_ADMIN') || hasRole('TOURNAMENT_ADMIN') || hasRole('TEAM_MANAGER') || profile?.canHostTournament;

  useEffect(() => {
    async function fetchTeam() {
      if (!id) return;
      try {
        const docRef = doc(db, 'teams', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
          setTeam(teamData);
          
          // Fetch squad players
          const playerIds = teamData.squad || teamData.players || [];
          if (playerIds.length > 0) {
            setLoadingSquad(true);
            try {
              // chunk array if > 10, but assuming typical squad is < 30, we'll do standard batches
              const chunks = [];
              for (let i = 0; i < playerIds.length; i += 10) {
                 chunks.push(playerIds.slice(i, i + 10));
              }
              let allPlayers: Player[] = [];
              for (const chunk of chunks) {
                 const q = query(collection(db, 'players'), where('__name__', 'in', chunk));
                 const snap = await getDocs(q);
                 snap.forEach(d => allPlayers.push({ id: d.id, ...d.data() } as Player));
              }
              setSquadPlayers(allPlayers);
            } catch (e) {
              console.error(e);
            } finally {
              setLoadingSquad(false);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching team:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, [id]);

  
  const handleRemovePlayer = async (playerId: string) => {
    if (!id || !team) return;
    if (!window.confirm('Are you sure you want to remove this player from the team roster?')) return;
    try {
      const teamRef = doc(db, 'teams', id);
      await updateDoc(teamRef, {
        squad: arrayRemove(playerId),
        players: arrayRemove(playerId) // fallback update
      });
      // trigger re-render by removing from local state
      setSquadPlayers(prev => prev.filter(p => p.id !== playerId));
      setTeam({
         ...team,
         squad: (team.squad || []).filter(id => id !== playerId),
         players: (team.players || []).filter(id => id !== playerId)
      } as any);
    } catch (err: any) {
      console.error(err);
      alert('Failed to remove player: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground">Team not found</h2>
        <Link to="/teams" className="text-primary hover:underline mt-4 inline-block">Return to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Link to="/teams" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="text-sm font-medium text-primary">Team Profile</span>
        </div>
        {canManage && (
          <Link to={`/teams/${team.id}/edit`} className="inline-flex items-center text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
            <PenSquare className="h-4 w-4 mr-2" /> Edit Team
          </Link>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 relative" style={{ backgroundColor: team.teamColor || 'var(--color-primary)' }}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        </div>
        <CardContent className="px-6 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-surface border-4 border-surface flex items-center justify-center overflow-hidden shadow-sm shrink-0">
               {team.logoUrl ? (
                  <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Shield className="h-12 w-12 text-foreground-muted opacity-30" />
                )}
            </div>
            <div className="text-center sm:text-left mb-2 sm:mb-4 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
                <ShareButton title={team.name} text={`Check out ${team.name} on CRICTIFY!`} />
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-1">
                <p className="text-sm font-bold text-primary uppercase tracking-wider">{team.shortName}</p>
                {team.city && (
                  <p className="text-sm font-medium text-foreground-muted flex items-center">
                    <MapPin className="h-4 w-4 mr-1" /> {team.city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 -mb-2">
          <TabsList className="w-max sm:w-full sm:grid sm:grid-cols-4 mb-6 shrink-0">
            <TabsTrigger value="SQUAD" isActive={activeTab === 'SQUAD'}>Current Squad</TabsTrigger>
            <TabsTrigger value="INFO" isActive={activeTab === 'INFO'}>Team Info</TabsTrigger>
            <TabsTrigger value="MATCHES" isActive={activeTab === 'MATCHES'}>Recent Matches</TabsTrigger>
            <TabsTrigger value="STATS" isActive={activeTab === 'STATS'}>Statistics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="SQUAD" activeValue={activeTab}>
          <Card>
            <CardContent className="p-6">
              {loadingSquad ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : squadPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {squadPlayers.map(player => (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface relative">
                      {canManage && (
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePlayer(player.id); }}
                          className="absolute top-2 right-2 p-1 z-10 cursor-pointer text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {player.avatarUrl ? (
                        <img loading="lazy" src={player.avatarUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                          {player.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm font-bold text-foreground truncate">{player.name}</p>
                        <p className="text-xs text-foreground-muted capitalize">{player.role ? player.role.replace('_', ' ') : 'Player'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
                  No players added to the squad yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="INFO" activeValue={activeTab}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Management</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider font-semibold mb-1">Head Coach</p>
                    <p className="font-medium text-foreground">{team.coach || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider font-semibold mb-1">Team Manager</p>
                    <p className="font-medium text-foreground">{team.manager || 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Leadership</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider font-semibold mb-1">Captain</p>
                    <p className="font-medium text-foreground">{team.captainId ? 'Loaded from squad' : 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider font-semibold mb-1">Vice Captain</p>
                    <p className="font-medium text-foreground">{team.viceCaptainId ? 'Loaded from squad' : 'Not assigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="MATCHES" activeValue={activeTab}>
          <Card>
            <CardContent className="p-8 text-center text-foreground-muted">
              Match history will be listed here.
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="STATS" activeValue={activeTab}>
          <Card>
            <CardContent className="p-8 text-center text-foreground-muted">
              Team statistics will be displayed here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
