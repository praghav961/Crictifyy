const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentDashboard.tsx', 'utf8');

code = code.replace(/bg-\[#1a1c23\]/g, 'bg-surface');
code = code.replace(/border-\[#2a2d35\]/g, 'border-border');
code = code.replace(/data-\[state=active\]:bg-\[#00e676\]\/10/g, 'data-[state=active]:bg-primary/10');
code = code.replace(/data-\[state=active\]:text-\[#00e676\]/g, 'data-[state=active]:text-primary');

fs.writeFileSync('src/pages/tournaments/TournamentDashboard.tsx', code);
