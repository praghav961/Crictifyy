import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, TournamentGroup, TournamentTeam } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, Users, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentGroupsTab({ tournament, isHostOrAdmin }: Props) {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMaxTeams, setNewGroupMaxTeams] = useState(4);
  const [newGroupQualifiers, setNewGroupQualifiers] = useState(2);

  // Assignment state
  const [assigningGroupId, setAssigningGroupId] = useState<string | null>(null);
  const [selectedTeamsToAssign, setSelectedTeamsToAssign] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gSnap, tSnap] = await Promise.all([
          getDocs(collection(db, `tournaments/${tournament.id}/groups`)),
          getDocs(collection(db, `tournaments/${tournament.id}/teams`))
        ]);
        setGroups(gSnap.docs.map(d => d.data() as TournamentGroup).sort((a, b) => a.displayOrder - b.displayOrder));
        setTeams(tSnap.docs.map(d => d.data() as TournamentTeam));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournament.id]);

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    try {
      const newGroup: TournamentGroup = {
        id: uuidv4(),
        tournamentId: tournament.id,
        name: newGroupName,
        displayOrder: groups.length,
        teamIds: [],
        qualificationSlots: newGroupQualifiers,
        pointsConfiguration: 'standard',
        tieBreakConfiguration: 'nrr',
        status: 'UPCOMING',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, `tournaments/${tournament.id}/groups`, newGroup.id), newGroup);
      setGroups([...groups, newGroup]);
      setIsCreating(false);
      setNewGroupName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? All team assignments will be lost.')) return;
    try {
      await deleteDoc(doc(db, `tournaments/${tournament.id}/groups`, groupId));
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamsToAssign(prev => 
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleAssignTeams = async (groupId: string) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      // Ensure a team isn't assigned to multiple groups
      const otherGroups = groups.filter(g => g.id !== groupId);
      let duplicateTeam = null;
      selectedTeamsToAssign.forEach(tid => {
         otherGroups.forEach(og => {
            if (og.teamIds.includes(tid)) duplicateTeam = teams.find(t => t.id === tid)?.name;
         });
      });

      if (duplicateTeam) {
         alert(`${duplicateTeam} is already assigned to another group. A team can only belong to one group.`);
         return;
      }

      const updatedTeamIds = Array.from(new Set([...group.teamIds, ...selectedTeamsToAssign]));
      await setDoc(doc(db, `tournaments/${tournament.id}/groups`, groupId), { teamIds: updatedTeamIds }, { merge: true });
      
      setGroups(groups.map(g => g.id === groupId ? { ...g, teamIds: updatedTeamIds } : g));
      setAssigningGroupId(null);
      setSelectedTeamsToAssign([]);
    } catch (err) {
      console.error(err);
      alert('Failed to assign teams');
    }
  };

  const handleRemoveTeamFromGroup = async (groupId: string, teamId: string) => {
    if (!window.confirm('Remove this team from the group?')) return;
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const updatedTeamIds = group.teamIds.filter(id => id !== teamId);
      await setDoc(doc(db, `tournaments/${tournament.id}/groups`, groupId), { teamIds: updatedTeamIds }, { merge: true });
      
      setGroups(groups.map(g => g.id === groupId ? { ...g, teamIds: updatedTeamIds } : g));
    } catch (err) {
      console.error(err);
      alert('Failed to remove team');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading groups...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Group Stage ({groups.length} Groups)</CardTitle>
          {isHostOrAdmin && !isCreating && (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Group
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isCreating && (
            <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-sm font-medium">Group Name</label>
                <Input 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Group A"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-sm font-medium">Qualifiers</label>
                <Input 
                  type="number"
                  min={1}
                  value={newGroupQualifiers}
                  onChange={(e) => setNewGroupQualifiers(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreateGroup} disabled={!newGroupName}>Save Group</Button>
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
              No groups created yet.
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(group => (
                <div key={group.id} className="border border-border rounded-xl overflow-hidden bg-surface">
                  <div className="bg-surface-hover p-4 border-b border-border flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-lg text-foreground">{group.name}</h3>
                      <p className="text-xs text-foreground-muted font-bold uppercase tracking-wider mt-1">
                        Top {group.qualificationSlots} Qualify • {group.teamIds.length} Teams
                      </p>
                    </div>
                    {isHostOrAdmin && (
                      <div className="flex gap-2">
                         {assigningGroupId !== group.id && (
                           <Button variant="outline" size="sm" onClick={() => {
                             setAssigningGroupId(group.id);
                             setSelectedTeamsToAssign([]);
                           }}>
                             <Plus className="w-4 h-4 mr-1"/> Add Team
                           </Button>
                         )}
                         <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveGroup(group.id); }} className="text-error hover:text-error hover:bg-error/10">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                     {assigningGroupId === group.id && (
                       <div className="bg-surface-hover p-4 rounded-lg border border-border mb-4">
                         <h4 className="font-bold text-sm mb-3">Assign Teams to {group.name}</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-60 overflow-y-auto">
                            {teams.filter(t => !group.teamIds.includes(t.id)).map(team => {
                               // Check if already in another group
                               const inOtherGroup = groups.some(g => g.id !== group.id && g.teamIds.includes(team.id));
                               if (inOtherGroup) return null;

                               return (
                                 <label key={team.id} className="flex items-center gap-3 p-2 rounded border border-border bg-surface cursor-pointer hover:border-primary/50 transition-colors">
                                   <input 
                                     type="checkbox" 
                                     checked={selectedTeamsToAssign.includes(team.id)}
                                     onChange={() => toggleTeamSelection(team.id)}
                                     className="w-4 h-4"
                                   />
                                   <span className="text-sm font-bold">{team.name}</span>
                                 </label>
                               )
                            })}
                         </div>
                         <div className="flex justify-end gap-2">
                           <Button variant="outline" size="sm" onClick={() => setAssigningGroupId(null)}>Cancel</Button>
                           <Button size="sm" onClick={() => handleAssignTeams(group.id)} disabled={selectedTeamsToAssign.length === 0}>Assign to Group</Button>
                         </div>
                       </div>
                     )}

                     {group.teamIds.length === 0 ? (
                       <div className="text-sm text-foreground-muted text-center py-4">No teams assigned.</div>
                     ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                         {group.teamIds.map(tid => {
                           const team = teams.find(t => t.id === tid);
                           if (!team) return null;
                           return (
                             <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface relative">
                               {team.logoUrl ? (
                                 <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded bg-white object-contain" />
                               ) : (
                                 <div className="w-10 h-10 rounded bg-surface-hover flex items-center justify-center font-bold text-xs">{team.shortName}</div>
                               )}
                               <div className="flex-1 min-w-0 pr-6">
                                 <h4 className="font-bold text-sm truncate">{team.name}</h4>
                               </div>
                               {isHostOrAdmin && (
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveTeamFromGroup(group.id, team.id); }} className="absolute right-3 p-1 text-foreground-muted hover:text-error transition-colors">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                             </div>
                           )
                         })}
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
