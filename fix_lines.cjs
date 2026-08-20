const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// The original file probably looked like:
//        });
//      }
//      
//      const knockouts = ...

// Just fix line 188 and 189 by deleting them.
const lines = code.split('\n');
lines.splice(187, 2); 
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', lines.join('\n'));
