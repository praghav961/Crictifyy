const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\\`/g, "`");
  code = code.replace(/\\\$\{(.+?)\}/g, "${$1}");
  fs.writeFileSync(file, code);
}

fixFile('src/pages/tournaments/TournamentGroupsTab.tsx');
fixFile('src/pages/tournaments/TournamentTeamProfile.tsx');
fixFile('src/pages/tournaments/PointsTableTab.tsx');
fixFile('src/pages/tournaments/TournamentPlayoffsTab.tsx');

