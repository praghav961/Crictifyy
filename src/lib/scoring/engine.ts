import { BallEvent, InningsState, BatterStats, BowlerStats, WicketType } from './types';

export function createInitialState(
  matchId: string,
  inningId: string,
  teamId: string,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
  maxOvers?: number,
  targetRuns?: number
): InningsState {
  return {
    matchId,
    inningId,
    teamId,
    totalRuns: 0,
    totalWickets: 0,
    completedOvers: 0,
    currentOverBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
    batterStats: {
      [strikerId]: { id: strikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false },
      [nonStrikerId]: { id: nonStrikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false }
    },
    bowlerStats: {
      [bowlerId]: { id: bowlerId, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 }
    },
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: bowlerId,
    fallOfWickets: [],
    currentPartnership: { player1Id: strikerId, player2Id: nonStrikerId, runs: 0, balls: 0 },
    targetRuns,
    maxOvers,
    status: 'IN_PROGRESS',
    processedEvents: [],
    currentOverRunsConcededByBowler: 0
  };
}

export function processEvent(state: InningsState, event: BallEvent): InningsState {
  if (state.processedEvents.includes(event.eventId)) {
    return state; // Idempotency
  }

  if (state.status === 'COMPLETED') {
    return state;
  }

  // Deep clone
  const newState: InningsState = JSON.parse(JSON.stringify(state));
  newState.processedEvents.push(event.eventId);

  // Initialize stats if not present
  if (!newState.batterStats[event.strikerId]) {
    newState.batterStats[event.strikerId] = { id: event.strikerId, name: event.strikerId.replace('temp_', '').replace(/_/g, ' '), runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
  }
  if (!newState.batterStats[event.nonStrikerId]) {
    newState.batterStats[event.nonStrikerId] = { id: event.nonStrikerId, name: event.nonStrikerId.replace('temp_', '').replace(/_/g, ' '), runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false };
  }
  if (!newState.bowlerStats[event.bowlerId]) {
    newState.bowlerStats[event.bowlerId] = { id: event.bowlerId, name: event.bowlerId.replace('temp_', '').replace(/_/g, ' '), overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, dots: 0 };
  }

  const striker = newState.batterStats[event.strikerId];
  const bowler = newState.bowlerStats[event.bowlerId];

  let isLegalBall = true;
  let runsOffBat = event.runs || 0;
  let totalRunsFromEvent = runsOffBat;
  let bowlerRunsConceded = runsOffBat;
  let batterBallsFacedIncrement = 1;
  let runsRun = runsOffBat;

  // Process Extras
  if (event.extras && event.extras.length > 0) {
    for (const extra of event.extras) {
      totalRunsFromEvent += extra.runs;
      newState.extras.total += extra.runs;

      if (extra.type === 'WIDE') {
        isLegalBall = false;
        batterBallsFacedIncrement = 0; // Wides don't count as balls faced
        newState.extras.wides += extra.runs;
        bowler.wides += extra.runs;
        bowlerRunsConceded += extra.runs;
        runsRun += (extra.runs - 1); // 1 is for wide penalty
      } else if (extra.type === 'NO_BALL') {
        isLegalBall = false;
        newState.extras.noBalls += extra.runs;
        bowler.noBalls += extra.runs;
        bowlerRunsConceded += extra.runs; // no ball penalty + any runs scored off it (including byes)
        // Note: runs off bat on no ball count towards batter, extras (like bye on no ball) are already in extra.runs?
        // Let's assume extra.runs for NO_BALL is just the no ball penalty (usually 1), unless they ran byes on it.
        // Actually standard: a No ball run (1) + runs off bat. 
        // If extra is just NO_BALL 1, and batter scored 2, total = 3.
      } else if (extra.type === 'LEG_BYE') {
        newState.extras.legByes += extra.runs;
        runsRun += extra.runs;
      } else if (extra.type === 'BYE') {
        newState.extras.byes += extra.runs;
        runsRun += extra.runs;
      } else if (extra.type === 'PENALTY') {
        newState.extras.penalty += extra.runs;
      }
    }
  }

  // Update Batter Stats
  striker.runs += runsOffBat;
  striker.ballsFaced += batterBallsFacedIncrement;
  if (event.isBoundary && runsOffBat > 0) {
    if (event.boundaryType === 'SIX') striker.sixes += 1;
    else striker.fours += 1;
  }

  // Update Bowler Stats
  bowler.runs += bowlerRunsConceded;
  newState.currentOverRunsConcededByBowler += bowlerRunsConceded;

  if (isLegalBall) {
    bowler.balls += 1;
    newState.currentOverBalls += 1;
  }

  if (isLegalBall && totalRunsFromEvent === 0 && (!event.wickets || event.wickets.length === 0)) {
    bowler.dots += 1;
  }

  // Update Totals
  newState.totalRuns += totalRunsFromEvent;
  newState.currentPartnership.runs += totalRunsFromEvent;
  if (isLegalBall) {
    newState.currentPartnership.balls += 1;
  }

  // Process Wickets
  let strikerDismissed = false;
  let nonStrikerDismissed = false;
  
  if (event.wickets && event.wickets.length > 0) {
    for (const w of event.wickets) {
      // Free hit protection
      if (event.isFreeHit && ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'].includes(w.type)) {
         continue; // Ignore this wicket
      }

      newState.totalWickets += 1;
      const outBatter = newState.batterStats[w.playerOutId];
      if (outBatter) {
        outBatter.isOut = true;
        outBatter.howOut = w.type;
      }
      
      if (w.playerOutId === event.strikerId) strikerDismissed = true;
      if (w.playerOutId === event.nonStrikerId) nonStrikerDismissed = true;

      // Credit to bowler?
      const bowlerWickets: WicketType[] = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
      if (bowlerWickets.includes(w.type)) {
        bowler.wickets += 1;
      }

      newState.fallOfWickets.push({
        runs: newState.totalRuns,
        wicketNumber: newState.totalWickets,
        overs: newState.completedOvers,
        balls: newState.currentOverBalls,
        playerOutId: w.playerOutId
      });
      
      // Update partnership runs in case of run out
      if (w.runsCompleted) {
        // Runs completed before run out are already added if they were included in event.runs or extras?
        // Usually event.runs should be the completed runs.
      }
      
      // Reset partnership
      newState.currentPartnership = {
        player1Id: strikerDismissed ? '' : event.strikerId, // Will be updated when new batter comes
        player2Id: nonStrikerDismissed ? '' : event.nonStrikerId,
        runs: 0,
        balls: 0
      };
    }
  }

  // Strike Rotation Logic
  // Rotate if odd runs ran
  let swapStrike = runsRun % 2 !== 0;

  // End of Over logic
  let endOfOver = false;
  if (newState.currentOverBalls === 6) {
    endOfOver = true;
    newState.completedOvers += 1;
    newState.currentOverBalls = 0;
    
    bowler.overs += 1;
    bowler.balls = 0; // reset for display purposes, usually stored as overs.balls
    
    if (newState.currentOverRunsConcededByBowler === 0) {
      bowler.maidens += 1;
    }
    newState.currentOverRunsConcededByBowler = 0;

        // Strike rotates at the end of the over
    swapStrike = !swapStrike;
    newState.currentBowlerId = ''; // Force bowler selection for next over
  }

  // Apply strike swap if both batters are still there
  if (!strikerDismissed && !nonStrikerDismissed && swapStrike) {
    newState.currentStrikerId = event.nonStrikerId;
    newState.currentNonStrikerId = event.strikerId;
  } else if (!strikerDismissed && nonStrikerDismissed) {
    // Non striker is out, striker stays on strike unless over ends or odd runs
    if (swapStrike) {
      newState.currentStrikerId = ''; // New batter goes on strike
      newState.currentNonStrikerId = event.strikerId;
    } else {
      newState.currentStrikerId = event.strikerId;
      newState.currentNonStrikerId = ''; // New batter goes to non-striker
    }
  } else if (strikerDismissed && !nonStrikerDismissed) {
    // Striker is out. Under modern rules, new batter takes strike (unless it was a run out where they crossed, but let's assume modern catch rule).
    // Let's implement basic rule: if swapStrike, nonStriker becomes striker.
    if (swapStrike) {
      newState.currentStrikerId = event.nonStrikerId;
      newState.currentNonStrikerId = '';
    } else {
      newState.currentStrikerId = '';
      newState.currentNonStrikerId = event.nonStrikerId;
    }
  } else if (strikerDismissed && nonStrikerDismissed) {
      newState.currentStrikerId = '';
      newState.currentNonStrikerId = '';
  }

  // Free hit tracking logic
  let triggeredFreeHit = false;
  if (event.extras) {
    for (const e of event.extras) {
      if (e.type === 'NO_BALL') triggeredFreeHit = true;
    }
  }

  if (triggeredFreeHit) {
    newState.freeHitActive = true;
  } else if (isLegalBall || (event.extras && event.extras.some(e => e.type === 'WIDE'))) {
    // Free hit remains active if it's a wide, but wait, usually a wide on a free hit means the NEXT ball is STILL a free hit.
    if (isLegalBall) {
      newState.freeHitActive = false;
    }
  }

  // Target Check
  if (newState.targetRuns && newState.totalRuns >= newState.targetRuns) {
    newState.status = 'COMPLETED';
  }
  
  if (newState.totalWickets === 10) {
    newState.status = 'COMPLETED';
  }

  if (newState.maxOvers && newState.completedOvers >= newState.maxOvers) {
    newState.status = 'COMPLETED';
  }

  return newState;
}
