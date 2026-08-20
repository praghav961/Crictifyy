import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Match } from '../../types';
import { InningsState, BallEvent } from './types';

export interface AggregateBatterStats {
  id: string;
  name: string;
  teamId: string;
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  highestScore: number;
  fifties: number;
  hundreds: number;
  timesOut: number;
  average: number;
  strikeRate: number;
}

export interface AggregateBowlerStats {
  id: string;
  name: string;
  teamId: string;
  matches: number;
  innings: number;
  ballsBowled: number; // to calculate exact overs: Math.floor(balls/6) + "." + (balls%6)
  runsConceded: number;
  wickets: number;
  maidens: number;
  dots: number;
  threeWickets: number;
  fourWickets: number;
  fiveWickets: number;
  economy: number;
  average: number;
  strikeRate: number;
}

export interface AggregateFieldingStats {
  id: string;
  name: string;
  teamId: string;
  matches: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissals: number; // total
}

export interface AggregatePartnership {
  player1Name: string;
  player2Name: string;
  runs: number;
  balls: number;
  teamId: string;
  matchId: string;
}

export interface TeamStats {
  id: string;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  noResults: number;
  points: number;
  nrr: number; // Net Run Rate
  runsFor?: number;
  oversFaced?: number;
  runsAgainst?: number;
  oversBowled?: number;
}

