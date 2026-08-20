const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentDashboard.tsx', 'utf8');

if (!code.includes('import { syncTournamentEntities }')) {
  code = code.replace(
    "import { TournamentOverviewTab } from './TournamentOverviewTab';",
    "import { TournamentOverviewTab } from './TournamentOverviewTab';\nimport { syncTournamentEntities } from '../../lib/tournamentSync';"
  );
}

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

code = code.replace(/export function TournamentDashboard\(\) \{[\s\S]*?const canManage =/g, (match) => {
   return match.replace("const canManage =", syncCode + "\n  const canManage =");
});

const syncButtonUI = `
                      <div className="pt-4 border-t border-border">
                        <h4 className="font-bold text-sm mb-2 text-warning">Data Integrity</h4>
                        <Button variant="outline" onClick={handleSyncEntities} className="w-full justify-start text-left bg-surface-hover">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">Sync & Repair Data</span>
                            <span className="text-xs text-foreground-muted font-normal mt-1">Fixes broken team, group, and player references</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
`;

code = code.replace(/<\/div>\n\s*<\/CardContent>\n\s*<\/Card>\n\s*<\/TabsContent>\n\s*\)\}\n\s*<\/div>/, syncButtonUI + "\n              </TabsContent>\n            )}\n          </div>");

fs.writeFileSync('src/pages/tournaments/TournamentDashboard.tsx', code);
