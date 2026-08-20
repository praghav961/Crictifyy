const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const assignLogic = `
  const assignPlayer = async (role: 'STRIKER' | 'NON_STRIKER' | 'BOWLER', nameOrId: string) => {
    if (!nameOrId || !innings || !match.currentInningId) return;
    
    // Check if it's an ID from the dropdowns
    const allPlayers = [...battingPlayers, ...bowlingPlayers];
    const playerObj = allPlayers.find(p => p.id === nameOrId);
    let name = playerObj ? playerObj.id : nameOrId;
    
    const finalName = isImpactPlayer && !playerObj ? \`\${name} (Sub)\` : name;
    const displayName = playerObj ? (isImpactPlayer ? \`\${playerObj.name} (Sub)\` : playerObj.name) : finalName;
    
    // Check if player already exists in the inning by name to avoid duplicate temp IDs
    let tempId = playerObj ? playerObj.id : '';
    
    if (!tempId) {
       if (role === 'STRIKER' || role === 'NON_STRIKER') {
         const existing = Object.values(innings.batterStats).find((b: any) => b.name === displayName || b.id.replace('temp_', '').replace(/_/g, ' ') === finalName || b.id === finalName) as any;
         if (existing) tempId = existing.id;
       } else {
         const existing = Object.values(innings.bowlerStats).find((b: any) => b.name === displayName || b.id.replace('temp_', '').replace(/_/g, ' ') === finalName || b.id === finalName) as any;
         if (existing) tempId = existing.id;
       }
       if (!tempId) tempId = \`temp_\${finalName.replace(/\\s+/g, '_')}\`;
    }
    
    const updates: any = {};
    if (role === 'STRIKER') {
      updates.currentStrikerId = tempId;
      if (!innings.batterStats[tempId]) updates[\`batterStats.\${tempId}\`] = { id: tempId, name: displayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    } else if (role === 'NON_STRIKER') {
      updates.currentNonStrikerId = tempId;
      if (!innings.batterStats[tempId]) updates[\`batterStats.\${tempId}\`] = { id: tempId, name: displayName, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
    } else {
      // Check max overs
      const maxOvers = match.overs ? Math.ceil(match.overs / 5) : 4;
      const bStats = innings.bowlerStats[tempId];
      if (bStats && bStats.overs >= maxOvers) {
        if (!confirm(\`This bowler has already reached their maximum limit of \${maxOvers} overs. Continue anyway?\`)) {
          return;
        }
      }
      updates.currentBowlerId = tempId;
      if (!innings.bowlerStats[tempId]) updates[\`bowlerStats.\${tempId}\`] = { id: tempId, name: displayName, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 };
    }
`;

code = code.replace(/const assignPlayer = async \(role: 'STRIKER' \| 'NON_STRIKER' \| 'BOWLER', nameOrId: string\) => \{[\s\S]*?noBalls: 0, dots: 0 \};\n\s*\}/, assignLogic.trim());

// Render names safely
code = code.replace(/\{striker\.id\.replace\('temp_', ''\)\.replace\(\/_\\\/g, ' '\)\} \*/g, "{striker.name || striker.id.replace('temp_', '').replace(/_/g, ' ')} *");
code = code.replace(/\{nonStriker\.id\.replace\('temp_', ''\)\.replace\(\/_\\\/g, ' '\)\}/g, "{nonStriker.name || nonStriker.id.replace('temp_', '').replace(/_/g, ' ')}");
code = code.replace(/\{bowler\.id\.replace\('temp_', ''\)\.replace\(\/_\\\/g, ' '\)\} \*/g, "{bowler.name || bowler.id.replace('temp_', '').replace(/_/g, ' ')} *");

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
