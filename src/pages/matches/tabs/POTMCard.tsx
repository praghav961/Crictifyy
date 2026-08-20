import { auth } from '../../../lib/firebase';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Match, TournamentPlayer } from '../../../types';
import { calculatePlayerOfMatch } from '../../../lib/scoring/potmEngine';
import { Award, AlertCircle } from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { logAudit } from '../../../lib/audit';

export function POTMCard({ match, isAdmin }: { match: Match, isAdmin: boolean }) {
  const { user } = useAuth();
  const [calculating, setCalculating] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  
  const [players, setPlayers] = useState<{id: string, name: string}[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (isOverriding && players.length === 0 && match.tournamentId) {
      // Fetch players
      const fetchPlayers = async () => {
        try {
          const t1 = await getDocs(collection(db, 'tournaments', match.tournamentId!, 'teams', match.team1Id, 'players'));
          const t2 = await getDocs(collection(db, 'tournaments', match.tournamentId!, 'teams', match.team2Id, 'players'));
          
          const p: {id: string, name: string}[] = [];
          t1.forEach(d => p.push({ id: d.id, name: d.data().name }));
          t2.forEach(d => p.push({ id: d.id, name: d.data().name }));
          setPlayers(p);
        } catch (e) {
          console.error(e);
        }
      };
      fetchPlayers();
    }
  }, [isOverriding, match]);

  if (match.status !== 'COMPLETED') {
    return null;
  }

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await calculatePlayerOfMatch(match.id, user?.uid);
    } catch (e) {
      console.error(e);
      alert('Failed to calculate POTM');
    } finally {
      setCalculating(false);
    }
  };
  
  const handleOverride = async () => {
    if (!selectedPlayer || !overrideReason) {
      alert('Please select a player and provide a reason.');
      return;
    }
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        'potm.finalPlayerId': selectedPlayer,
        'potm.overrideReason': overrideReason,
        'potm.selectedBy': user?.uid,
        'potm.selectedAt': Date.now()
      });
      logAudit(auth.currentUser?.uid || '', 'POTM_OVERRIDE', { matchId: match.id, metadata: { selectedPlayer, overrideReason } });
      setIsOverriding(false);
    } catch (e) {
      console.error(e);
      alert('Failed to override POTM');
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <Award className="w-5 h-5" /> Player of the Match
            </h3>
            
            {match.potm ? (
              <div className="mt-2">
                <p className="text-xl font-bold text-foreground">
                  {match.potm.finalPlayerId.replace('temp_', '').replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-foreground-muted mt-1">{match.potm.explanation}</p>
                {match.potm.overrideReason && (
                  <p className="text-sm text-warning mt-1 italic">
                    Overridden by Admin: {match.potm.overrideReason}
                  </p>
                )}
                {match.potm.isClose && !match.potm.overrideReason && (
                  <p className="text-xs text-warning flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" /> Extremely close performance across multiple players.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted mt-1">Player of the Match has not been finalized yet.</p>
            )}
          </div>

          {!isOverriding && (
            <div className="flex flex-col gap-2 shrink-0">
              {isAdmin && !match.potm && (
                <Button onClick={handleCalculate} disabled={calculating}>
                  {calculating ? 'Calculating...' : 'Generate POTM'}
                </Button>
              )}
              {isAdmin && match.potm && (
                <Button variant="outline" size="sm" onClick={() => setIsOverriding(true)}>
                  Override Selection
                </Button>
              )}
            </div>
          )}
        </div>
        
        {isOverriding && (
          <div className="mt-4 pt-4 border-t border-primary/20 space-y-4">
            <h4 className="font-bold text-sm text-foreground">Admin Override</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Select Player</label>
                <select 
                  className="w-full p-2 rounded border border-border bg-surface text-foreground"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                >
                  <option value="">Select a player...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Override Reason</label>
                <input 
                  type="text"
                  className="w-full p-2 rounded border border-border bg-surface text-foreground"
                  placeholder="Reason for manual selection..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOverriding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleOverride}>Confirm Override</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
