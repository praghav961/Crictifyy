const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentTeamProfile.tsx', 'utf8');
code = code.replace(
  /catch \(err: any\) \{ console\.error\(err\); alert\('Failed to remove player: ' \+ err\.message\); \} finally \{/g,
  "catch (err: any) { console.error(err); } finally {"
);
fs.writeFileSync('src/pages/tournaments/TournamentTeamProfile.tsx', code);
