const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const importReplacement = `import { doc, onSnapshot, updateDoc, writeBatch, collection, query, orderBy, limit, getDocs, where, getDoc, increment } from 'firebase/firestore';`;
code = code.replace(/import \{ doc, onSnapshot.*\} from 'firebase\/firestore';/, importReplacement);

const newFinalize = `
  const finalizeInnings = async (finalState: InningsState) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', match.id, 'innings', match.currentInningId!), { status: 'COMPLETED' });
    
    if (finalState.inningId.startsWith('inning_2_')) {
      let resultText = '';
      let t1Won = false;
      let t2Won = false;
      let tie = false;

      if (finalState.targetRuns) {
        if (finalState.totalRuns >= finalState.targetRuns) {
          const wicketsRemaining = 10 - finalState.totalWickets;
          resultText = \`\${match.team2Name} won by \${wicketsRemaining} wickets\`;
          t2Won = true;
        } else if (finalState.totalRuns === finalState.targetRuns - 1) {
          resultText = 'Match Tied';
          tie = true;
        } else {
          const runsShort = (finalState.targetRuns - 1) - finalState.totalRuns;
          resultText = \`\${match.team1Name} won by \${runsShort} runs\`;
          t1Won = true;
        }
      } else {
         resultText = 'Match Completed';
      }

      batch.update(doc(db, 'matches', match.id), { status: 'COMPLETED', result: resultText });
      logAudit(auth.currentUser?.uid || '', 'MATCH_FINALIZED', { matchId: match.id, metadata: { result: resultText } });

      // Trigger update to the tournament teams Points Table
      if (match.tournamentId) {
        const t1Ref = doc(db, \`tournaments/\${match.tournamentId}/teams\`, match.team1Id);
        const t2Ref = doc(db, \`tournaments/\${match.tournamentId}/teams\`, match.team2Id);
        
        batch.update(t1Ref, { 
          played: increment(1),
          won: increment(t1Won ? 1 : 0),
          lost: increment(t2Won ? 1 : 0),
          tied: increment(tie ? 1 : 0),
          points: increment(t1Won ? 2 : tie ? 1 : 0)
        });

        batch.update(t2Ref, { 
          played: increment(1),
          won: increment(t2Won ? 1 : 0),
          lost: increment(t1Won ? 1 : 0),
          tied: increment(tie ? 1 : 0),
          points: increment(t2Won ? 2 : tie ? 1 : 0)
        });
      }

    } else {
      batch.update(doc(db, 'matches', match.id), { currentInningId: '' });
    }
    await batch.commit();
  };
`;

code = code.replace(/const finalizeInnings = async \(finalState: InningsState\) => \{[\s\S]*?await batch\.commit\(\);\s*\};/, newFinalize);
fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
