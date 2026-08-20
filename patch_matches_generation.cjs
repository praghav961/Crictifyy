const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// 1. Add groups state
code = code.replace(
  /const \[tournamentTeams, setTournamentTeams\] = useState<TournamentTeam\[\]>\(\[\]\);/,
  "const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);\n  const [groups, setGroups] = useState<any[]>([]);"
);

// 2. Load groups in loadMatches
code = code.replace(
  /const tSnap = await getDocs\(collection\(db, \`tournaments\/\$\{tournament\.id\}\/teams\`\)\);\n\s*setTournamentTeams\(tSnap\.docs\.map\(d => d\.data\(\) as TournamentTeam\)\);/,
  `const tSnap = await getDocs(collection(db, \`tournaments/\${tournament.id}/teams\`));
      setTournamentTeams(tSnap.docs.map(d => d.data() as TournamentTeam));
      
      const gSnap = await getDocs(collection(db, \`tournaments/\${tournament.id}/groups\`));
      setGroups(gSnap.docs.map(d => d.data()).sort((a, b) => a.displayOrder - b.displayOrder));`
);

// 3. Rewrite generateFixtures
const generateLogic = `
  const generateFixtures = async () => {
    if (tournamentTeams.length < 2) {
      alert('Need at least 2 teams to generate fixtures.');
      return;
    }
    
    setGenerating(true);
    try {
      const newMatches: Match[] = [];
      const now = Date.now();
      const baseDate = tournament.startDate || now;
      
      const format = tournament.format || 'Round Robin';
      const shouldGenerateLeague = format !== 'Custom' && format !== 'Knockout';
      const isDouble = format === 'Double Round Robin';
      
      let teamsByGroup: Record<string, TournamentTeam[]> = {};
      
      if (groups.length > 0) {
         groups.forEach(g => {
            const gTeams = tournamentTeams.filter(t => g.teamIds.includes(t.id));
            // Sort teams by joinedAt to assign them sequential numbers consistently
            gTeams.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
            teamsByGroup[g.id] = gTeams;
         });
      } else {
         const allTeams = [...tournamentTeams].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
         teamsByGroup['Default'] = allTeams;
      }
      
      if (shouldGenerateLeague) {
        let matchOffset = 0;
        
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
                  newMatches.push({
                    id: uuidv4(),
                    tournamentId: tournament.id,
                    matchType: groupName === 'Default' ? 'League Match' : \`\${groupName} - Match\`,
                    groupId: groupName !== 'Default' ? groupId : undefined,
                    team1Id: home.id,
                    team2Id: away.id,
                    team1Name: home.name,
                    team2Name: away.name,
                    team1ShortName: home.shortName,
                    team2ShortName: away.shortName,
                    team1Logo: home.logoUrl || undefined,
                    team2Logo: away.logoUrl || undefined,
                    status: 'UPCOMING',
                    scheduledAt: baseDate + (matchOffset * 86400000), // Stagger days
                    createdAt: now,
                    overs: tournament.overs
                  });
                  matchOffset++;
                  
                  if (isDouble) {
                    newMatches.push({
                      id: uuidv4(),
                      tournamentId: tournament.id,
                      matchType: groupName === 'Default' ? 'League Match (Reverse)' : \`\${groupName} - Match (Reverse)\`,
                      groupId: groupName !== 'Default' ? groupId : undefined,
                      team1Id: away.id,
                      team2Id: home.id,
                      team1Name: away.name,
                      team2Name: home.name,
                      team1ShortName: away.shortName,
                      team2ShortName: home.shortName,
                      team1Logo: away.logoUrl || undefined,
                      team2Logo: home.logoUrl || undefined,
                      status: 'UPCOMING',
                      scheduledAt: baseDate + ((matchOffset + totalRounds * matchesPerRound) * 86400000), // Put reverse fixtures later
                      createdAt: now,
                      overs: tournament.overs
                    });
                  }
                }
             }
          }
        });
      }
      
      const knockouts = ['Quarter Final 1', 'Quarter Final 2', 'Quarter Final 3', 'Quarter Final 4', 'Semi Final 1', 'Semi Final 2', 'Final'];
      if (format === 'Knockout') {
        knockouts.forEach((ko, index) => {
          if (!matches.some(m => m.matchType === ko)) {
            newMatches.push({
              id: uuidv4(),
              tournamentId: tournament.id,
              matchType: ko,
              team1Id: 'TBD1',
              team2Id: 'TBD2',
              team1Name: 'TBD',
              team2Name: 'TBD',
              status: 'UPCOMING',
              scheduledAt: baseDate + ((matches.length + newMatches.length + index) * 86400000),
              createdAt: now,
              overs: tournament.overs
            });
          }
        });
      }

      if (newMatches.length === 0) {
        alert('No new fixtures to generate. All combinations exist.');
        setGenerating(false);
        return;
      }
      
      const valResult = validateFixtures(newMatches, matches);
      setValidation(valResult);
      setPreviewMatches(newMatches);
      setShowPreview(true);
      
    } catch (err) {
      console.error(err);
      alert('Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };
`;

code = code.replace(/const generateFixtures = async \(\) => \{[\s\S]*?finally \{\n\s*setGenerating\(false\);\n\s*\}\n\s*\};/, generateLogic);

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
