import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Match } from '../../types';
import { InningsState, BallEvent } from './types';

export interface PlayerScoreBreakdown {
  battingScore: number;
  bowlingScore: number;
  fieldingScore: number;
  matchImpactScore: number;
  winningTeamBonus: number;
  totalScore: number;
  explanation: string;
}

export async function calculatePlayerOfMatch(matchId: string, authorId?: string): Promise<string> {
  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  if (!matchSnap.exists()) throw new Error('Match not found');
  const match = matchSnap.data() as Match;

  const inningsSnap = await getDocs(collection(db, 'matches', matchId, 'innings'));
  const innings: InningsState[] = [];
  inningsSnap.forEach(d => innings.push(d.data() as InningsState));
  innings.sort((a, b) => a.inningId.localeCompare(b.inningId));

  let winningTeamId = '';
  if (innings.length === 2) {
    if (innings[0].totalRuns > innings[1].totalRuns) {
      winningTeamId = innings[0].teamId;
    } else if (innings[1].totalRuns > innings[0].totalRuns) {
      winningTeamId = innings[1].teamId;
    }
  }

  const ballEvents: BallEvent[] = [];
  for (const inn of innings) {
    const ballsSnap = await getDocs(collection(db, 'matches', matchId, 'innings', inn.inningId, 'balls'));
    ballsSnap.forEach(d => ballEvents.push(d.data() as BallEvent));
  }

  const scores: Record<string, PlayerScoreBreakdown> = {};

  const getScore = (playerId: string) => {
    if (!scores[playerId]) {
      scores[playerId] = {
        battingScore: 0,
        bowlingScore: 0,
        fieldingScore: 0,
        matchImpactScore: 0,
        winningTeamBonus: 0,
        totalScore: 0,
        explanation: ''
      };
    }
    return scores[playerId];
  };

  // Batting and Bowling from InningsState
  for (const inn of innings) {
    for (const [playerId, stats] of Object.entries(inn.batterStats)) {
      const s = getScore(playerId);
      let batScore = 0;
      batScore += stats.runs;
      batScore += stats.fours * 1;
      batScore += stats.sixes * 2;
      
      if (stats.runs >= 100) batScore += 25;
      else if (stats.runs >= 50) batScore += 10;
      else if (stats.runs >= 30) batScore += 5;

      if (stats.ballsFaced > 0) {
        const sr = (stats.runs / stats.ballsFaced) * 100;
        if (stats.runs >= 20) {
          if (sr > 200) batScore += 20;
          else if (sr > 150) batScore += 10;
          else if (sr < 80) batScore -= 5;
        }
      }
      
      // Match situation - chase impact
      if (inn.teamId === winningTeamId && inn.targetRuns && stats.runs >= (inn.targetRuns * 0.3)) {
        s.matchImpactScore += 15; // successful chase impact
      }
      
      s.battingScore = batScore;
      
      if (inn.teamId === winningTeamId && !s.winningTeamBonus) {
        s.winningTeamBonus = 20;
      }
    }

    for (const [playerId, stats] of Object.entries(inn.bowlerStats)) {
      const s = getScore(playerId);
      let bowlScore = 0;
      bowlScore += stats.wickets * 20;
      bowlScore += stats.maidens * 10;
      bowlScore += stats.dots * 1;
      
      if (stats.wickets >= 5) bowlScore += 30;
      else if (stats.wickets >= 4) bowlScore += 20;
      else if (stats.wickets >= 3) bowlScore += 10;

      const totalOvers = stats.overs + (stats.balls / 6);
      if (totalOvers >= 2) {
        const econ = stats.runs / totalOvers;
        if (econ < 5) bowlScore += 15;
        else if (econ < 6) bowlScore += 10;
        else if (econ < 7) bowlScore += 5;
        else if (econ > 10) bowlScore -= 5;
      }
      
      // Defending score impact
      const bowlerTeamId = inn.teamId === match.team1Id ? match.team2Id : match.team1Id;
      if (bowlerTeamId === winningTeamId && !s.winningTeamBonus) {
        s.winningTeamBonus = 20;
      }
      
      if (bowlerTeamId === winningTeamId && totalOvers >= 2 && stats.wickets >= 2) {
        s.matchImpactScore += 15; // successful defense impact
      }

      s.bowlingScore = bowlScore;
    }
  }

  // Fielding stats from Ball Events
  for (const ball of ballEvents) {
    if (ball.wickets) {
      for (const w of ball.wickets) {
        if (w.assistIds) {
          for (const assistantId of w.assistIds) {
            const s = getScore(assistantId);
            if (w.type === 'CAUGHT') s.fieldingScore += 10;
            if (w.type === 'RUN_OUT') s.fieldingScore += 15;
            if (w.type === 'STUMPED') s.fieldingScore += 15;
          }
        }
      }
    }
  }

  // Calculate totals
  for (const playerId of Object.keys(scores)) {
    const s = scores[playerId];
    // Check if bowler belongs to winning team (simple assumption: if they got bonus in batting, they already got it)
    s.totalScore = s.battingScore + s.bowlingScore + s.fieldingScore + s.matchImpactScore + s.winningTeamBonus;
  }

  const sortedPlayers = Object.keys(scores).sort((a, b) => scores[b].totalScore - scores[a].totalScore);
  
  if (sortedPlayers.length === 0) {
    return '';
  }

  const bestId = sortedPlayers[0];
  const bestScore = scores[bestId];
  
  const isClose = sortedPlayers.length > 1 && (scores[sortedPlayers[0]].totalScore - scores[sortedPlayers[1]].totalScore <= 10);
  
  let explanation = '';
  if (bestScore.battingScore > bestScore.bowlingScore) {
    explanation = `Outstanding batting performance scoring ${bestScore.battingScore} impact points.`;
  } else if (bestScore.bowlingScore > bestScore.battingScore) {
    explanation = `Exceptional bowling spell securing ${bestScore.bowlingScore} impact points.`;
  } else {
    explanation = `Brilliant all-round contribution across departments.`;
  }
  
  if (isClose) {
    explanation += ' Close performance, edge decided by algorithms.';
  }

  const potmRecord = {
    automaticPlayerId: bestId,
    finalPlayerId: bestId,
    selectedAt: Date.now(),
    explanation,
    isClose
  };
  
  if (authorId) {
     (potmRecord as any).selectedBy = authorId;
  }

  await updateDoc(doc(db, 'matches', matchId), {
    potm: potmRecord
  });

  return bestId;
}
