import { useState, useEffect } from 'react';
import { useTournamentStats } from '../../hooks/useTournamentStats';
import { fetchTeamStatsByGroup } from '../../lib/scoring/statsEngine';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TournamentGroup } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export function PointsTableTab({ tournamentId }: { tournamentId: string }) {
    
  const { loading: statsLoading, teams: statsTeams } = useTournamentStats(tournamentId);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupStats, setGroupStats] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchGroupsAndTeams = async () => {
      try {
        const [gSnap, tSnap] = await Promise.all([
           getDocs(collection(db, `tournaments/${tournamentId}/groups`)),
           getDocs(collection(db, `tournaments/${tournamentId}/teams`))
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
    fetchGroupsAndTeams();
  }, [tournamentId]);

  if (statsLoading || loadingGroups) {


    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  
  
  // Merge stats into all teams
  const teams = allTeams.map(t => {
     const stats = statsTeams.find(st => st.id === t.id);
     return {
        ...t,
        matchesPlayed: stats?.matchesPlayed || 0,
        wins: stats?.wins || 0,
        losses: stats?.losses || 0,
        ties: stats?.ties || 0,
        noResults: stats?.noResults || 0,
        points: stats?.points || 0,
        nrr: stats?.nrr || 0,
        runsFor: stats?.runsFor || 0,
        oversFaced: stats?.oversFaced || 0,
        runsAgainst: stats?.runsAgainst || 0,
        oversBowled: stats?.oversBowled || 0
     };
  });

  const renderTable = (teamList: any[], title?: string) => {
     const sorted = [...teamList].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.nrr !== a.nrr) return b.nrr - a.nrr;
        return (a.joinedAt || 0) - (b.joinedAt || 0);
     });


     return (
       <Card className="mb-6 overflow-hidden bg-surface border-border">
         {title && <CardHeader className="bg-surface-hover py-3 border-b border-border"><CardTitle className="text-sm font-bold tracking-widest uppercase">{title}</CardTitle></CardHeader>}
         <div className="flex flex-col lg:flex-row gap-6 p-6">
           <div className="w-full lg:w-2/3 overflow-x-auto border border-border rounded-xl">
           <table className="w-full text-sm text-left">
             <thead className="text-xs text-foreground-muted uppercase bg-surface border-b border-border">
               <tr>
                 <th className="px-4 py-3">Team</th>
                 <th className="px-4 py-3 text-center">Pld</th>
                 <th className="px-4 py-3 text-center text-success">W</th>
                 <th className="px-4 py-3 text-center text-error">L</th>
                 <th className="px-4 py-3 text-center">T</th>
                 <th className="px-4 py-3 text-center">NR</th>
                 <th className="px-4 py-3 text-center font-bold text-primary">Pts</th>
                 <th className="px-4 py-3 text-center">NRR</th>
               </tr>
             </thead>
             <tbody>
               {sorted.map((team, i) => (
                 <tr key={team.id} className="border-b border-border hover:bg-surface-hover/50 bg-surface">
                   <td className="px-4 py-3 font-medium flex items-center gap-2">
                     <span className="text-foreground-muted w-4 font-mono text-xs">{i + 1}</span> 
                     {team.name}
                   </td>
                   <td className="px-4 py-3 text-center">{team.matchesPlayed}</td>
                   <td className="px-4 py-3 text-center text-success">{team.wins}</td>
                   <td className="px-4 py-3 text-center text-error">{team.losses}</td>
                   <td className="px-4 py-3 text-center">{team.ties}</td>
                   <td className="px-4 py-3 text-center">{team.noResults}</td>
                   <td className="px-4 py-3 text-center font-bold text-primary">{team.points}</td>
                   <td className="px-4 py-3 text-center font-mono">
                     {team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}
                   </td>
                 </tr>
               ))}
               {sorted.length === 0 && (
                 <tr><td colSpan={8} className="p-4 text-center text-foreground-muted text-xs">No teams or data available.</td></tr>
               )}
             </tbody>
           </table>
         </div>
         
         <div className="w-full lg:w-1/3 flex flex-col gap-4">
           <div className="h-64 border border-border rounded-xl p-4 bg-surface-hover">
             <h4 className="text-[10px] uppercase tracking-widest text-foreground-muted mb-4 font-bold text-center">Points Overview</h4>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={sorted.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                 <XAxis dataKey="shortName" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: '#2a2d35' }} contentStyle={{ backgroundColor: '#1a1c23', borderColor: '#2a2d35', borderRadius: '8px' }} itemStyle={{ color: '#00e676', fontWeight: 'bold' }} />
                 <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                   {sorted.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index < (sorted[0]?.points > 0 ? 4 : 0) ? '#00e676' : '#2a2d35'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
       </div>
       </Card>
     )
  }

  if (groups.length > 0) {
     return (
        <div>
           {groups.map(g => {
              const groupTeams = groupStats[g.id] || [];
              return (
                 <div key={g.id}>
                    {renderTable(groupTeams, g.name)}
                 </div>
              )
           })}
           
           
        </div>
     );
  }

  return (
    <div>
      {renderTable(teams)}
    </div>
  );
}

