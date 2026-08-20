const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/PointsTableTab.tsx', 'utf8');

if (!code.includes('fetchTeamStatsByGroup')) {
  code = code.replace(
    /import \{ useTournamentStats \} from '\.\.\/\.\.\/hooks\/useTournamentStats';/,
    "import { useTournamentStats } from '../../hooks/useTournamentStats';\nimport { fetchTeamStatsByGroup } from '../../lib/scoring/statsEngine';"
  );
  
  // Add groupStats state
  code = code.replace(
    /const \[loadingGroups, setLoadingGroups\] = useState\(true\);/,
    "const [loadingGroups, setLoadingGroups] = useState(true);\n  const [groupStats, setGroupStats] = useState<Record<string, any[]>>({});"
  );
  
  // Update fetchData
  const fetchDataReplacement = `
    const fetchGroupsAndTeams = async () => {
      try {
        const [gSnap, tSnap] = await Promise.all([
           getDocs(collection(db, \`tournaments/\${tournamentId}/groups\`)),
           getDocs(collection(db, \`tournaments/\${tournamentId}/teams\`))
        ]);
        
        const fetchedGroups = gSnap.docs.map(d => d.data() as TournamentGroup).sort((a, b) => a.displayOrder - b.displayOrder);
        setGroups(fetchedGroups);
        
        const fetchedTeams = tSnap.docs.map(d => d.data());
        setAllTeams(fetchedTeams);
        
        // Calculate group-specific stats dynamically
        const statsMap: Record<string, any[]> = {};
        for (const g of fetchedGroups) {
           const stats = await fetchTeamStatsByGroup(tournamentId, g.id);
           const groupBaseTeams = fetchedTeams.filter(t => g.teamIds?.includes(t.id));
           
           const finalGroupTeams = groupBaseTeams.map(t => {
              const st = stats.find(s => s.id === t.id);
              if (st) {
                 return {
                    ...t,
                    matchesPlayed: st.matchesPlayed,
                    wins: st.wins,
                    losses: st.losses,
                    ties: st.ties,
                    noResults: st.noResults,
                    points: st.points,
                    nrr: st.nrr
                 };
              }
              return { ...t, matchesPlayed: 0, wins: 0, losses: 0, ties: 0, noResults: 0, points: 0, nrr: 0 };
           });
           
           statsMap[g.id] = finalGroupTeams;
        }
        setGroupStats(statsMap);
      } catch(e) {
        console.error(e);
      } finally {
        setLoadingGroups(false);
      }
    };
  `;
  code = code.replace(/const fetchGroupsAndTeams = async \(\) => \{[\s\S]*?fetchGroupsAndTeams\(\);/, fetchDataReplacement.trim() + '\n    fetchGroupsAndTeams();');

  // Update mapping to use groupStats
  code = code.replace(
    /const groupTeams = teams\.filter\(t => g\.teamIds\.includes\(t\.id\)\);/,
    "const groupTeams = groupStats[g.id] || [];"
  );

  fs.writeFileSync('src/pages/tournaments/PointsTableTab.tsx', code);
}
