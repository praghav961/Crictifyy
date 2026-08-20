import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { TournamentTeam, TournamentGroup, TournamentPlayer, Match } from '../types';

export interface SyncReport {
  fixedGroups: number;
  fixedTeams: number;
  fixedPlayers: number;
  fixedMatches: number;
  logs: string[];
}

export async function syncTournamentEntities(tournamentId: string): Promise<SyncReport> {
  const report: SyncReport = { fixedGroups: 0, fixedTeams: 0, fixedPlayers: 0, fixedMatches: 0, logs: [] };
  
  try {
    const batch = writeBatch(db);
    
    // 1. Fetch all relevant collections
    const teamsSnap = await getDocs(collection(db, `tournaments/${tournamentId}/teams`));
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TournamentTeam);
    const teamIds = new Set(teams.map(t => t.id));

    const groupsSnap = await getDocs(collection(db, `tournaments/${tournamentId}/groups`));
    const groups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TournamentGroup);
    const groupIds = new Set(groups.map(g => g.id));

    const playersSnap = await getDocs(collection(db, `tournaments/${tournamentId}/players`));
    const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TournamentPlayer);

    const { query, where } = await import('firebase/firestore');
    const matchesSnap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId)));
    const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Match);

    // 2. Verify Groups
    groups.forEach(group => {
      let modified = false;
      const validTeamIds = group.teamIds.filter(id => {
        if (!teamIds.has(id)) {
          report.logs.push(`Removed deleted team ${id} from group ${group.name}`);
          modified = true;
          return false;
        }
        return true;
      });
      if (modified) {
        batch.update(doc(db, `tournaments/${tournamentId}/groups`, group.id), { teamIds: validTeamIds });
        report.fixedGroups++;
      }
    });

    // 3. Verify Teams
    teams.forEach(team => {
      if (team.groupId && !groupIds.has(team.groupId)) {
        report.logs.push(`Removed invalid group reference from team ${team.name}`);
        batch.update(doc(db, `tournaments/${tournamentId}/teams`, team.id), { groupId: null });
        report.fixedTeams++;
      }
    });

    // 4. Verify Players
    players.forEach(player => {
      if (!teamIds.has(player.teamId)) {
        report.logs.push(`Player ${player.name} references missing team ${player.teamId}. Removing player.`);
        batch.delete(doc(db, `tournaments/${tournamentId}/players`, player.id));
        report.fixedPlayers++;
      } else if (player.tournamentId !== tournamentId) {
        // Fix missing tournamentId on older player records
        report.logs.push(`Fixed missing tournamentId on player ${player.name}`);
        batch.update(doc(db, `tournaments/${tournamentId}/players`, player.id), { tournamentId });
        report.fixedPlayers++;
      }
    });

    // 5. Verify Matches
    matches.forEach(match => {
      let modified = false;
      const updates: any = {};
      
      if (match.team1Id && match.team1Id !== 'TBD1' && !teamIds.has(match.team1Id)) {
         report.logs.push(`Match ${match.id} references missing team1. Setting to TBD1.`);
         updates.team1Id = 'TBD1';
         updates.team1Name = 'TBD';
         modified = true;
      }
      if (match.team2Id && match.team2Id !== 'TBD2' && !teamIds.has(match.team2Id)) {
         report.logs.push(`Match ${match.id} references missing team2. Setting to TBD2.`);
         updates.team2Id = 'TBD2';
         updates.team2Name = 'TBD';
         modified = true;
      }
      
      if (modified) {
         batch.update(doc(db, 'matches', match.id), updates);
         report.fixedMatches++;
      }
    });

    await batch.commit();
    report.logs.push('Sync completed successfully.');
    
  } catch (error: any) {
    report.logs.push(`Sync failed: ${error.message}`);
  }
  
  return report;
}
