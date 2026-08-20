const fs = require('fs');
let code = fs.readFileSync('src/pages/teams/TeamProfile.tsx', 'utf8');

// Add necessary imports
code = code.replace(
  /import \{ doc, getDoc \} from 'firebase\/firestore';/,
  "import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';"
);
code = code.replace(
  /import \{ Team \} from '\.\.\/\.\.\/types';/,
  "import { Team, Player } from '../../types';\nimport { collection, getDocs, query, where } from 'firebase/firestore';"
);
code = code.replace(
  /import \{ ArrowLeft, Shield, MapPin, PenSquare \} from 'lucide-react';/,
  "import { ArrowLeft, Shield, MapPin, PenSquare, Trash2, User as UserIcon } from 'lucide-react';"
);

// Add state for squad players
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState\('SQUAD'\);/,
  "const [activeTab, setActiveTab] = useState('SQUAD');\n  const [squadPlayers, setSquadPlayers] = useState<Player[]>([]);\n  const [loadingSquad, setLoadingSquad] = useState(false);"
);

// Fetch squad inside useEffect
const fetchTeamReplacement = `
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
`;
code = code.replace(/async function fetchTeam\(\) \{[\s\S]*?fetchTeam\(\);/m, fetchTeamReplacement.trim() + '\n    fetchTeam();');

// Add handleRemovePlayer
const handleRemovePlayer = `
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
`;
code = code.replace(/if \(loading\) \{/, handleRemovePlayer + '\n  if (loading) {');

// Render squad players
const renderSquad = `
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
                        <button type="button" onClick={() => handleRemovePlayer(player.id)}
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
`;
code = code.replace(/<TabsContent value="SQUAD" activeValue=\{activeTab\}>[\s\S]*?<\/TabsContent>/, renderSquad.trim());

fs.writeFileSync('src/pages/teams/TeamProfile.tsx', code);
