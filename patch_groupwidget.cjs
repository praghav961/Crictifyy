const fs = require('fs');
let code = fs.readFileSync('src/components/GroupStandingsWidget.tsx', 'utf8');

// We will fetch the group stats in the widget instead of relying on the TournamentTeam document fields.
code = code.replace(
  /import \{ collection, getDocs, query, where \} from 'firebase\/firestore';/,
  "import { collection, getDocs } from 'firebase/firestore';"
);

code = code.replace(
  /import \{ TournamentGroup, TournamentTeam \} from '\.\.\/types';/,
  "import { TournamentGroup, TournamentTeam } from '../types';\nimport { fetchTeamStatsByGroup } from '../lib/scoring/statsEngine';"
);

// We change teams state to hold the computed stats
code = code.replace(
  /const \[teams, setTeams\] = useState<TournamentTeam\[\]>\(\[\]\);/,
  "const [teams, setTeams] = useState<TournamentTeam[]>([]);\n  const [groupStats, setGroupStats] = useState<Record<string, any[]>>({});"
);

// We modify the fetchData to also compute the group stats for each group
const fetchDataReplacement = `
    const fetchData = async () => {
      try {
        const [gSnap, tSnap] = await Promise.all([
          getDocs(collection(db, \`tournaments/\${tournamentId}/groups\`)),
          getDocs(collection(db, \`tournaments/\${tournamentId}/teams\`))
        ]);
        let fetchedGroups = gSnap.docs.map(d => d.data() as TournamentGroup).sort((a, b) => a.displayOrder - b.displayOrder);
        if (groupId) {
          fetchedGroups = fetchedGroups.filter(g => g.id === groupId);
        }
        setGroups(fetchedGroups);
        const fetchedTeams = tSnap.docs.map(d => d.data() as TournamentTeam);
        setTeams(fetchedTeams);
        
        // Calculate group-specific stats dynamically
        const statsMap: Record<string, any[]> = {};
        for (const g of fetchedGroups) {
           const stats = await fetchTeamStatsByGroup(tournamentId, g.id);
           // merge with fetchedTeams to keep names/logos
           const merged = stats.map(st => {
              const baseTeam = fetchedTeams.find(t => t.id === st.id) || {} as any;
              return {
                 ...baseTeam,
                 ...st,
                 // overwrite with dynamically calculated values
                 played: st.matchesPlayed,
                 won: st.wins,
                 lost: st.losses,
                 tied: st.ties,
                 points: st.points,
                 nrr: st.nrr
              };
           });
           
           // Ensure teams that haven't played any matches are still in the list with 0 stats
           const groupBaseTeams = fetchedTeams.filter(t => g.teamIds?.includes(t.id));
           const finalGroupTeams = groupBaseTeams.map(t => {
              const existing = merged.find(m => m.id === t.id);
              if (existing) return existing;
              return { ...t, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0 };
           });
           
           statsMap[g.id] = finalGroupTeams;
        }
        setGroupStats(statsMap);
      } catch (err) {
        console.error("Error fetching standings:", err);
      } finally {
        setLoading(false);
      }
    };
`;
code = code.replace(/const fetchData = async \(\) => \{[\s\S]*?fetchData\(\);/, fetchDataReplacement + '\n    fetchData();');

// update the mapping to use groupStats
code = code.replace(
  /const groupTeams = teams\.filter\(t => group\.teamIds\?\.includes\(t\.id\)\);/,
  "const groupTeams = groupStats[group.id] || [];"
);

fs.writeFileSync('src/components/GroupStandingsWidget.tsx', code);
