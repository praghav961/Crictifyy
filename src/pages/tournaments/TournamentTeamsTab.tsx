import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, TournamentTeam, Team } from '../../types';
import { User } from 'firebase/auth';
import { TournamentTeamProfile } from './TournamentTeamProfile';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentTeamsTab({ tournament, isHostOrAdmin }: Props) {
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [globalTeams, setGlobalTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGlobalTeam, setSelectedGlobalTeam] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTeamView, setSelectedTeamView] = useState<TournamentTeam | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  
  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !isHostOrAdmin) return;
    const currentGroups = tournament.groups || [];
    if (currentGroups.includes(newGroupName.trim())) {
      alert("Group already exists.");
      return;
    }
    const updatedGroups = [...currentGroups, newGroupName.trim()];
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), { groups: updatedGroups });
      tournament.groups = updatedGroups; // Optimistic update
      setNewGroupName('');
    } catch(err) {
      console.error(err);
      alert("Failed to add group");
    }
  };

  const handleRemoveGroup = async (groupToRemove: string) => {
    if (!isHostOrAdmin || !window.confirm('Remove this group? Teams in this group will not be deleted but their group assignment might become invalid.')) return;
    const currentGroups = tournament.groups || [];
    const updatedGroups = currentGroups.filter(g => g !== groupToRemove);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), { groups: updatedGroups });
      tournament.groups = updatedGroups;
      
      // Update any teams that were in this group
      const affectedTeams = tournamentTeams.filter(t => t.groupId === groupToRemove);
      for (const t of affectedTeams) {
        await updateDoc(doc(db, `tournaments/${tournament.id}/teams`, t.id), { groupId: null });
        t.groupId = undefined; // Optimistic
      }
      setTournamentTeams([...tournamentTeams]);
    } catch(err) {
      console.error(err);
    }
  };


  useEffect(() => {
    async function fetchData() {
      try {
        const tTeamsSnap = await getDocs(collection(db, `tournaments/${tournament.id}/teams`));
        setTournamentTeams(tTeamsSnap.docs.map(d => d.data() as TournamentTeam));
        
        if (isHostOrAdmin) {
          const gTeamsSnap = await getDocs(collection(db, 'teams'));
          setGlobalTeams(gTeamsSnap.docs.map(d => d.data() as Team));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tournament.id, isHostOrAdmin]);

  const handleAddTeam = async () => {
    if (!selectedGlobalTeam) return;
    const gTeam = globalTeams.find(t => t.id === selectedGlobalTeam);
    if (!gTeam) return;

    if (tournament.numberOfTeams && tournamentTeams.length >= tournament.numberOfTeams) {
      alert(`Cannot add more than ${tournament.numberOfTeams} teams.`);
      return;
    }

    const newTTeam: TournamentTeam = {
      id: gTeam.id,
      name: gTeam.name,
      shortName: gTeam.shortName,
      logoUrl: gTeam.logoUrl || null,
      groupId: null,
      played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0,
      joinedAt: Date.now()
    };

    try {
      await setDoc(doc(db, `tournaments/${tournament.id}/teams`, gTeam.id), newTTeam);
      setTournamentTeams([...tournamentTeams, newTTeam]);
      setIsAdding(false);
      setSelectedGlobalTeam('');
      setSelectedGroup('');
    } catch (err) {
      console.error(err);
      alert('Failed to add team');
    }
  };


  const handleCreateNewTeam = async () => {
    if (!newTeamName || !newTeamShortName || !user) return;
    
    if (tournament.numberOfTeams && tournamentTeams.length >= tournament.numberOfTeams) {
      alert(`Cannot add more than ${tournament.numberOfTeams} teams.`);
      return;
    }

    try {
      const newTeamId = 'team_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newGlobalTeam: Team = {
        id: newTeamId,
        name: newTeamName,
        shortName: newTeamShortName.toUpperCase(),
        manager: user.uid,
        createdAt: Date.now(), updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'teams', newTeamId), newGlobalTeam);
      
      const newTTeam: TournamentTeam = {
        id: newGlobalTeam.id,
        name: newGlobalTeam.name,
        shortName: newGlobalTeam.shortName,
        logoUrl: newGlobalTeam.logoUrl || null,
        groupId: selectedGroup || null,
        played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0,
        joinedAt: Date.now()
      };
      
      await setDoc(doc(db, `tournaments/${tournament.id}/teams`, newGlobalTeam.id), newTTeam);
      
      setGlobalTeams([...globalTeams, newGlobalTeam]);
      setTournamentTeams([...tournamentTeams, newTTeam]);
      
      setIsCreating(false);
      setIsAdding(false);
      setNewTeamName('');
      setNewTeamShortName('');
      setSelectedGroup('');
    } catch (err) {
      console.error(err);
      alert('Failed to create and add team');
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to remove this team from the tournament?')) return;
    try {
      await deleteDoc(doc(db, `tournaments/${tournament.id}/teams`, teamId));
      setTournamentTeams(tournamentTeams.filter(t => t.id !== teamId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading teams...</div>;

  if (selectedTeamView) {
    return (
      <TournamentTeamProfile 
        tournament={tournament} 
        team={selectedTeamView} 
        isHostOrAdmin={isHostOrAdmin} 
        user={user}
        onBack={() => setSelectedTeamView(null)} 
      />
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Teams ({tournamentTeams.length}{tournament.numberOfTeams ? ` / ${tournament.numberOfTeams}` : ''})</CardTitle>
        {isHostOrAdmin && !isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Team
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isAdding && !isCreating && (
          <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">Select Existing Team</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                value={selectedGlobalTeam}
                onChange={e => setSelectedGlobalTeam(e.target.value)}
              >
                <option value="">-- Select Team --</option>
                {globalTeams.filter(t => !tournamentTeams.find(tt => tt.id === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsCreating(true)}>Create New</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddTeam} disabled={!selectedGlobalTeam}>Add</Button>
            </div>
          </div>
        )}
        
        {isCreating && (
          <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">New Team Name</label>
              <Input 
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Mumbai Indians"
              />
            </div>
            <div className="w-full sm:w-32 space-y-1">
              <label className="text-sm font-medium">Short Name</label>
              <Input 
                value={newTeamShortName}
                onChange={(e) => setNewTeamShortName(e.target.value)}
                placeholder="e.g. MI"
                maxLength={4}
              />
            </div>
            
            
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Select Existing</Button>
              <Button variant="outline" onClick={() => { setIsCreating(false); setIsAdding(false); }}>Cancel</Button>
              <Button onClick={handleCreateNewTeam} disabled={!newTeamName || !newTeamShortName}>Create & Add</Button>
            </div>
          </div>
        )}


        {tournamentTeams.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
            No teams added to this tournament yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tournamentTeams.map(team => (
              <div key={team.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface relative">
                {isHostOrAdmin && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveTeam(team.id); }}
                    className="absolute top-2 right-2 p-1.5 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {team.logoUrl ? (
                  <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-12 h-12 rounded-lg object-contain bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-foreground-muted font-bold">
                    {team.shortName}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-foreground">{team.name}</h4>
                  </div>

                <div className="flex flex-col gap-1 w-full mt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedTeamView(team)}>Manage Team</Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
