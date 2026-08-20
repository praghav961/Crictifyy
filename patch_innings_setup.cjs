const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/InningsSetup.tsx', 'utf8');

const imports = `
import { useState, useEffect } from 'react';
import { updateDoc, doc, getDocs, collection, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match, TournamentPlayer } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { InningsState } from '../../../lib/scoring/types';
`;

code = code.replace(/import \{ useState, useEffect \} from 'react';[\s\S]*?import \{ InningsState \} from '\.\.\/\.\.\/\.\.\/lib\/scoring\/types';/, imports.trim());

const states = `
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
            const batQ = query(collection(db, \`tournaments/\${match.tournamentId}/players\`), where('teamId', '==', battingTeamId));
            const bowlQ = query(collection(db, \`tournaments/\${match.tournamentId}/players\`), where('teamId', '==', bowlingTeamId));
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
`;

code = code.replace(/const \[loading, setLoading\] = useState\(false\);\n\s*const \[pastInnings, setPastInnings\] = useState<InningsState\[\]>\(\[\]\);[\s\S]*?battingTeamId = battingTeamId === match\.team1Id \? match\.team2Id : match\.team1Id;\n\s*\}/, states);

const handleSubmit = `
  const handleStartInnings = async () => {
    if (!strikerName || !nonStrikerName || !bowlerName) return;
    if (strikerName === nonStrikerName) {
      alert("Striker and Non-Striker cannot be the same person");
      return;
    }
    setLoading(true);
    
    try {
      const inningIndex = pastInnings.length + 1;
      const inningId = \`inning_\${inningIndex}_\${match.id}\`;
      
      // If we selected an ID from the dropdown, use it, otherwise prefix with temp_
      const strikerId = battingPlayers.find(p => p.id === strikerName) ? strikerName : \`temp_\${strikerName.replace(/\\s+/g, '_')}\`;
      const nonStrikerId = battingPlayers.find(p => p.id === nonStrikerName) ? nonStrikerName : \`temp_\${nonStrikerName.replace(/\\s+/g, '_')}\`;
      const bowlerId = bowlingPlayers.find(p => p.id === bowlerName) ? bowlerName : \`temp_\${bowlerName.replace(/\\s+/g, '_')}\`;
      
`;
code = code.replace(/const handleStartInnings = async \(\) => \{[\s\S]*?const bowlerId = `temp_\$\{bowlerName\.replace\(\/\\s\+\/g, '_'\)\}`;/, handleSubmit);

const form = `
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
`;

code = code.replace(/<div>\n\s*<label className="text-sm font-bold mb-1 block">Striker Name<\/label>[\s\S]*?onChange=\{e => setBowlerName\(e\.target\.value\)\}\n\s*\/>\n\s*<\/div>/, form);

fs.writeFileSync('src/pages/matches/scoring/InningsSetup.tsx', code);