export async function fetchTournamentStats(tournamentId: string) {
  // Fetch all matches for the tournament
  const matchesQ = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
  const matchesSnap = await getDocs(matchesQ);
  const matches: Match[] = [];
  matchesSnap.forEach(d => matches.push({ id: d.id, ...d.data() } as Match));

  // Player Map
  // Since we don't have global players yet easily accessible, we might need to get them from teams
  // We'll extract names from temp_ names for now, or fetch them from the teams if needed.
  const getPlayerName = (id: string) => id.replace('temp_', '').replace(/_/g, ' ');

  const batMap: Record<string, AggregateBatterStats> = {};
  const bowlMap: Record<string, AggregateBowlerStats> = {};
  const fieldMap: Record<string, AggregateFieldingStats> = {};
  const partnerships: AggregatePartnership[] = [];
  
  // To track player matches
  const playerMatchesPlayed: Record<string, Set<string>> = {}; 

  const addMatchForPlayer = (playerId: string, matchId: string) => {
    if (!playerMatchesPlayed[playerId]) playerMatchesPlayed[playerId] = new Set();
    playerMatchesPlayed[playerId].add(matchId);
  }

  const initBat = (id: string): AggregateBatterStats => {
    if (!batMap[id]) {
      batMap[id] = {
        id, name: getPlayerName(id), teamId: '', matches: 0, innings: 0, runs: 0,
        ballsFaced: 0, fours: 0, sixes: 0, highestScore: 0,
        fifties: 0, hundreds: 0, timesOut: 0, average: 0, strikeRate: 0
      };
    }
    return batMap[id];
  };

  const initBowl = (id: string): AggregateBowlerStats => {
    if (!bowlMap[id]) {
      bowlMap[id] = {
        id, name: getPlayerName(id), teamId: '', matches: 0, innings: 0, ballsBowled: 0,
        runsConceded: 0, wickets: 0, maidens: 0, dots: 0,
        threeWickets: 0, fourWickets: 0, fiveWickets: 0, economy: 0, average: 0, strikeRate: 0
      };
    }
    return bowlMap[id];
  };

  const initField = (id: string): AggregateFieldingStats => {
    if (!fieldMap[id]) {
      fieldMap[id] = {
        id, name: getPlayerName(id), teamId: '', matches: 0, catches: 0, runOuts: 0, stumpings: 0, dismissals: 0
      };
    }
    return fieldMap[id];
  };

  for (const match of matches) {
    if (match.status !== 'COMPLETED') continue;

    const inningsSnap = await getDocs(collection(db, `matches/${match.id}/innings`));
    const innings: InningsState[] = [];
    inningsSnap.forEach(d => innings.push(d.data() as InningsState));

    for (const inn of innings) {
      // Batting Stats
      for (const [playerId, bs] of Object.entries(inn.batterStats)) {
        addMatchForPlayer(playerId, match.id);
        const s = initBat(playerId);
        s.innings += 1;
        s.runs += bs.runs;
        s.ballsFaced += bs.ballsFaced;
        s.fours += bs.fours;
        s.sixes += bs.sixes;
        if (bs.runs > s.highestScore) s.highestScore = bs.runs;
        if (bs.runs >= 100) s.hundreds += 1;
        else if (bs.runs >= 50) s.fifties += 1;
        if (bs.isOut) s.timesOut += 1;
        s.teamId = inn.teamId; // roughly
      }

      // Bowling Stats
      for (const [playerId, bs] of Object.entries(inn.bowlerStats)) {
        addMatchForPlayer(playerId, match.id);
        const s = initBowl(playerId);
        s.innings += 1;
        s.ballsBowled += (bs.overs * 6) + bs.balls;
        s.runsConceded += bs.runs;
        s.wickets += bs.wickets;
        s.maidens += bs.maidens;
        s.dots += bs.dots;
        if (bs.wickets >= 5) s.fiveWickets += 1;
        else if (bs.wickets === 4) s.fourWickets += 1;
        else if (bs.wickets === 3) s.threeWickets += 1;
        
        // roughly teamId is the opponent of inn.teamId
        s.teamId = inn.teamId === match.team1Id ? match.team2Id : match.team1Id;
      }

      // Fielding Stats (from balls)
      const ballsSnap = await getDocs(collection(db, `matches/${match.id}/innings/${inn.inningId}/balls`));
      const balls = ballsSnap.docs.map(d => d.data() as BallEvent).sort((a, b) => a.timestamp - b.timestamp);
      
      let p1 = '';
      let p2 = '';
      let pRuns = 0;
      let pBalls = 0;

      const savePartnership = () => {
        if ((p1 || p2) && pRuns > 0) {
          partnerships.push({
            player1Name: getPlayerName(p1),
            player2Name: getPlayerName(p2),
            runs: pRuns,
            balls: pBalls,
            teamId: inn.teamId,
            matchId: match.id
          });
        }
      };

      for (const ball of balls) {
        // Init partnership players
        if (!p1 && !p2) {
          p1 = ball.strikerId;
          p2 = ball.nonStrikerId;
        } else if (p1 !== ball.strikerId && p1 !== ball.nonStrikerId && p2 !== ball.strikerId && p2 !== ball.nonStrikerId) {
           // Somehow both changed, save and reset
           savePartnership();
           p1 = ball.strikerId;
           p2 = ball.nonStrikerId;
           pRuns = 0; pBalls = 0;
        } else if (p1 !== ball.strikerId && p1 !== ball.nonStrikerId) {
           // p1 is out
           savePartnership();
           p1 = ball.strikerId === p2 ? ball.nonStrikerId : ball.strikerId;
           pRuns = 0; pBalls = 0;
        } else if (p2 !== ball.strikerId && p2 !== ball.nonStrikerId) {
           // p2 is out
           savePartnership();
           p2 = ball.strikerId === p1 ? ball.nonStrikerId : ball.strikerId;
           pRuns = 0; pBalls = 0;
        }

        // Add runs to partnership
        let ballRuns = ball.runs;
        if (ball.extras) {
           ballRuns += ball.extras.reduce((acc, e) => acc + e.runs, 0);
        }
        pRuns += ballRuns;
        
        let isLegalOrByes = true;
        if (ball.extras && ball.extras.some(e => e.type === 'WIDE' || e.type === 'NO_BALL')) isLegalOrByes = false;
        if (isLegalOrByes) pBalls += 1;

        if (ball.wickets) {
          for (const w of ball.wickets) {
            // Wicket falls
            if (w.assistIds) {
              for (const assistId of w.assistIds) {
                addMatchForPlayer(assistId, match.id);
                const fs = initField(assistId);
                fs.teamId = inn.teamId === match.team1Id ? match.team2Id : match.team1Id;
                if (w.type === 'CAUGHT') { fs.catches += 1; fs.dismissals += 1; }
                if (w.type === 'RUN_OUT') { fs.runOuts += 1; fs.dismissals += 1; }
                if (w.type === 'STUMPED') { fs.stumpings += 1; fs.dismissals += 1; }
              }
            }
          }
        }
      }
      savePartnership(); // Save last partnership of inning
    }
  }

  // Final Calculations
  const batList = Object.values(batMap).map(s => {
    s.matches = playerMatchesPlayed[s.id]?.size || 0;
    s.average = s.timesOut > 0 ? (s.runs / s.timesOut) : s.runs; // Convention: if 0 outs, avg is total runs
    s.strikeRate = s.ballsFaced > 0 ? (s.runs / s.ballsFaced) * 100 : 0;
    return s;
  });

  const bowlList = Object.values(bowlMap).map(s => {
    s.matches = playerMatchesPlayed[s.id]?.size || 0;
    const totalOvers = s.ballsBowled / 6;
    s.economy = totalOvers > 0 ? (s.runsConceded / totalOvers) : 0;
    s.average = s.wickets > 0 ? (s.runsConceded / s.wickets) : 0;
    s.strikeRate = s.wickets > 0 ? (s.ballsBowled / s.wickets) : 0;
    return s;
  });

  const fieldList = Object.values(fieldMap).map(s => {
    s.matches = playerMatchesPlayed[s.id]?.size || 0;
    return s;
  });

  return {
    batting: batList,
    bowling: bowlList,
    fielding: fieldList,
    partnerships
  };
}

