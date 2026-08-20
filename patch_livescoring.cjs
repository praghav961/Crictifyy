const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

code = code.replace(/import \{ usePlayerLookup \} from '\.\.\/\.\.\/\.\.\/hooks\/usePlayerLookup';/, "import { PlayerNameResolver } from '../../../components/PlayerNameResolver';");
code = code.replace(/const \{ getPlayerName \} = usePlayerLookup\(match\.tournamentId\);\n/, "");

code = code.replace(/\{getPlayerName\(striker\.id, striker\.name\)\}/g, "<PlayerNameResolver playerId={striker.id} fallbackName={striker.name} />");
code = code.replace(/\{getPlayerName\(nonStriker\.id, nonStriker\.name\)\}/g, "<PlayerNameResolver playerId={nonStriker.id} fallbackName={nonStriker.name} />");
code = code.replace(/\{getPlayerName\(bowler\.id, bowler\.name\)\}/g, "<PlayerNameResolver playerId={bowler.id} fallbackName={bowler.name} />");

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
