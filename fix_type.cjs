const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(/export type TournamentFormat = 'Single Round Robin' \| 'Double Round Robin' \| 'Group Stage' \| 'Group \+ Knockout' \| 'League \+ Playoffs' \| 'Knockout' \| 'Custom' \| 'Round Robin' \| 'Single Group' \| 'Multiple Groups';/, 
"export type TournamentFormat = 'Single Round Robin' | 'Double Round Robin' | 'Group Stage' | 'Group + Knockout' | 'League + Playoffs' | 'Knockout' | 'Custom' | 'Round Robin' | 'Single Group' | 'Multiple Groups' | 'League + Knockout';");
fs.writeFileSync('src/types.ts', code);
