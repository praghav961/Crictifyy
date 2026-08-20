const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

// Need to calculate match result text when ending 2nd inning
const calcResultCode = `
    const batch = writeBatch(db);
    batch.update(doc(db, 'matches', match.id, 'innings', match.currentInningId), { status: 'COMPLETED' });
    
    if (innings.inningId.startsWith('inning_2_')) {
      // Calculate Result
      let resultText = '';
      if (innings.targetRuns) {
        if (innings.totalRuns >= innings.targetRuns) {
          const wicketsRemaining = 10 - innings.totalWickets;
          resultText = \`\${match.team2Name} won by \${wicketsRemaining} wickets\`;
        } else if (innings.totalRuns === innings.targetRuns - 1) {
          resultText = 'Match Tied';
        } else {
          const runsShort = (innings.targetRuns - 1) - innings.totalRuns;
          resultText = \`\${match.team1Name} won by \${runsShort} runs\`;
        }
      } else {
         resultText = 'Match Completed'; // Fallback
      }

      batch.update(doc(db, 'matches', match.id), { status: 'COMPLETED', result: resultText });
      logAudit(auth.currentUser?.uid || '', 'MATCH_FINALIZED', { matchId: match.id, metadata: { result: resultText } });
    } else {
      batch.update(doc(db, 'matches', match.id), { currentInningId: '' });
    }
`;

code = code.replace(/const batch = writeBatch\(db\);\n\s*batch\.update.*?status: 'COMPLETED' \}\);\n\s*if \(innings\.inningId\.startsWith\('inning_2_'\)\) \{[\s\S]*?\} else \{[\s\S]*?\}/, calcResultCode);

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
