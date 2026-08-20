const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/tabs/ScorecardTab.tsx', 'utf8');

if (!code.includes('usePlayerLookup')) {
  code = code.replace(/import \{ Trophy \} from 'lucide-react';/, "import { Trophy } from 'lucide-react';\nimport { usePlayerLookup } from '../../../hooks/usePlayerLookup';");
  
  const newHooks = `
  const { inningsList, match } = props;
  const { getPlayerName } = usePlayerLookup(match?.tournamentId);`;
  
  code = code.replace(/const \{ inningsList \} = props;/, newHooks);
  code = code.replace(/batter\.name/g, "getPlayerName(batter.id, batter.name)");
  code = code.replace(/bowler\.name/g, "getPlayerName(bowler.id, bowler.name)");
  code = code.replace(/fw\.playerOutId/g, "getPlayerName(fw.playerOutId)");

  fs.writeFileSync('src/pages/matches/tabs/ScorecardTab.tsx', code);
}
