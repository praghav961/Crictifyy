const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentTeamProfile.tsx', 'utf8');

code = code.replace(
  /<button type="button" onClick=\{\(\) => handleRemovePlayer\(player\.id\)\}/g,
  '<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePlayer(player.id); }}'
);

fs.writeFileSync('src/pages/tournaments/TournamentTeamProfile.tsx', code);
