const fs = require('fs');
let code = fs.readFileSync('src/lib/scoring/engine.ts', 'utf8');

code = code.replace(/\{ id: event\.strikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false \}/g, "{ id: event.strikerId, name: event.strikerId.replace('temp_', '').replace(/_/g, ' '), runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }");
code = code.replace(/\{ id: event\.nonStrikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false \}/g, "{ id: event.nonStrikerId, name: event.nonStrikerId.replace('temp_', '').replace(/_/g, ' '), runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }");
code = code.replace(/\{ id: event\.bowlerId, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 \}/g, "{ id: event.bowlerId, name: event.bowlerId.replace('temp_', '').replace(/_/g, ' '), overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 }");

fs.writeFileSync('src/lib/scoring/engine.ts', code);
