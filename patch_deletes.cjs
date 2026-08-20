const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // generic regex to catch onClick={() => handleSomething(args)}
  // but we can be more specific to ensure safety
  code = code.replace(/onClick=\{\(\) => (handleDeleteSponsor\([^)]+\))}/g, "onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1; }}");
  code = code.replace(/onClick=\{\(\) => (handleRemoveMatch\([^)]+\))}/g, "onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1; }}");
  code = code.replace(/onClick=\{\(\) => (handleRemoveTeam\([^)]+\))}/g, "onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1; }}");
  code = code.replace(/onClick=\{\(\) => (handleRemoveGroup\([^)]+\))}/g, "onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1; }}");
  code = code.replace(/onClick=\{\(\) => (handleRemoveTeamFromGroup\([^)]+\))}/g, "onClick={(e) => { e.preventDefault(); e.stopPropagation(); $1; }}");

  fs.writeFileSync(filepath, code);
}

patchFile('src/pages/tournaments/TournamentDashboard.tsx');
patchFile('src/pages/tournaments/TournamentMatchesTab.tsx');
patchFile('src/pages/tournaments/TournamentTeamsTab.tsx');
patchFile('src/pages/tournaments/TournamentGroupsTab.tsx');

console.log("Patched all files.");
