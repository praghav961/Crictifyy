const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentPlayoffsTab.tsx', 'utf8');

code = code.replace(/createdAt: now\n\s*\};/g, 'createdAt: now,\n          overs: tournament.overs\n       };');

fs.writeFileSync('src/pages/tournaments/TournamentPlayoffsTab.tsx', code);
