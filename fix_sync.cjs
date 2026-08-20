const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentDashboard.tsx', 'utf8');

const syncCode = `
  const handleSyncEntities = async () => {
    if (!tournament) return;
    if (!window.confirm('This will verify and repair internal references between Groups, Teams, Players, and Matches. Proceed?')) return;
    
    try {
      const report = await syncTournamentEntities(tournament.id);
      alert(\`Sync Complete!\\nFixed Groups: \${report.fixedGroups}\\nFixed Teams: \${report.fixedTeams}\\nFixed Players: \${report.fixedPlayers}\\nFixed Matches: \${report.fixedMatches}\\n\\nLogs:\\n\${report.logs.join('\\n')}\`);
    } catch (e: any) {
      alert('Error during sync: ' + e.message);
    }
  };
`;

if (!code.includes('const handleSyncEntities')) {
    code = code.replace("const isHostOrAdmin =", syncCode + "\n  const isHostOrAdmin =");
    fs.writeFileSync('src/pages/tournaments/TournamentDashboard.tsx', code);
}
