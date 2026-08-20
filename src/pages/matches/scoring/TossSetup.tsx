import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export function TossSetup({ match }: { match: Match }) {
  const [winnerId, setWinnerId] = useState<string>('');
  const [decision, setDecision] = useState<'BAT' | 'BOWL' | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!winnerId || !decision) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        tossWinnerId: winnerId,
        tossDecision: decision,
        status: 'LIVE'
      });
    } catch (e) {
      console.error(e);
      alert('Failed to save toss.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Match Toss</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-bold mb-2 block">Who won the toss?</label>
          <div className="flex gap-2">
            <Button 
              variant={winnerId === match.team1Id ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setWinnerId(match.team1Id)}
            >
              {match.team1ShortName || match.team1Name}
            </Button>
            <Button 
              variant={winnerId === match.team2Id ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setWinnerId(match.team2Id)}
            >
              {match.team2ShortName || match.team2Name}
            </Button>
          </div>
        </div>

        {winnerId && (
          <div>
            <label className="text-sm font-bold mb-2 block">Decision</label>
            <div className="flex gap-2">
              <Button 
                variant={decision === 'BAT' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setDecision('BAT')}
              >
                Bat First
              </Button>
              <Button 
                variant={decision === 'BOWL' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setDecision('BOWL')}
              >
                Bowl First
              </Button>
            </div>
          </div>
        )}

        {winnerId && decision && (
          <div className="p-3 bg-surface-hover rounded-lg text-center text-sm font-bold border border-border">
            {winnerId === match.team1Id ? match.team1Name : match.team2Name} won the toss and elected to {decision === 'BAT' ? 'bat' : 'bowl'}.
          </div>
        )}
        <Button 
          className="w-full" 
          disabled={!winnerId || !decision || loading}
          onClick={handleSave}
        >
          {loading ? 'Saving...' : 'Start Match'}
        </Button>
      </CardContent>
    </Card>
  );
}
