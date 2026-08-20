import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Sponsor } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Calendar, Settings, ArrowLeft, Users, Shield, Plus, ExternalLink, MapPin, Edit, Trash2, Power, PowerOff, ArrowUp, ArrowDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TournamentTeamsTab } from './TournamentTeamsTab';
import { TournamentMatchesTab } from './TournamentMatchesTab';
import { TournamentGroupsTab } from './TournamentGroupsTab';
import { TournamentPlayersTab } from './TournamentPlayersTab';
import { TournamentStatsTab } from './TournamentStatsTab';
import { PointsTableTab } from './PointsTableTab';
import { TournamentPlayoffsTab } from './TournamentPlayoffsTab';
import { TournamentCompletionTab } from './TournamentCompletionTab';
import { TournamentOverviewTab } from './TournamentOverviewTab';
import { syncTournamentEntities } from '../../lib/tournamentSync';
import { ShareButton } from '../../components/ui/ShareButton';
import { logAudit } from '../../lib/audit';

export function TournamentDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ABOUT');
  const { user, profile, hasRole } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const docRef = doc(db, 'tournaments', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
        }

        const sponsorsQ = query(collection(db, `tournaments/${id}/sponsors`), orderBy('displayOrder', 'asc'));
        const sponsorsSnap = await getDocs(sponsorsQ);
        setSponsors(sponsorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sponsor)));
        
      } catch (error) {
        console.error("Error fetching tournament:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground">Tournament not found</h2>
        <Link to="/tournaments" className="text-primary hover:underline mt-4 inline-block">Return to Tournaments</Link>
      </div>
    );
  }

  
  const handleSyncEntities = async () => {
    if (!tournament) return;
    if (!window.confirm('This will verify and repair internal references between Groups, Teams, Players, and Matches. Proceed?')) return;
    
    try {
      const report = await syncTournamentEntities(tournament.id);
      alert(`Sync Complete!\nFixed Groups: ${report.fixedGroups}\nFixed Teams: ${report.fixedTeams}\nFixed Players: ${report.fixedPlayers}\nFixed Matches: ${report.fixedMatches}\n\nLogs:\n${report.logs.join('\n')}`);
    } catch (e: any) {
      alert('Error during sync: ' + e.message);
    }
  };

  const isHostOrAdmin = user?.uid === tournament.hostId || hasRole('SUPER_ADMIN') ;

  const handleToggleSponsorActive = async (sponsorId: string, currentActive: boolean) => {
    if (!id || !isHostOrAdmin) return;
    try {
      await updateDoc(doc(db, `tournaments/${id}/sponsors`, sponsorId), { active: !currentActive });
      logAudit(user?.uid || '', 'TOURNAMENT_MODIFICATION', { tournamentId: id, metadata: { action: 'SPONSOR_TOGGLED', sponsorId, active: !currentActive } });
      setSponsors(prev => prev.map(s => s.id === sponsorId ? { ...s, active: !currentActive } : s));
    } catch (err) {
      console.error('Failed to toggle active state', err);
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!id || !isHostOrAdmin) return;
    if (!window.confirm('Are you sure you want to delete this sponsor?')) return;
    try {
      await deleteDoc(doc(db, `tournaments/${id}/sponsors`, sponsorId));
      logAudit(user?.uid || '', 'SPONSOR_DELETED', { tournamentId: id, metadata: { sponsorId } });
      setSponsors(prev => prev.filter(s => s.id !== sponsorId));
    } catch (err) {
      console.error('Failed to delete sponsor', err);
    }
  };

  const handleReorderSponsor = async (index: number, direction: 'up' | 'down') => {
    if (!id || !isHostOrAdmin) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sponsors.length) return;

    const newSponsors = [...sponsors];
    const temp = newSponsors[index];
    newSponsors[index] = newSponsors[newIndex];
    newSponsors[newIndex] = temp;

    // Update state optimistically
    setSponsors(newSponsors);

    try {
      // Update both documents in Firestore with their new indices as displayOrder (simplified ordering)
      await Promise.all([
        updateDoc(doc(db, `tournaments/${id}/sponsors`, newSponsors[index].id), { displayOrder: index }),
        updateDoc(doc(db, `tournaments/${id}/sponsors`, newSponsors[newIndex].id), { displayOrder: newIndex })
      ]);
    } catch (err) {
      console.error('Failed to reorder', err);
      // Revert on error
      setSponsors(sponsors);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-surface-hover border border-border flex items-center justify-center overflow-hidden shrink-0">
              {tournament.logoUrl ? (
                <img loading="lazy" src={tournament.logoUrl} alt={tournament.name} className="w-full h-full object-contain" />
              ) : (
                <Trophy className="h-12 w-12 text-primary" />
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <ShareButton title={tournament.name} text={`Follow ${tournament.name} live on CRICTIFY!`} />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{tournament.name}</h1>
                <span className={`inline-flex self-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  tournament.status === 'ONGOING' ? 'bg-success/10 text-success' :
                  tournament.status === 'UPCOMING' ? 'bg-warning/10 text-warning-strong' :
                  'bg-surface-hover text-foreground-muted'
                }`}>
                  {tournament.status}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-foreground-muted">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(tournament.startDate).toLocaleDateString()}
                  {tournament.endDate ? ` - ${new Date(tournament.endDate).toLocaleDateString()}` : ''}
                </div>
                {tournament.venue && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tournament.venue}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-4 -mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="w-max min-w-full flex justify-start mb-0 rounded-none bg-transparent h-auto p-1 space-x-2 bg-surface border border-border rounded-xl">
              <TabsTrigger value="ABOUT" isActive={activeTab === 'ABOUT'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">OVERVIEW</TabsTrigger>
              <TabsTrigger value="MATCHES" isActive={activeTab === 'MATCHES'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">MATCHES</TabsTrigger>
              <TabsTrigger value="POINTS_TABLE" isActive={activeTab === 'POINTS_TABLE'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">STANDINGS</TabsTrigger>
              <TabsTrigger value="TEAMS" isActive={activeTab === 'TEAMS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">TEAMS</TabsTrigger>
              <TabsTrigger value="GROUPS" isActive={activeTab === 'GROUPS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">GROUPS</TabsTrigger>
              <TabsTrigger value="PLAYERS" isActive={activeTab === 'PLAYERS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">PLAYERS</TabsTrigger>
              <TabsTrigger value="PLAYOFFS" isActive={activeTab === 'PLAYOFFS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">PLAYOFFS</TabsTrigger>
              <TabsTrigger value="STATS" isActive={activeTab === 'STATS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">STATS</TabsTrigger>
              <TabsTrigger value="AWARDS" isActive={activeTab === 'AWARDS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">AWARDS</TabsTrigger>
              <TabsTrigger value="SPONSORS" isActive={activeTab === 'SPONSORS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">SPONSORS</TabsTrigger>
              {isHostOrAdmin && (
                <TabsTrigger value="SETTINGS" isActive={activeTab === 'SETTINGS'} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2 font-semibold">SETTINGS</TabsTrigger>
              )}
            </TabsList>
          </div>
          <div className="mt-6">
            <TabsContent value="ABOUT" activeValue={activeTab}>
              <TournamentOverviewTab tournament={tournament} />
            </TabsContent>

            <TabsContent value="MATCHES" activeValue={activeTab}>
              <TournamentMatchesTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
            </TabsContent>

            
            <TabsContent value="GROUPS" activeValue={activeTab}>
              <TournamentGroupsTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
            </TabsContent>
            <TabsContent value="TEAMS" activeValue={activeTab}>
              <TournamentTeamsTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
            </TabsContent>

            <TabsContent value="PLAYERS" activeValue={activeTab}>
              <TournamentPlayersTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
            </TabsContent>

            <TabsContent value="POINTS_TABLE" activeValue={activeTab}>
              <PointsTableTab tournamentId={tournament.id} />
            </TabsContent>

            <TabsContent value="STATS" activeValue={activeTab}>
              <TournamentStatsTab tournamentId={tournament.id} />
            </TabsContent>
          <TabsContent value="PLAYOFFS" activeValue={activeTab}>
            <TournamentPlayoffsTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
          </TabsContent>
          <TabsContent value="AWARDS" activeValue={activeTab}>
            <TournamentCompletionTab tournament={tournament} isHostOrAdmin={isHostOrAdmin} />
          </TabsContent>

            <TabsContent value="SPONSORS" activeValue={activeTab}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tournament Sponsors</CardTitle>
                  {isHostOrAdmin && (
                    <Link to={`/tournaments/${id}/sponsors/new`}>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Sponsor
                      </Button>
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  {sponsors.length === 0 ? (
                    <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
                      No sponsors added yet.
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Title Sponsors */}
                      {sponsors.filter(s => s.sponsorType === 'Title Sponsor' && (s.active || isHostOrAdmin)).length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-foreground-muted uppercase tracking-wider mb-4 border-b border-border pb-2">Title Sponsor</h3>
                          <div className="grid grid-cols-1 gap-6">
                            {sponsors.filter(s => s.sponsorType === 'Title Sponsor' && (s.active || isHostOrAdmin)).map((sponsor, index, arr) => (
                              <div key={sponsor.id} className={`flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border-2 ${sponsor.active ? 'border-primary/20 bg-primary/5' : 'border-dashed border-border opacity-60 bg-surface'}`}>
                                {sponsor.logoUrl ? (
                                  <img loading="lazy" src={sponsor.logoUrl} alt={sponsor.name} className="w-48 h-32 rounded-lg object-contain bg-white p-2 shadow-sm" />
                                ) : (
                                  <div className="w-48 h-32 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-foreground-muted text-sm text-center p-2">
                                    No Logo
                                  </div>
                                )}
                                <div className="flex-1 text-center sm:text-left">
                                  <p className="text-2xl font-extrabold text-foreground mb-1">
                                    {sponsor.name}
                                  </p>
                                  <p className="text-sm text-primary font-bold uppercase tracking-wider mb-3">
                                    {sponsor.sponsorType}
                                  </p>
                                  {sponsor.description && (
                                    <p className="text-sm text-foreground-muted mb-4 max-w-lg">{sponsor.description}</p>
                                  )}
                                  {sponsor.website && (
                                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover font-medium transition-colors text-sm inline-flex items-center">
                                      Visit Website <ExternalLink className="h-4 w-4 ml-1" />
                                    </a>
                                  )}
                                </div>
                                {isHostOrAdmin && (
                                  <div className="flex sm:flex-col gap-2 shrink-0">
                                    <Link to={`/tournaments/${id}/sponsors/${sponsor.id}/edit`}>
                                      <Button variant="outline" size="sm" className="w-full justify-start"><Edit className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Edit</span></Button>
                                    </Link>
                                    <Button variant="outline" size="sm" onClick={() => handleToggleSponsorActive(sponsor.id, sponsor.active)} className="w-full justify-start">
                                      {sponsor.active ? <><PowerOff className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Deactivate</span></> : <><Power className="w-4 h-4 sm:mr-2 text-success" /><span className="hidden sm:inline">Activate</span></>}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSponsor(sponsor.id); }} className="w-full justify-start text-error hover:text-error hover:bg-error/10">
                                      <Trash2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Delete</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Sponsors */}
                      {sponsors.filter(s => s.sponsorType !== 'Title Sponsor' && (s.active || isHostOrAdmin)).length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-foreground-muted uppercase tracking-wider mb-4 border-b border-border pb-2">Partners & Sponsors</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {sponsors.filter(s => s.sponsorType !== 'Title Sponsor' && (s.active || isHostOrAdmin)).map((sponsor, index, arr) => {
                              const globalIndex = sponsors.findIndex(spon => spon.id === sponsor.id);
                              return (
                              <div key={sponsor.id} className={`relative flex flex-col items-center text-center gap-3 p-4 rounded-xl border ${sponsor.active ? 'border-border bg-surface' : 'border-dashed border-border opacity-60 bg-surface'}`}>
                                {isHostOrAdmin && (
                                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                                    <button onClick={() => handleReorderSponsor(globalIndex, 'up')} disabled={globalIndex === 0} className="p-1 bg-surface-hover rounded disabled:opacity-30 hover:bg-border"><ArrowUp className="w-3 h-3" /></button>
                                    <button onClick={() => handleReorderSponsor(globalIndex, 'down')} disabled={globalIndex === sponsors.length - 1} className="p-1 bg-surface-hover rounded disabled:opacity-30 hover:bg-border"><ArrowDown className="w-3 h-3" /></button>
                                  </div>
                                )}
                                {sponsor.logoUrl ? (
                                  <img loading="lazy" src={sponsor.logoUrl} alt={sponsor.name} className="w-24 h-24 rounded-lg object-contain bg-white p-1 shadow-sm" />
                                ) : (
                                  <div className="w-24 h-24 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-foreground-muted text-xs text-center p-1">
                                    No Logo
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 w-full px-2">
                                  <p className="text-sm font-bold text-foreground truncate">
                                    {sponsor.name}
                                  </p>
                                  <p className="text-xs text-foreground-muted uppercase tracking-wider mt-0.5 truncate">
                                    {sponsor.sponsorType}
                                  </p>
                                  {sponsor.website && (
                                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors text-xs inline-flex items-center mt-2">
                                      Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  )}
                                </div>
                                {isHostOrAdmin && (
                                  <div className="flex items-center justify-center gap-1 w-full mt-2 pt-3 border-t border-border">
                                    <Link to={`/tournaments/${id}/sponsors/${sponsor.id}/edit`} className="flex-1">
                                      <Button variant="outline" size="sm" className="w-full h-8 px-0"><Edit className="w-3.5 h-3.5" /></Button>
                                    </Link>
                                    <Button variant="outline" size="sm" onClick={() => handleToggleSponsorActive(sponsor.id, sponsor.active)} className="flex-1 h-8 px-0">
                                      {sponsor.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 text-success" />}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSponsor(sponsor.id); }} className="flex-1 h-8 px-0 text-error hover:text-error hover:bg-error/10">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )})}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {isHostOrAdmin && (
              <TabsContent value="SETTINGS" activeValue={activeTab}>
                <Card>
                  <CardHeader>
                    <CardTitle>Tournament Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-sm text-foreground-muted">
                      Use this panel to manage tournament configuration, update details, or assign officials.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link to={`/tournaments/${id}/admin`} className="block">
                        <div className="p-4 border border-border rounded-xl hover:bg-surface-hover transition-colors flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-lg text-primary">
                            <Settings className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Edit Details</h4>
                            <p className="text-xs text-foreground-muted">Update tournament info and format</p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to={`/tournaments/${id}/teams/manage`} className="block">
                        <div className="p-4 border border-border rounded-xl hover:bg-surface-hover transition-colors flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-lg text-primary">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">Manage Teams</h4>
                            <p className="text-xs text-foreground-muted">Add or remove participating teams</p>
                          </div>
                        </div>
                      </Link>
                    
                      <div className="pt-4 border-t border-border">
                        <h4 className="font-bold text-sm mb-2 text-warning">Data Integrity</h4>
                        <Button variant="outline" onClick={handleSyncEntities} className="w-full justify-start text-left bg-surface-hover">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">Sync & Repair Data</span>
                            <span className="text-xs text-foreground-muted font-normal mt-1">Fixes broken team, group, and player references</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
