const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentOverviewTab.tsx', 'utf8');

code = code.replace(/\\`tournaments\/\\\$\{tournament\.id\}\/teams\\`/g, "`tournaments/${tournament.id}/teams`");
code = code.replace(/\\`tournaments\/\\\$\{tournament\.id\}\/players\\`/g, "`tournaments/${tournament.id}/players`");
code = code.replace(/\\`tournaments\/\\\$\{tournament\.id\}\/sponsors\\`/g, "`tournaments/${tournament.id}/sponsors`");

code = code.replace(/\\\$\{(.+?)\}/g, "${$1}");
code = code.replace(/\\`/g, "`");

fs.writeFileSync('src/pages/tournaments/TournamentOverviewTab.tsx', code);
