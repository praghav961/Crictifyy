const fs = require('fs');
let code = fs.readFileSync('src/lib/scoring/statsEngine.ts', 'utf8');

// We want to add an export function fetchTeamStatsByGroup(tournamentId: string, groupId: string)
// which basically does what fetchTeamStats does but filters matches by groupId.
// Actually, to avoid N+1 queries being duplicated, we can just fetch all and filter in memory.

code += `
export async function fetchTeamStatsByGroup(tournamentId: string, groupId: string) {
  const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
  const { db } = await import('../firebase');
  
  const tDoc = await getDoc(doc(db, 'tournaments', tournamentId));
  const tData = tDoc.data();
  const playersPerTeam = tData?.playersPerTeam || 11;
  
  const matchesQ = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), where('groupId', '==', groupId));
  const matchesSnap = await getDocs(matchesQ);
  const matches: Match[] = [];
  matchesSnap.forEach(d => matches.push({ id: d.id, ...d.data() } as Match));
  
  const teamsQ = query(collection(db, 'teams'), where('tournamentId', '==', tournamentId));
  const teamsSnap = await getDocs(teamsQ);
  const teamNames: Record<string, string> = {};
  teamsSnap.forEach(d => {
     teamNames[d.id] = d.data().name || d.data().shortName;
  });
  
  const teamMap: Record<string, TeamStats & { runsFor: number, oversFaced: number, runsAgainst: number, oversBowled: number }> = {};
  
  const initTeam = (id: string, name: string) => {
    if (!teamMap[id]) {
      teamMap[id] = { 
        id, 
        name: teamNames[id] || name, 
        matchesPlayed: 0, wins: 0, losses: 0, ties: 0, noResults: 0, points: 0, nrr: 0,
        runsFor: 0, oversFaced: 0, runsAgainst: 0, oversBowled: 0
      };
    }
    return teamMap[id];
  }
  
  for (const match of matches) {
    if (match.status !== 'COMPLETED' && match.status !== 'ABANDONED') continue;
    
    const t1 = initTeam(match.team1Id, match.team1Name || match.team1ShortName || match.team1Id);
    const t2 = initTeam(match.team2Id, match.team2Name || match.team2ShortName || match.team2Id);
    
    if (match.status === 'ABANDONED' || match.result?.toLowerCase().includes('abandoned') || match.result?.toLowerCase().includes('no result')) {
      t1.matchesPlayed += 1; t2.matchesPlayed += 1;
      t1.noResults += 1; t2.noResults += 1;
      t1.points += 1; t2.points += 1;
      continue;
    }
    
    const inningsSnap = await getDocs(collection(db, \`matches/\${match.id}/innings\`));
    const innings: InningsState[] = [];
    inningsSnap.forEach(d => innings.push(d.data() as InningsState));
    
    innings.sort((a, b) => a.inningId.localeCompare(b.inningId));
    if (innings.length === 0) continue;
    
    const mainInnings = innings.filter(i => !i.inningId.includes('super_over') && i.maxOvers !== 1).slice(0, 2);
    if (mainInnings.length === 0) continue;
    
    let t1Runs = 0; let t2Runs = 0;
    let t1OversFaced = 0; let t2OversFaced = 0;
    
    for (const inn of mainInnings) {
       const isT1 = inn.teamId === match.team1Id;
       const runs = inn.totalRuns || 0;
       const wickets = inn.totalWickets || 0;
       let overs = inn.completedOvers + ((inn.currentOverBalls || 0) / 6);
       
       const maxOvers = inn.maxOvers || match.overs || 20;
       if (wickets >= (playersPerTeam - 1)) {
          overs = maxOvers;
       }
       
       if (isT1) {
          t1Runs += runs; t1OversFaced += overs;
       } else {
          t2Runs += runs; t2OversFaced += overs;
       }
    }
    
    t1.runsFor += t1Runs; t1.oversFaced += t1OversFaced; t1.runsAgainst += t2Runs; t1.oversBowled += t2OversFaced;
    t2.runsFor += t2Runs; t2.oversFaced += t2OversFaced; t2.runsAgainst += t1Runs; t2.oversBowled += t1OversFaced;
    
    t1.matchesPlayed += 1; t2.matchesPlayed += 1;
    
    const resultText = (match.result || '').toLowerCase();
    const tie = resultText.includes('tie') || resultText.includes('tied');
    const t1Won = resultText.includes(t1.name.toLowerCase()) || resultText.includes(match.team1Id.toLowerCase());
    const t2Won = resultText.includes(t2.name.toLowerCase()) || resultText.includes(match.team2Id.toLowerCase());
    
    if (tie && !t1Won && !t2Won) {
       t1.ties += 1; t2.ties += 1; t1.points += 1; t2.points += 1;
    } else if (t1Won) {
       t1.wins += 1; t2.losses += 1; t1.points += 2;
    } else if (t2Won) {
       t2.wins += 1; t1.losses += 1; t2.points += 2;
    } else {
       if (t1Runs > t2Runs) {
         t1.wins += 1; t2.losses += 1; t1.points += 2;
       } else if (t2Runs > t1Runs) {
         t2.wins += 1; t1.losses += 1; t2.points += 2;
       } else {
         t1.ties += 1; t2.ties += 1; t1.points += 1; t2.points += 1;
       }
    }
  }
  
  return Object.values(teamMap).map(t => {
     const nrrFor = t.oversFaced > 0 ? (t.runsFor / t.oversFaced) : 0;
     const nrrAgainst = t.oversBowled > 0 ? (t.runsAgainst / t.oversBowled) : 0;
     t.nrr = nrrFor - nrrAgainst;
     return t;
  });
}
`;

fs.writeFileSync('src/lib/scoring/statsEngine.ts', code);
