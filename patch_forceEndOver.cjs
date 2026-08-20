const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

code = code.replace(/currentNonStrikerId: innings.currentStrikerId\n\s*\};/, "currentNonStrikerId: innings.currentStrikerId,\n      currentBowlerId: ''\n    };");

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
