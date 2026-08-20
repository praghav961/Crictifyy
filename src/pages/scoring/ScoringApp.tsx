import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getScoringSession, redeemScoringCode } from '../../lib/scoring/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Match } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function ScoringApp() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !matchId) return;

    async function checkAccess() {
      try {
        const matchSnap = await getDoc(doc(db, 'matches', matchId!));
        if (!matchSnap.exists()) {
          setError('Match not found.');
          setLoading(false);
          return;
        }
        const matchData = matchSnap.data() as Match;
        setMatch(matchData);

        // Check if user is Tournament Admin
        if (matchData.tournamentId) {
          const tSnap = await getDoc(doc(db, 'tournaments', matchData.tournamentId));
          if (tSnap.exists()) {
            const hostId = tSnap.data().hostId;
            // Get user profile for roles
            const uSnap = await getDoc(doc(db, 'users', user!.uid));
            const roles = uSnap.exists() ? (uSnap.data().roles || []) : [];
            const isGlobalAdmin = roles.includes('SUPER_ADMIN') ;
            if (hostId === user?.uid || isGlobalAdmin) {
              setHasAccess(true);
              setLoading(false);
              return;
            }
          }
        }

        // Check scoring session
        const session = await getScoringSession(matchId!, user!.uid);
        if (session) {
          setHasAccess(true);
        }
      } catch (err) {
        console.error(err);
        setError('Access Denied or Error loading match.');
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, [matchId, user]);

  const handleRedeem = async () => {
    if (!accessCode) return;
    try {
      setError('');
      await redeemScoringCode(accessCode, user!.uid, matchId!);
      setHasAccess(true);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-error/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-error flex items-center justify-center gap-2">
              ACCESS DENIED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-foreground-muted">
              You do not have permission to score this match.
            </p>
            {error && <div className="p-3 bg-error/10 text-error text-sm rounded-lg text-center font-medium">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-bold">Have an access code?</label>
              <input 
                type="text" 
                placeholder="CRICTIFY-XXXX-XXXX" 
                className="w-full p-3 rounded-lg border border-border bg-surface uppercase text-center font-mono tracking-widest"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button className="w-full" onClick={handleRedeem} disabled={!accessCode}>
              Authenticate
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scoring Engine: {match?.team1ShortName} vs {match?.team2ShortName}</h1>
        <div className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          SESSION ACTIVE
        </div>
      </div>
      <Card>
        <CardContent className="py-24 text-center">
          <h2 className="text-xl font-bold text-foreground-muted">Scoring Console Interface Placeholder</h2>
          <p className="text-sm text-foreground-muted mt-2">Authorization verified.</p>
        </CardContent>
      </Card>
    </div>
  );
}
