import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, TournamentTeam, TournamentPlayer, Player } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentPlayersTab({ tournament, isHostOrAdmin }: Props) {
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGlobalPlayer, setSelectedGlobalPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('BATSMAN');

  useEffect(() => {
    async function fetchData() {
      try {
        const tTeamsSnap = await getDocs(collection(db, `tournaments/${tournament.id}/teams`));
        setTournamentTeams(tTeamsSnap.docs.map(d => d.data() as TournamentTeam));
        
        const tPlayersSnap = await getDocs(collection(db, `tournaments/${tournament.id}/players`));
        setTournamentPlayers(tPlayersSnap.docs.map(d => d.data() as TournamentPlayer));
        
        if (isHostOrAdmin) {
          const gPlayersSnap = await getDocs(collection(db, 'players'));
          setGlobalPlayers(gPlayersSnap.docs.map(d => d.data() as Player));
        }
      } catch (err: any) { console.error(err); } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tournament.id, isHostOrAdmin]);

  const handleAddPlayer = async () => {
    if (!selectedGlobalPlayer || !selectedTeam) return;
    const gPlayer = globalPlayers.find(p => p.id === selectedGlobalPlayer);
    if (!gPlayer) return;

    // Validate players per team
    if (tournament.playersPerTeam) {
      const teamPlayersCount = tournamentPlayers.filter(p => p.teamId === selectedTeam).length;
      if (teamPlayersCount >= tournament.playersPerTeam) {
        alert(`Cannot add more than ${tournament.playersPerTeam} players per team.`);
        return;
      }
    }

    const newTPlayer: TournamentPlayer = {
      id: gPlayer.id,
      teamId: selectedTeam,
      name: gPlayer.name,
      role: gPlayer.role,
      avatarUrl: gPlayer.avatarUrl || null,
      joinedAt: Date.now()
    };

    try {
      await setDoc(doc(db, `tournaments/${tournament.id}/players`, gPlayer.id), newTPlayer);
      setTournamentPlayers([...tournamentPlayers, newTPlayer]);
      setIsAdding(false);
      setSelectedGlobalPlayer('');
    } catch (err) {
      console.error(err);
      alert('Failed to add player');
    }
  };


  const handleCreateNewPlayer = async () => {
    if (!newPlayerName || !selectedTeam || !user) return;
    
    if (tournament.playersPerTeam) {
      const teamPlayersCount = tournamentPlayers.filter(p => p.teamId === selectedTeam).length;
      if (teamPlayersCount >= tournament.playersPerTeam) {
        alert(`Cannot add more than ${tournament.playersPerTeam} players per team.`);
        return;
      }
    }

    try {
      const newPlayerId = 'player_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newGlobalPlayer: Player = {
        id: newPlayerId,
        name: newPlayerName,
        role: newPlayerRole,
        battingStyle: 'RIGHT_HAND',
        bowlingStyle: 'RIGHT_ARM_FAST',
        createdAt: Date.now(), updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'players', newPlayerId), newGlobalPlayer);
      
      const newTPlayer: TournamentPlayer = {
        id: newGlobalPlayer.id,
        teamId: selectedTeam,
        name: newGlobalPlayer.name,
        role: newGlobalPlayer.role,
        avatarUrl: newGlobalPlayer.avatarUrl || null,
        joinedAt: Date.now()
      };
      
      await setDoc(doc(db, `tournaments/${tournament.id}/players`, newGlobalPlayer.id), newTPlayer);
      
      setGlobalPlayers([...globalPlayers, newGlobalPlayer]);
      setTournamentPlayers([...tournamentPlayers, newTPlayer]);
      
      setIsCreating(false);
      setIsAdding(false);
      setNewPlayerName('');
      setNewPlayerRole('BATSMAN');
      setSelectedTeam('');
    } catch (err) {
      console.error(err);
      alert('Failed to create and assign player');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!window.confirm('Are you sure you want to remove this player from the tournament?')) return;
    try {
      await deleteDoc(doc(db, `tournaments/${tournament.id}/players`, playerId));
      setTournamentPlayers(tournamentPlayers.filter(p => p.id !== playerId));
    } catch (err: any) { console.error(err); alert('Failed to remove player: ' + err.message); }
  };

  if (loading) return <div className="p-4 text-center">Loading players...</div>;

  const playersByTeam: Record<string, TournamentPlayer[]> = {};
  tournamentPlayers.forEach(p => {
    if (!playersByTeam[p.teamId]) playersByTeam[p.teamId] = [];
    playersByTeam[p.teamId].push(p);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Players</CardTitle>
        {isHostOrAdmin && !isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Assign Player
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isAdding && !isCreating && (
          <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">Select Existing Player</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                value={selectedGlobalPlayer}
                onChange={e => setSelectedGlobalPlayer(e.target.value)}
              >
                <option value="">-- Select Player --</option>
                {globalPlayers.filter(p => !tournamentPlayers.find(tp => tp.id === p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">Assign To Team</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
              >
                <option value="">-- Select Team --</option>
                {tournamentTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsCreating(true)}>Create New</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddPlayer} disabled={!selectedGlobalPlayer || !selectedTeam}>Add</Button>
            </div>
          </div>
        )}

        {isCreating && (
          <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">New Player Name</label>
              <Input 
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="e.g. Virat Kohli"
              />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">Role</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                value={newPlayerRole}
                onChange={(e: any) => setNewPlayerRole(e.target.value)}
              >
                <option value="BATSMAN">Batsman</option>
                <option value="BOWLER">Bowler</option>
                <option value="ALL_ROUNDER">All Rounder</option>
                <option value="WICKET_KEEPER">Wicket Keeper</option>
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium">Assign To Team</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
              >
                <option value="">-- Select Team --</option>
                {tournamentTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Select Existing</Button>
              <Button variant="outline" onClick={() => { setIsCreating(false); setIsAdding(false); }}>Cancel</Button>
              <Button onClick={handleCreateNewPlayer} disabled={!newPlayerName || !selectedTeam}>Create & Add</Button>
            </div>
          </div>
        )}

        {tournamentPlayers.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
            No players assigned to any teams yet.
          </div>
        ) : (
          <div className="space-y-8">
            {tournamentTeams.map(team => {
              const teamPlayers = playersByTeam[team.id] || [];
              if (teamPlayers.length === 0) return null;
              
              return (
                <div key={team.id}>
                  <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                    {team.logoUrl ? (
                      <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded object-contain bg-white" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-surface-hover flex items-center justify-center text-xs font-bold">
                        {team.shortName}
                      </div>
                    )}
                    <h3 className="font-bold text-foreground text-lg">{team.name} <span className="text-sm text-foreground-muted ml-2 font-normal">({teamPlayers.length}{tournament.playersPerTeam ? ` / ${tournament.playersPerTeam}` : ''} players)</span></h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {teamPlayers.map(player => (
                      <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface relative">
                         {isHostOrAdmin && (
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePlayer(player.id); }}
                            className="absolute top-2 right-2 p-1 z-10 cursor-pointer text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {player.avatarUrl ? (
                          <img loading="lazy" src={player.avatarUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {player.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm font-bold text-foreground truncate">{player.name}</p>
                          <p className="text-xs text-foreground-muted capitalize">{player.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
