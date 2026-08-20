const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');
code = code.replace(/String\(tournament\.format\)\.includes\('Knockout'\)/g, "tournament.format === 'League + Knockout'");
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