export async function fetchTeamStats(tournamentId: string) {
  const { doc, getDoc } = await import('firebase/firestore');
  const tDoc = await getDoc(doc(db, 'tournaments', tournamentId));
  const tData = tDoc.data();
  const playersPerTeam = tData?.playersPerTeam || 11;

  const matchesQ = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
  const matchesSnap = await getDocs(matchesQ);
  const matches: Match[] = [];
  matchesSnap.forEach(d => matches.push({ id: d.id, ...d.data() } as Match));

  // Also fetch teams to get their real names
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
        matchesPlayed: 0, 
        wins: 0, 
        losses: 0, 
        ties: 0, 
        noResults: 0, 
        points: 0, 
        nrr: 0,
        runsFor: 0,
        oversFaced: 0,
        runsAgainst: 0,
        oversBowled: 0
      };
    }
    return teamMap[id];
  }

  for (const match of matches) {
    if (match.status !== 'COMPLETED' && match.status !== 'ABANDONED') continue;
    
    const t1 = initTeam(match.team1Id, match.team1Name || match.team1ShortName || match.team1Id);
    const t2 = initTeam(match.team2Id, match.team2Name || match.team2ShortName || match.team2Id);

    if (match.status === 'ABANDONED' || match.result?.toLowerCase().includes('abandoned') || match.result?.toLowerCase().includes('no result')) {
      t1.matchesPlayed += 1;
      t2.matchesPlayed += 1;
      t1.noResults += 1;
      t2.noResults += 1;
      t1.points += 1;
      t2.points += 1;
      continue;
    }

    const inningsSnap = await getDocs(collection(db, `matches/${match.id}/innings`));
    const innings: InningsState[] = [];
    inningsSnap.forEach(d => innings.push(d.data() as InningsState));

    // For NRR, we usually only care about the main 2 innings (exclude super overs)
    // Super overs typically have maxOvers = 1. Let's filter out innings with maxOvers === 1 unless it's explicitly a 1-over match.
    // Or just take the first two chronological innings.
    innings.sort((a, b) => a.inningId.localeCompare(b.inningId));
    
    // Fallback: If no innings found, maybe it's a forfeit or we just skip
    if (innings.length === 0) continue;
    
    const mainInnings = innings.filter(i => !i.inningId.includes('super_over') && i.maxOvers !== 1).slice(0, 2);
    
    if (mainInnings.length === 0) {
       // Only super overs? Weird, skip NRR.
       continue;
    }
    
    let t1Runs = 0;
    let t2Runs = 0;
    let t1OversFaced = 0;
    let t2OversFaced = 0;
    
    for (const inn of mainInnings) {
       const isT1 = inn.teamId === match.team1Id;
       const runs = inn.totalRuns || 0;
       const wickets = inn.totalWickets || 0;
       
       let overs = inn.completedOvers + ((inn.currentOverBalls || 0) / 6);
       
       // ALL OUT condition for NRR: if all out, overs faced = scheduled max overs
       const maxOvers = inn.maxOvers || match.overs || 20;
       if (wickets >= (playersPerTeam - 1)) {
          overs = maxOvers;
       }
       
       if (isT1) {
          t1Runs += runs;
          t1OversFaced += overs;
       } else {
          t2Runs += runs;
          t2OversFaced += overs;
       }
    }
    
    // Add to aggregates
    t1.runsFor += t1Runs;
    t1.oversFaced += t1OversFaced;
    t1.runsAgainst += t2Runs;
    t1.oversBowled += t2OversFaced;
    
    t2.runsFor += t2Runs;
    t2.oversFaced += t2OversFaced;
    t2.runsAgainst += t1Runs;
    t2.oversBowled += t1OversFaced;
    
    // Determine winner/loser/tie
    t1.matchesPlayed += 1;
    t2.matchesPlayed += 1;
    
    // Wait, DLS might mean t2 won even if t2Runs < t1Runs.
    // So let's check match.result text for winner first.
    const resultText = (match.result || '').toLowerCase();
    
    // Check if match was decided by Super Over or DLS
    const tie = resultText.includes('tie') || resultText.includes('tied');
    const t1Won = resultText.includes(t1.name.toLowerCase()) || resultText.includes(match.team1Id.toLowerCase());
    const t2Won = resultText.includes(t2.name.toLowerCase()) || resultText.includes(match.team2Id.toLowerCase());
    
    if (tie && !t1Won && !t2Won) {
       // True tie without a super over winner declared
       t1.ties += 1;
       t2.ties += 1;
       t1.points += 1;
       t2.points += 1;
    } else if (t1Won) {
       t1.wins += 1;
       t2.losses += 1;
       t1.points += 2;
    } else if (t2Won) {
       t2.wins += 1;
       t1.losses += 1;
       t2.points += 2;
    } else {
       // Fallback to runs comparison if result text doesn't contain team name
       if (t1Runs > t2Runs) {
         t1.wins += 1;
         t2.losses += 1;
         t1.points += 2;
       } else if (t2Runs > t1Runs) {
         t2.wins += 1;
         t1.losses += 1;
         t2.points += 2;
       } else {
         t1.ties += 1;
         t2.ties += 1;
         t1.points += 1;
         t2.points += 1;
       }
    }
  }
  
  // Calculate final NRR
  return Object.values(teamMap).map(t => {
     const nrrFor = t.oversFaced > 0 ? (t.runsFor / t.oversFaced) : 0;
     const nrrAgainst = t.oversBowled > 0 ? (t.runsAgainst / t.oversBowled) : 0;
     t.nrr = nrrFor - nrrAgainst;
     
     // Optionally clean up the internal fields if needed, but TypeScript is fine returning them
     return t;
  });
}

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
    
    const inningsSnap = await getDocs(collection(db, `matches/${match.id}/innings`));
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
