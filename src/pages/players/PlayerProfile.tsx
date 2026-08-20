import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Player } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ArrowLeft, User, Phone, Calendar, PenSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ShareButton } from '../../components/ui/ShareButton';

export function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const { profile, hasRole } = useAuth();
  
  const canManage = hasRole('SUPER_ADMIN') || hasRole('TOURNAMENT_ADMIN') || hasRole('TEAM_MANAGER') || profile?.canHostTournament;

  useEffect(() => {
    async function fetchPlayer() {
      if (!id) return;
      try {
        const docRef = doc(db, 'players', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPlayer({ id: docSnap.id, ...docSnap.data() } as Player);
        }
      } catch (error) {
        console.error("Error fetching player:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground">Player not found</h2>
        <Link to="/players" className="text-primary hover:underline mt-4 inline-block">Return to Players</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Link to="/players" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="text-sm font-medium text-primary">Player Profile</span>
        </div>
        {canManage && (
          <Link to={`/players/${player.id}/edit`} className="inline-flex items-center text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
            <PenSquare className="h-4 w-4 mr-2" /> Edit Profile
          </Link>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 bg-primary/10 relative">
          {player.jerseyNumber && (
            <div className="absolute right-6 top-6 text-4xl font-black text-primary/20">{player.jerseyNumber}</div>
          )}
        </div>
        <CardContent className="px-6 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-surface border-4 border-surface flex items-center justify-center overflow-hidden shadow-sm">
               {player.avatarUrl ? (
                  <img loading="lazy" src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-foreground-muted opacity-30" />
                )}
            </div>
            <div className="text-center sm:text-left mb-2 sm:mb-4">
              <h1 className="text-3xl font-bold text-foreground flex items-center justify-center sm:justify-start gap-3">
                {player.name}
                <ShareButton title={player.name} text={`Check out ${player.name}'s profile on CRICTIFY!`} />
              </h1>
              <p className="text-sm font-medium text-foreground-muted uppercase tracking-wider">{player.role.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 -mb-2">
          <TabsList className="w-max sm:w-full sm:grid sm:grid-cols-3 mb-6 shrink-0">
            <TabsTrigger value="OVERVIEW" isActive={activeTab === 'OVERVIEW'}>Overview</TabsTrigger>
            <TabsTrigger value="STATS" isActive={activeTab === 'STATS'}>Career Stats</TabsTrigger>
            <TabsTrigger value="MATCHES" isActive={activeTab === 'MATCHES'}>Recent Matches</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="OVERVIEW" activeValue={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Playing Role</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-foreground-muted uppercase font-semibold tracking-wider mb-1">Role</p>
                      <p className="font-medium text-foreground">{player.role.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted uppercase font-semibold tracking-wider mb-1">Batting Style</p>
                      <p className="font-medium text-foreground">{player.battingStyle || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted uppercase font-semibold tracking-wider mb-1">Bowling Style</p>
                      <p className="font-medium text-foreground">{player.bowlingStyle || 'Unknown'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {player.bio && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-3">Biography</h3>
                    <p className="text-foreground-muted leading-relaxed whitespace-pre-wrap">{player.bio}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Personal Info</h3>
                  <div className="space-y-4">
                    {player.dateOfBirth && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-foreground-muted" />
                        <div>
                          <p className="text-xs text-foreground-muted">Date of Birth</p>
                          <p className="text-sm font-medium text-foreground">{new Date(player.dateOfBirth).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    {canManage && player.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-foreground-muted" />
                        <div>
                          <p className="text-xs text-foreground-muted">Phone (Private)</p>
                          <p className="text-sm font-medium text-foreground">{player.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="STATS" activeValue={activeTab}>
          <Card>
            <CardContent className="p-8 text-center text-foreground-muted">
              Detailed batting, bowling, and fielding stats will be displayed here.
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="MATCHES" activeValue={activeTab}>
          <Card>
            <CardContent className="p-8 text-center text-foreground-muted">
              Recent match performances will be listed here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
