import { useState, useEffect } from 'react';
import { fetchTournamentStats, fetchTeamStats, AggregateBatterStats, AggregateBowlerStats, AggregateFieldingStats, AggregatePartnership, TeamStats } from '../lib/scoring/statsEngine';

export function useTournamentStats(tournamentId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [batting, setBatting] = useState<AggregateBatterStats[]>([]);
  const [bowling, setBowling] = useState<AggregateBowlerStats[]>([]);
  const [fielding, setFielding] = useState<AggregateFieldingStats[]>([]);
  const [partnerships, setPartnerships] = useState<AggregatePartnership[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);

  const loadStats = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const [stats, tStats] = await Promise.all([
        fetchTournamentStats(tournamentId),
        fetchTeamStats(tournamentId)
      ]);
      setBatting(stats.batting);
      setBowling(stats.bowling);
      setFielding(stats.fielding);
      setPartnerships(stats.partnerships);
      setTeams(tStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [tournamentId]);

  return { loading, batting, bowling, fielding, partnerships, teams, refresh: loadStats };
}
