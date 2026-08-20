const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/InningsSetup.tsx', 'utf8');

const oldLogic = `
      const strikerId = battingPlayers.find(p => p.id === strikerName) ? strikerName : \`temp_\${strikerName.replace(/\\s+/g, '_')}\`;
      const nonStrikerId = battingPlayers.find(p => p.id === nonStrikerName) ? nonStrikerName : \`temp_\${nonStrikerName.replace(/\\s+/g, '_')}\`;
      const bowlerId = bowlingPlayers.find(p => p.id === bowlerName) ? bowlerName : \`temp_\${bowlerName.replace(/\\s+/g, '_')}\`;
      
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
          [strikerId]: { id: strikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false },
          [nonStrikerId]: { id: nonStrikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }
        },
        bowlerStats: {
          [bowlerId]: { id: bowlerId, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 }
        },
`;

const newLogic = `
      const strikerObj = battingPlayers.find(p => p.id === strikerName);
      const strikerId = strikerObj ? strikerName : \`temp_\${strikerName.replace(/\\s+/g, '_')}\`;
      const strikerDisplayName = strikerObj ? strikerObj.name : strikerName;
      
      const nonStrikerObj = battingPlayers.find(p => p.id === nonStrikerName);
      const nonStrikerId = nonStrikerObj ? nonStrikerName : \`temp_\${nonStrikerName.replace(/\\s+/g, '_')}\`;
      const nonStrikerDisplayName = nonStrikerObj ? nonStrikerObj.name : nonStrikerName;
      
      const bowlerObj = bowlingPlayers.find(p => p.id === bowlerName);
      const bowlerId = bowlerObj ? bowlerName : \`temp_\${bowlerName.replace(/\\s+/g, '_')}\`;
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
`;

code = code.replace(/const strikerId = battingPlayers\.find[\s\S]*?wides: 0, noBalls: 0, dots: 0 \}\n\s*\},/, newLogic.trim());

fs.writeFileSync('src/pages/matches/scoring/InningsSetup.tsx', code);
