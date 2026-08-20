const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

const replacement = `
      if (shouldGenerateLeague) {
        let allGroupMatches: { normal: any[], reverse: any[] }[] = [];

        Object.entries(teamsByGroup).forEach(([groupId, groupTeams]) => {
          if (groupTeams.length < 2) return;
          
          const groupName = groups.find(g => g.id === groupId)?.name || 'Default';
          
          // Standard Round Robin Circle Method
          const numTeams = groupTeams.length;
          const isOdd = numTeams % 2 !== 0;
          const teamsArr = [...groupTeams];
          
          if (isOdd) {
             teamsArr.push({ id: 'BYE', name: 'BYE' } as any); // Dummy bye team
          }
          
          const totalRounds = teamsArr.length - 1;
          const matchesPerRound = teamsArr.length / 2;
          
          const groupNormal = [];
          const groupReverse = [];

          for (let round = 0; round < totalRounds; round++) {
             for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
                const homeIdx = (round + matchIdx) % (teamsArr.length - 1);
                let awayIdx = (teamsArr.length - 1 - matchIdx + round) % (teamsArr.length - 1);
                
                if (matchIdx === 0) {
                   awayIdx = teamsArr.length - 1; // Last team stays stationary
                }
                
                const t1 = teamsArr[homeIdx];
                const t2 = teamsArr[awayIdx];
                
                if (t1.id === 'BYE' || t2.id === 'BYE') continue; // Skip byes
                
                // Swap home/away for even rounds for the stationary team to alternate
                let home = t1;
                let away = t2;
                if (matchIdx === 0 && round % 2 !== 0) {
                   home = t2;
                   away = t1;
                }

                const exists = matches.some(m => 
                   (m.team1Id === home.id && m.team2Id === away.id) || 
                   (m.team1Id === away.id && m.team2Id === home.id)
                );
                
                if (!exists) {
                  groupNormal.push({
                    id: uuidv4(),
                    tournamentId: tournament.id,
                    matchType: groupName === 'Default' ? 'League Match' : \`\${groupName} - Match\`,
                    groupId: groupName !== 'Default' ? groupId: null,
                    team1Id: home.id,
                    team2Id: away.id,
                    team1Name: home.name,
                    team2Name: away.name,
                    team1ShortName: home.shortName,
                    team2ShortName: away.shortName,
                    team1Logo: home.logoUrl || null,
                    team2Logo: away.logoUrl || null,
                    status: 'UPCOMING',
                    scheduledAt: 0, // Set later
                    createdAt: now,
                    overs: tournament.overs
                  });
                  
                  if (isDouble) {
                    groupReverse.push({
                      id: uuidv4(),
                      tournamentId: tournament.id,
                      matchType: groupName === 'Default' ? 'League Match (Reverse)' : \`\${groupName} - Match (Reverse)\`,
                      groupId: groupName !== 'Default' ? groupId: null,
                      team1Id: away.id,
                      team2Id: home.id,
                      team1Name: away.name,
                      team2Name: home.name,
                      team1ShortName: away.shortName,
                      team2ShortName: home.shortName,
                      team1Logo: away.logoUrl || null,
                      team2Logo: home.logoUrl || null,
                      status: 'UPCOMING',
                      scheduledAt: 0, // Set later
                      createdAt: now,
                      overs: tournament.overs
                    });
                  }
                }
             }
          }
          allGroupMatches.push({ normal: groupNormal, reverse: groupReverse });
        });

        // Interleave matches across groups
        let matchOffset = 0;
        
        // 1. Interleave normal matches
        let maxNormal = Math.max(...allGroupMatches.map(g => g.normal.length), 0);
        for (let i = 0; i < maxNormal; i++) {
           for (let g = 0; g < allGroupMatches.length; g++) {
               if (i < allGroupMatches[g].normal.length) {
                   const m = allGroupMatches[g].normal[i];
                   m.scheduledAt = baseDate + (matchOffset * 86400000);
                   newMatches.push(m);
                   matchOffset++;
               }
           }
        }
        
        // 2. Interleave reverse matches
        let maxReverse = Math.max(...allGroupMatches.map(g => g.reverse.length), 0);
        for (let i = 0; i < maxReverse; i++) {
           for (let g = 0; g < allGroupMatches.length; g++) {
               if (i < allGroupMatches[g].reverse.length) {
                   const m = allGroupMatches[g].reverse[i];
                   m.scheduledAt = baseDate + (matchOffset * 86400000);
                   newMatches.push(m);
                   matchOffset++;
               }
           }
        }
      }
`;

// use a safe regex to replace the entire `if (shouldGenerateLeague) { ... }` block
const regex = /if \(shouldGenerateLeague\) \{[\s\S]*?\}\s*if \(newMatches\.length === 0\)/;
code = code.replace(regex, replacement.trim() + "\n\n      if (newMatches.length === 0)");

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
