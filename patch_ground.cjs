const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/GroundScoreboard.tsx', 'utf8');

if (!code.includes('PlayerNameResolver')) {
  code = code.replace(/import \{ GroupStandingsWidget \} from '\.\.\/\.\.\/components\/GroupStandingsWidget';/, "import { GroupStandingsWidget } from '../../components/GroupStandingsWidget';\nimport { PlayerNameResolver } from '../../components/PlayerNameResolver';");

  // Remove getBatsmanName function
  code = code.replace(/\s*const getBatsmanName = \(playerId\?: string\) => \{[\s\S]*?return playerId;\n  \};\n/, "");

  code = code.replace(/\{striker\.name \|\| getBatsmanName\(striker\.id\)\}/g, "<PlayerNameResolver playerId={striker.id} fallbackName={striker.name} />");
  code = code.replace(/\{nonStriker\.name \|\| getBatsmanName\(nonStriker\.id\)\}/g, "<PlayerNameResolver playerId={nonStriker.id} fallbackName={nonStriker.name} />");
  code = code.replace(/\{currentBowler\.name \|\| getBatsmanName\(currentBowler\.id\)\}/g, "<PlayerNameResolver playerId={currentBowler.id} fallbackName={currentBowler.name} />");

  fs.writeFileSync('src/pages/matches/GroundScoreboard.tsx', code);
}
