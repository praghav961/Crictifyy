const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

const replacement = `
      // Generate League matches
      const format = tournament.format || 'Round Robin';
      const shouldGenerateLeague = format !== 'Custom' && format !== 'Knockout';
      
      if (shouldGenerateLeague) {
        Object.entries(teamsByGroup).forEach(([groupName, groupTeams]) => {
          if (groupTeams.length < 2) return; // Cannot generate matches for groups with < 2 teams
          
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              const t1 = groupTeams[i];
              const t2 = groupTeams[j];
              
              // Check for duplicate
              const exists = matches.some(m => 
                (m.team1Id === t1.id && m.team2Id === t2.id) || 
                (m.team1Id === t2.id && m.team2Id === t1.id)
              );
              
              if (!exists) {
                newMatches.push({
                  id: uuidv4(),
                  tournamentId: tournament.id,
                  matchType: groupName === 'Default' ? 'League Match' : \`\${groupName} - Match\`,
                  groupId: groupName !== 'Default' ? groupName : undefined,
                  team1Id: t1.id,
                  team2Id: t2.id,
                  team1Name: t1.name,
                  team2Name: t2.name,
                  team1ShortName: t1.shortName,
                  team2ShortName: t2.shortName,
                  team1Logo: t1.logoUrl || null,
                  team2Logo: t2.logoUrl || null,
                  status: 'UPCOMING',
                  scheduledAt: baseDate + (newMatches.length * 86400000), // Add a day for each
                  createdAt: now
                });
              }
            }
          }
        });
      }

      // If no league matches generated because groups are too small, but we have multiple groups,
      // maybe generate inter-group matches? Or just alert clearly.
`;

code = code.replace(/\/\/ Generate League matches[\s\S]*?(?=\/\/ Generate Placeholders for Knockouts)/, replacement);

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
