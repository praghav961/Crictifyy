const fs = require('fs');
let code1 = fs.readFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', 'utf8');
code1 = code1.replace(/createdAt: Date\.now\(\)/g, "createdAt: Date.now(), updatedAt: Date.now()");
fs.writeFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', code1);

let code2 = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');
code2 = code2.replace(/tournament\.format\.includes\('Knockout'\)/g, "String(tournament.format).includes('Knockout')");
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code2);
