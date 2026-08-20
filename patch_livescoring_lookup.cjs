const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

if (!code.includes('usePlayerLookup')) {
  code = code.replace(/import \{ addToSyncQueue/g, "import { usePlayerLookup } from '../../../hooks/usePlayerLookup';\nimport { addToSyncQueue");

  const newHooks = `
  const { getPlayerName } = usePlayerLookup(match.tournamentId);
  const [newBatterName, setNewBatterName] = useState('');`;
  
  code = code.replace(/const \[newBatterName, setNewBatterName\] = useState\(''\);/, newHooks);

  code = code.replace(/striker\.name \|\| striker\.id\.replace\('temp_', ''\)\.replace\(\/_\/g, ' '\)/g, "getPlayerName(striker.id, striker.name)");
  code = code.replace(/nonStriker\.name \|\| nonStriker\.id\.replace\('temp_', ''\)\.replace\(\/_\/g, ' '\)/g, "getPlayerName(nonStriker.id, nonStriker.name)");
  code = code.replace(/bowler\.name \|\| bowler\.id\.replace\('temp_', ''\)\.replace\(\/_\/g, ' '\)/g, "getPlayerName(bowler.id, bowler.name)");

  fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
}
