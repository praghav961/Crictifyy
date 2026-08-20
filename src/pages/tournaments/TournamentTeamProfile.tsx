import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, TournamentTeam, TournamentPlayer } from '../../types';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  tournament: Tournament;
  team: TournamentTeam;
  isHostOrAdmin: boolean;
  onBack: () => void;
  user: User | null;
}

export function TournamentTeamProfile({ tournament, team, isHostOrAdmin, onBack, user }: Props) {
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('BATSMAN');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const pSnap = await getDocs(query(collection(db, `tournaments/${tournament.id}/players`), where('teamId', '==', team.id)));
        setPlayers(pSnap.docs.map(d => d.data() as TournamentPlayer));
      } catch (err: any) { console.error(err); } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [tournament.id, team.id]);

  const handleCreateNewPlayer = async () => {
    if (tournament.playersPerTeam && players.length >= tournament.playersPerTeam) {
      alert(`Cannot add more than ${tournament.playersPerTeam} players per team. This is strictly enforced.`);
      return;
    }
    if (!newPlayerName || !user) return;
    try {
      const playerId = 'player_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      
      const newPlayer: TournamentPlayer = {
        id: playerId,
        tournamentId: tournament.id,
        teamId: team.id,
        name: newPlayerName,
        role: newPlayerRole,
        avatarUrl: null,
        joinedAt: Date.now()
      };

      await setDoc(doc(db, `tournaments/${tournament.id}/players`, newPlayer.id), newPlayer);
      setPlayers([...players, newPlayer]);
      setIsAdding(false);
      setNewPlayerName('');
      setNewPlayerRole('BATSMAN');
    } catch (err) {
      console.error(err);
      alert('Failed to add player');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!window.confirm('Are you sure you want to remove this player?')) return;
    try {
      await deleteDoc(doc(db, `tournaments/${tournament.id}/players`, playerId));
      setPlayers(players.filter(p => p.id !== playerId));
    } catch (err: any) { console.error(err); alert('Failed to remove player: ' + err.message); }
  };

  if (loading) return <div className="p-4 text-center">Loading team profile...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Teams
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-24 h-24 rounded-xl object-contain bg-white border border-border" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-surface-hover flex items-center justify-center text-2xl font-bold text-foreground-muted border border-border">
                {team.shortName}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black">{team.name}</h2>
              <p className="text-foreground-muted uppercase tracking-wider text-sm font-bold mt-1">{team.shortName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Players ({players.length})</CardTitle>
          {isHostOrAdmin && !isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Player
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdding && (
            <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-sm font-medium">Player Name</label>
                <Input 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Virat Kohli"
                />
              </div>
              <div className="w-full sm:w-48 space-y-1">
                <label className="text-sm font-medium">Role</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                >
                  <option value="BATSMAN">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="WICKET_KEEPER">Wicketkeeper</option>
                </select>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button onClick={handleCreateNewPlayer} disabled={!newPlayerName}>Save Player</Button>
              </div>
            </div>
          )}

          {players.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
              No players added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
