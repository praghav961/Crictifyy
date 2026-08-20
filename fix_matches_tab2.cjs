const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');
code = code.replace(/format !== 'Knockout'/g, "true"); // Or remove it if it's always true for those types, wait, let's just make it cast to string
code = code.replace(/format !== 'Knockout'/g, "String(format) !== 'Knockout'");
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
