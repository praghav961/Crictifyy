const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', 'utf8');

// Import TournamentTeamProfile
code = code.replace(/import \{ Tournament, TournamentTeam, Team, User \} from '\.\.\/\.\.\/types';/, "import { Tournament, TournamentTeam, Team, User } from '../../types';\nimport { TournamentTeamProfile } from './TournamentTeamProfile';");

// Remove group selection entirely
code = code.replace(/const \[selectedGroup, setSelectedGroup\] = useState\(''\);\n/, '');

// Remove groupId from newTTeam
code = code.replace(/groupId: selectedGroup \|\| null,/, 'groupId: null,');

// Add drill down state
code = code.replace(/const \[isCreating, setIsCreating\] = useState\(false\);/, "const [isCreating, setIsCreating] = useState(false);\n  const [selectedTeamView, setSelectedTeamView] = useState<TournamentTeam | null>(null);");

// Remove the select group UI for adding existing team
code = code.replace(/\{tournament\.groups && tournament\.groups\.length > 0 && \([\s\S]*?<\/select>\n\s*<\/div>\n\s*\)\}/g, '');

// If selectedTeamView is set, render the profile
const profileRender = `
  if (selectedTeamView) {
    return (
      <TournamentTeamProfile 
        tournament={tournament} 
        team={selectedTeamView} 
        isHostOrAdmin={isHostOrAdmin} 
        user={user}
        onBack={() => setSelectedTeamView(null)} 
      />
    );
  }
`;

code = code.replace(/if \(loading\) return <div className="p-4 text-center">Loading teams\.\.\.<\/div>;/, "if (loading) return <div className=\"p-4 text-center\">Loading teams...</div>;\n" + profileRender);

// Add view button
const viewButton = `
                <div className="flex flex-col gap-1 w-full mt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedTeamView(team)}>Manage Team</Button>
                </div>
`;
code = code.replace(/\{team\.groupId && <span className="text-xs text-primary font-medium">\{team\.groupId\}<\/span>\}\n\s*<\/div>\n\s*<\/div>/g, "</div>\n" + viewButton + "\n              </div>");

fs.writeFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', code);
