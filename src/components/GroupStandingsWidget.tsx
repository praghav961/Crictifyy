import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TournamentGroup, TournamentTeam } from '../types';
import { fetchTeamStatsByGroup } from '../lib/scoring/statsEngine';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Props {
  tournamentId: string;
  groupId?: string;
}

export function GroupStandingsWidget({ tournamentId, groupId }: Props) {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [groupStats, setGroupStats] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    
    const fetchData = async () => {
      try {
        const [gSnap, tSnap] = await Promise.all([
          getDocs(collection(db, `tournaments/${tournamentId}/groups`)),
          getDocs(collection(db, `tournaments/${tournamentId}/teams`))
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

    fetchData();
  }, [tournamentId, groupId]);

  if (loading) return null;
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const groupTeams = groupStats[group.id] || [];
        const sorted = [...groupTeams].sort((a, b) => {
          if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
          if (b.nrr !== a.nrr) return (b.nrr || 0) - (a.nrr || 0);
          return (a.joinedAt || 0) - (b.joinedAt || 0);
        });

        const qualSlots = group.qualificationSlots || 2;

        return (
          <Card key={group.id} className="overflow-hidden bg-surface border-border">
            <CardHeader className="py-2 bg-surface-hover border-b border-border">
              <CardTitle className="text-xs uppercase tracking-wider">{group.name} Standings</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-xs text-left min-w-[300px]">
                <thead className="text-[10px] text-foreground-muted uppercase bg-surface border-b border-border">
                  <tr>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center font-bold text-primary">Pts</th>
                    <th className="px-2 py-2 text-center">NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((team, i) => {
                    const isQualifying = i < qualSlots;
                    return (
                      <tr key={team.id} className={`border-b border-border/50 hover:bg-surface-hover/50 ${isQualifying ? 'bg-primary/5' : 'bg-surface'}`}>
                        <td className="px-3 py-2 font-medium flex items-center gap-2 whitespace-nowrap">
                          <span className={`w-4 font-mono text-[10px] ${isQualifying ? 'text-primary font-bold' : 'text-foreground-muted'}`}>{i + 1}</span>
                          {team.name}
                          {isQualifying && <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded uppercase">Q</span>}
                        </td>
                        <td className="px-2 py-2 text-center">{team.played || 0}</td>
                        <td className="px-2 py-2 text-center text-success">{team.won || 0}</td>
                        <td className="px-2 py-2 text-center text-error">{team.lost || 0}</td>
                        <td className="px-2 py-2 text-center font-bold text-primary">{team.points || 0}</td>
                        <td className="px-2 py-2 text-center font-mono">
                          {(team.nrr || 0) > 0 ? '+' : ''}{(team.nrr || 0).toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} className="p-3 text-center text-foreground-muted text-xs">No teams</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
