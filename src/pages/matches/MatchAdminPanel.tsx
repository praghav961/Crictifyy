import { auth } from '../../lib/firebase';
import { Match } from '../../types';
import { Input } from '../../components/ui/Input';
import { Settings, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ScoringSession } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { logAudit } from '../../lib/audit';

interface MatchAdminPanelProps {
  matchId: string;
  match?: Match;
}

export function MatchAdminPanel({ matchId, match }: MatchAdminPanelProps) {
  const [oversInput, setOversInput] = useState('');
  const [dlsTargetInput, setDlsTargetInput] = useState('');
  const [sessions, setSessions] = useState<ScoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [matchId]);

  const fetchSessions = async () => {
    try {
      const q = query(collection(db, 'scoringSessions'), where('matchId', '==', matchId));
      const snap = await getDocs(q);
      const data: ScoringSession[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as ScoringSession);
      });
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this scoring session?')) return;
    try {
      await updateDoc(doc(db, 'scoringSessions', sessionId), {
        revoked: true
      });
      logAudit(auth.currentUser?.uid || '', 'ACCESS_REVOKED', { matchId, metadata: { sessionId } });
      await fetchSessions();
    } catch (e) {
      console.error(e);
      alert('Failed to revoke session');
    }
  };

  if (loading) return <div>Loading admin data...</div>;

  const activeSessions = sessions.filter(s => !s.revoked && s.expiresAt > Date.now());

  if (activeSessions.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center text-warning">
            <Settings className="w-4 h-4 mr-2" /> Match Advanced Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 space-y-4">
          <div className="grid grid-cols-2 gap-2">

            {match?.status === 'COMPLETED' && (
              <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={async () => {
                if (confirm('Reopen match? This will change status back to LIVE.')) {
                  await updateDoc(doc(db, 'matches', matchId), { status: 'LIVE' });
                  logAudit(auth.currentUser?.uid || '', 'MATCH_REOPENED', { matchId });
                  alert('Match reopened.');
                }
              }}>
                Reopen Match
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-error/50 text-error hover:bg-error/10" onClick={async () => {
              if (confirm('Mark match as ABANDONED? This cannot be undone easily.')) {
                await updateDoc(doc(db, 'matches', matchId), { status: 'ABANDONED', result: 'Match Abandoned' });
                alert('Match abandoned.');
              }
            }}>
              Abandon Match
            </Button>
            <Button size="sm" variant="outline" className="border-warning/50 text-warning hover:bg-warning/10" onClick={async () => {
              if (confirm('Mark match as NO RESULT?')) {
                await updateDoc(doc(db, 'matches', matchId), { status: 'COMPLETED', result: 'No Result' });
                alert('Match declared No Result.');
              }
            }}>
              No Result
            </Button>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-foreground-muted mb-1 block">Reduce Overs</label>
              <Input placeholder="E.g., 15" value={oversInput} onChange={e => setOversInput(e.target.value)} type="number" />
            </div>
            <Button size="sm" variant="outline" onClick={async () => {
              if (!oversInput) return;
              const val = parseInt(oversInput);
              if (val > 0 && confirm(`Reduce match to ${val} overs?`)) {
                await updateDoc(doc(db, 'matches', matchId), { overs: val, revisedOvers: val });
                alert('Overs reduced.');
              }
            }}>Update</Button>
          </div>

          {match && match.currentInningId && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-foreground-muted mb-1 block">Apply DLS Target</label>
                <Input placeholder="Revised Target" value={dlsTargetInput} onChange={e => setDlsTargetInput(e.target.value)} type="number" />
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                if (!dlsTargetInput) return;
                const val = parseInt(dlsTargetInput);
                if (val > 0 && confirm(`Apply DLS Target of ${val}?`)) {
                  await updateDoc(doc(db, 'matches', matchId, 'innings', match.currentInningId), { targetRuns: val, dlsTarget: val });
                  await updateDoc(doc(db, 'matches', matchId), { dlsApplied: true });
                  alert('DLS Target applied.');
                }
              }}>Set DLS</Button>
            </div>
          )}

          <div className="pt-2">
            <Button size="sm" className="w-full" variant="outline" onClick={async () => {
               if (confirm('Start a Super Over? This will reset the current match state to a 1-over shootout.')) {
                 await updateDoc(doc(db, 'matches', matchId), { overs: 1, isSuperOver: true, status: 'LIVE', currentInningId: '' });
                 alert('Super Over configured. Please restart scoring from the Toss/Innings setup.');
               }
            }}>
              <Activity className="w-4 h-4 mr-2" /> Start Super Over
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-error/20">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center text-error">
          <ShieldAlert className="w-4 h-4 mr-2" /> Active Scoring Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-3">
          {activeSessions.map(session => (
            <div key={session.id} className="flex items-center justify-between bg-surface-hover p-2 rounded">
              <div className="text-sm font-mono truncate max-w-[200px]">
                User: {session.userId}
              </div>
              <Button size="sm" variant="outline" className="text-error border-error/20 hover:bg-error/10" onClick={() => handleRevoke(session.id)}>
                <Trash2 className="w-3 h-3 mr-1" /> Revoke
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
