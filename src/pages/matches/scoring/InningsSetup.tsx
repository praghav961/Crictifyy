import { useState, useEffect } from 'react';
import { updateDoc, doc, getDocs, collection, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match, TournamentPlayer } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { InningsState } from '../../../lib/scoring/types';

export function InningsSetup({ match }: { match: Match }) {
  const [strikerName, setStrikerName] = useState('');
  const [nonStrikerName, setNonStrikerName] = useState('');
  const [bowlerName, setBowlerName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pastInnings, setPastInnings] = useState<InningsState[]>([]);
  const [battingPlayers, setBattingPlayers] = useState<TournamentPlayer[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<TournamentPlayer[]>([]);

  let battingTeamId = match.team1Id;
  const isTeam1TossWinner = match.tossWinnerId === match.team1Id;
  
  if (isTeam1TossWinner && match.tossDecision === 'BAT') battingTeamId = match.team1Id;
  else if (isTeam1TossWinner && match.tossDecision === 'BOWL') battingTeamId = match.team2Id;
  else if (!isTeam1TossWinner && match.tossDecision === 'BAT') battingTeamId = match.team2Id;
  else if (!isTeam1TossWinner && match.tossDecision === 'BOWL') battingTeamId = match.team1Id;

  let isSecondInnings = pastInnings.length >= 1;
  if (isSecondInnings) {
    battingTeamId = battingTeamId === match.team1Id ? match.team2Id : match.team1Id;
  }
  const bowlingTeamId = battingTeamId === match.team1Id ? match.team2Id : match.team1Id;

  useEffect(() => {
    async function fetchPast() {
      const snap = await getDocs(collection(db, 'matches', match.id, 'innings'));
      const data: InningsState[] = [];
      snap.forEach(d => data.push(d.data() as InningsState));
      setPastInnings(data);
      
      if (match.tournamentId) {
         try {
            const batQ = query(collection(db, `tournaments/${match.tournamentId}/players`), where('teamId', '==', battingTeamId));
            const bowlQ = query(collection(db, `tournaments/${match.tournamentId}/players`), where('teamId', '==', bowlingTeamId));
            const [batSnap, bowlSnap] = await Promise.all([getDocs(batQ), getDocs(bowlQ)]);
            setBattingPlayers(batSnap.docs.map(d => d.data() as TournamentPlayer));
            setBowlingPlayers(bowlSnap.docs.map(d => d.data() as TournamentPlayer));
         } catch(err) {
            console.error(err);
         }
      }
    }
    fetchPast();
  }, [match.id, match.tournamentId, battingTeamId, bowlingTeamId]);


  const targetRuns = isSecondInnings ? pastInnings[0].totalRuns + 1 : undefined;

  
  const handleStartInnings = async () => {
    if (!strikerName || !nonStrikerName || !bowlerName) return;
    if (strikerName === nonStrikerName) {
      alert("Striker and Non-Striker cannot be the same person");
      return;
    }
    setLoading(true);
    
    try {
      const inningIndex = pastInnings.length + 1;
      const inningId = `inning_${inningIndex}_${match.id}`;
      
      // If we selected an ID from the dropdown, use it, otherwise prefix with temp_
      const strikerObj = battingPlayers.find(p => p.id === strikerName);
      const strikerId = strikerObj ? strikerName : `temp_${strikerName.replace(/\s+/g, '_')}`;
      const strikerDisplayName = strikerObj ? strikerObj.name : strikerName;
      
      const nonStrikerObj = battingPlayers.find(p => p.id === nonStrikerName);
      const nonStrikerId = nonStrikerObj ? nonStrikerName : `temp_${nonStrikerName.replace(/\s+/g, '_')}`;
      const nonStrikerDisplayName = nonStrikerObj ? nonStrikerObj.name : nonStrikerName;
      
      const bowlerObj = bowlingPlayers.find(p => p.id === bowlerName);
      const bowlerId = bowlerObj ? bowlerName : `temp_${bowlerName.replace(/\s+/g, '_')}`;
      const bowlerDisplayName = bowlerObj ? bowlerObj.name : bowlerName;
      
      const initialState: InningsState = {
        matchId: match.id,
        inningId,
        teamId: battingTeamId,
        totalRuns: 0,
        totalWickets: 0,
        completedOvers: 0,
        currentOverBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batterStats: {
          [strikerId]: { id: strikerId, name: strikerDisplayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false },
          [nonStrikerId]: { id: nonStrikerId, name: nonStrikerDisplayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }
        },
        bowlerStats: {
          [bowlerId]: { id: bowlerId, name: bowlerDisplayName, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 }
        },
        currentStrikerId: strikerId,
        currentNonStrikerId: nonStrikerId,
        currentBowlerId: bowlerId,
        fallOfWickets: [],
        currentPartnership: { player1Id: strikerId, player2Id: nonStrikerId, runs: 0, balls: 0 },
        status: 'IN_PROGRESS',
        processedEvents: [],
        currentOverRunsConcededByBowler: 0,
        ...(targetRuns !== undefined && { targetRuns }), // set target if 2nd innings
        maxOvers: match.overs || 20 // Default to 20 if not set on match
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'matches', match.id, 'innings', inningId), JSON.parse(JSON.stringify(initialState)));
      batch.update(doc(db, 'matches', match.id), { currentInningId: inningId });
      
      await batch.commit();
    } catch (e) {
      console.error(e);
      alert('Failed to start innings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isSecondInnings ? 'Start 2nd Innings' : 'Start 1st Innings'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSecondInnings && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-center font-bold text-warning mb-4">
            Target: {targetRuns} runs
          </div>
        )}
        
        
        <div>
          <label className="text-sm font-bold mb-1 block">Striker</label>
          {battingPlayers.length > 0 ? (
            <select className="w-full p-2 border border-border rounded bg-surface" value={strikerName} onChange={e => setStrikerName(e.target.value)}>
               <option value="">-- Select Player --</option>
               {battingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
             <input type="text" className="w-full p-2 border border-border rounded bg-surface" value={strikerName} onChange={e => setStrikerName(e.target.value)} placeholder="Type name..." />
          )}
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Non-Striker</label>
          {battingPlayers.length > 0 ? (
            <select className="w-full p-2 border border-border rounded bg-surface" value={nonStrikerName} onChange={e => setNonStrikerName(e.target.value)}>
               <option value="">-- Select Player --</option>
               {battingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
             <input type="text" className="w-full p-2 border border-border rounded bg-surface" value={nonStrikerName} onChange={e => setNonStrikerName(e.target.value)} placeholder="Type name..." />
          )}
        </div>
        <div>
          <label className="text-sm font-bold mb-1 block">Opening Bowler</label>
          {bowlingPlayers.length > 0 ? (
            <select className="w-full p-2 border border-border rounded bg-surface" value={bowlerName} onChange={e => setBowlerName(e.target.value)}>
               <option value="">-- Select Player --</option>
               {bowlingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
             <input type="text" className="w-full p-2 border border-border rounded bg-surface" value={bowlerName} onChange={e => setBowlerName(e.target.value)} placeholder="Type name..." />
          )}
        </div>


        <Button 
          className="w-full mt-4" 
          disabled={!strikerName || !nonStrikerName || !bowlerName || loading}
          onClick={handleStartInnings}
        >
          {loading ? 'Starting...' : 'Start Scoring'}
        </Button>
      </CardContent>
    </Card>
  );
}
