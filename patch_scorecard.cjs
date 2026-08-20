const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/tabs/ScorecardTab.tsx', 'utf8');

code = code.replace(/import \{ usePlayerLookup \} from '\.\.\/\.\.\/\.\.\/hooks\/usePlayerLookup';/, "import { PlayerNameResolver } from '../../../components/PlayerNameResolver';");
code = code.replace(/\s*const \{ getPlayerName \} = usePlayerLookup\(match\?\.tournamentId\);/, "");

code = code.replace(/\{getPlayerName\(batter\.id, batter\.name\) \|\| batter\.id\.replace\('temp_', ''\)\.replace\(\/_\/g, ' '\)\}/g, "<PlayerNameResolver playerId={batter.id} fallbackName={batter.name} />");
code = code.replace(/\{getPlayerName\(bowler\.id, bowler\.name\) \|\| bowler\.id\.replace\('temp_', ''\)\.replace\(\/_\/g, ' '\)\}/g, "<PlayerNameResolver playerId={bowler.id} fallbackName={bowler.name} />");

fs.writeFileSync('src/pages/matches/tabs/ScorecardTab.tsx', code);
