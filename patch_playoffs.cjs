const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentPlayoffsTab.tsx', 'utf8');

const logic = `
  const generatePreview = () => {
    let qualifiedTeams: any[] = [];
    
    if (groups.length > 0) {
       groups.forEach(g => {
          const groupTeams = teams.filter(t => g.teamIds.includes(t.id));
          groupTeams.sort((a, b) => {
             if (b.points !== a.points) return b.points - a.points;
             return b.nrr - a.nrr;
          });
          qualifiedTeams.push(...groupTeams.slice(0, g.qualificationSlots || 2));
       });
    } else {
       qualifiedTeams = sortedTeams.slice(0, 4);
    }
    
    if (qualifiedTeams.length < 4) {
      alert("Not enough teams to generate standard playoffs. Need at least 4 teams.");
      return;
    }
    
    const top4 = qualifiedTeams.slice(0, 4);
    
    // Check if Playoffs already exist
    const existingPlayoffs = matches.filter(m => m.matchType === 'Qualifier 1' || m.matchType === 'Eliminator' || m.matchType === 'Qualifier 2' || m.matchType === 'Final');
    if (existingPlayoffs.length > 0) {
      if (!window.confirm("Playoff matches already exist. Are you sure you want to regenerate them and overwrite current standings in the brackets?")) return;
    }

    const now = Date.now();
    const baseDate = tournament.endDate || now;

    const newMatches: Match[] = [
      {
        id: existingPlayoffs.find(m => m.matchType === 'Qualifier 1')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Qualifier 1',
        team1Id: top4[0].id,
        team2Id: top4[1].id,
        team1Name: top4[0].name,
        team2Name: top4[1].name,
        team1ShortName: top4[0].shortName,
        team2ShortName: top4[1].shortName,
        team1Logo: top4[0].logoUrl,
        team2Logo: top4[1].logoUrl,
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Eliminator')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Eliminator',
        team1Id: top4[2].id,
        team2Id: top4[3].id,
        team1Name: top4[2].name,
        team2Name: top4[3].name,
        team1ShortName: top4[2].shortName,
        team2ShortName: top4[3].shortName,
        team1Logo: top4[2].logoUrl,
        team2Logo: top4[3].logoUrl,
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 2,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Qualifier 2')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Qualifier 2',
        team1Id: 'TBD',
        team2Id: 'TBD',
        team1Name: 'Loser of Qualifier 1',
        team2Name: 'Winner of Eliminator',
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 3,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Final')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Final',
        team1Id: 'TBD',
        team2Id: 'TBD',
        team1Name: 'Winner of Qualifier 1',
        team2Name: 'Winner of Qualifier 2',
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 4,
        createdAt: now,
        overs: tournament.overs
      }
    ];

    setPlayoffMatches(newMatches);
    setShowPreview(true);
  };
`;

code = code.replace(/const generatePreview = \(\) => \{[\s\S]*?setShowPreview\(true\);\n\s*\};/, logic);

fs.writeFileSync('src/pages/tournaments/TournamentPlayoffsTab.tsx', code);
