const fs = require('fs');
const files = [
  'src/pages/tournaments/TournamentTeamProfile.tsx',
  'src/pages/tournaments/TournamentPlayersTab.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Make the button type="button", add z-10
  code = code.replace(/<button\s*onClick=\{\(\) => handleRemovePlayer\(player\.id\)\}/g, '<button type="button" onClick={() => handleRemovePlayer(player.id)}');
  code = code.replace(/className="absolute top-2 right-2 p-1/g, 'className="absolute top-2 right-2 p-1 z-10 cursor-pointer');

  // Add alert to catch block
  code = code.replace(/catch \(err\) \{\s*console\.error\(err\);\s*\}/g, "catch (err: any) { console.error(err); alert('Failed to remove player: ' + err.message); }");

  fs.writeFileSync(file, code);
}
