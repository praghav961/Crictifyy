const fs = require('fs');

let f1 = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');
f1 = f1.replace(/tournament\.format === 'Knockout'/g, "tournament.format.includes('Knockout')");
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', f1);

let f2 = fs.readFileSync('src/pages/tournaments/TournamentPlayersTab.tsx', 'utf8');
f2 = f2.replace(/createdAt: Date\.now\(\)/g, "createdAt: Date.now(), updatedAt: Date.now()");
fs.writeFileSync('src/pages/tournaments/TournamentPlayersTab.tsx', f2);

let f3 = fs.readFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', 'utf8');
f3 = f3.replace(/managerId: user\.uid/g, "manager: user.uid");
fs.writeFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', f3);
