import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, processEvent } from './engine';
import { BallEvent, InningsState } from './types';

describe('Cricket Scoring Engine', () => {
  let initialState: InningsState;

  beforeEach(() => {
    initialState = createInitialState(
      'match1', 'inning1', 'team1',
      'batter1', 'batter2', 'bowler1',
      20, 150
    );
  });

  it('should initialize correctly', () => {
    expect(initialState.totalRuns).toBe(0);
    expect(initialState.totalWickets).toBe(0);
    expect(initialState.currentStrikerId).toBe('batter1');
    expect(initialState.currentNonStrikerId).toBe('batter2');
  });

  it('should process a dot ball', () => {
    const event: BallEvent = {
      eventId: 'e1', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(0);
    expect(nextState.completedOvers).toBe(0);
    expect(nextState.currentOverBalls).toBe(1);
    expect(nextState.batterStats['batter1'].ballsFaced).toBe(1);
    expect(nextState.bowlerStats['bowler1'].dots).toBe(1);
  });

  it('should process a single and rotate strike', () => {
    const event: BallEvent = {
      eventId: 'e2', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 1, isBoundary: false
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(1);
    expect(nextState.batterStats['batter1'].runs).toBe(1);
    expect(nextState.currentStrikerId).toBe('batter2');
    expect(nextState.currentNonStrikerId).toBe('batter1');
  });

  it('should process a boundary four', () => {
    const event: BallEvent = {
      eventId: 'e3', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 4, isBoundary: true, boundaryType: 'FOUR'
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(4);
    expect(nextState.batterStats['batter1'].runs).toBe(4);
    expect(nextState.batterStats['batter1'].fours).toBe(1);
    expect(nextState.currentStrikerId).toBe('batter1'); // No rotation
  });

  it('should process a wide ball', () => {
    const event: BallEvent = {
      eventId: 'e4', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      extras: [{ type: 'WIDE', runs: 1 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(1);
    expect(nextState.extras.wides).toBe(1);
    expect(nextState.currentOverBalls).toBe(0); // Not a legal delivery
    expect(nextState.batterStats['batter1'].ballsFaced).toBe(0); // Wides don't count for batter
    expect(nextState.bowlerStats['bowler1'].runs).toBe(1);
    expect(nextState.currentStrikerId).toBe('batter1');
  });

  it('should process a wide ball with runs run', () => {
    const event: BallEvent = {
      eventId: 'e5', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      extras: [{ type: 'WIDE', runs: 2 }] // 1 wide + 1 run
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(2);
    expect(nextState.extras.wides).toBe(2);
    expect(nextState.currentOverBalls).toBe(0);
    expect(nextState.currentStrikerId).toBe('batter2'); // 1 run completed, strike rotates
  });

  it('should process a no ball with batter runs', () => {
    const event: BallEvent = {
      eventId: 'e6', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 2, isBoundary: false,
      extras: [{ type: 'NO_BALL', runs: 1 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(3);
    expect(nextState.extras.noBalls).toBe(1);
    expect(nextState.batterStats['batter1'].runs).toBe(2);
    expect(nextState.batterStats['batter1'].ballsFaced).toBe(1); // NB counts for balls faced
    expect(nextState.currentOverBalls).toBe(0); // Not a legal delivery
    expect(nextState.bowlerStats['bowler1'].runs).toBe(3);
  });

  it('should process a bowled wicket', () => {
    const event: BallEvent = {
      eventId: 'e7', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      wickets: [{ type: 'BOWLED', playerOutId: 'batter1' }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalWickets).toBe(1);
    expect(nextState.batterStats['batter1'].isOut).toBe(true);
    expect(nextState.bowlerStats['bowler1'].wickets).toBe(1);
    expect(nextState.currentStrikerId).toBe('');
    expect(nextState.currentNonStrikerId).toBe('batter2');
    expect(nextState.fallOfWickets.length).toBe(1);
  });

  it('should handle end of over rotation', () => {
    let state = initialState;
    for(let i=0; i<6; i++) {
      state = processEvent(state, {
        eventId: `ball_${i}`, timestamp: 1, matchId: 'm1', inningId: 'i1',
        bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
        runs: 0, isBoundary: false
      });
    }
    expect(state.completedOvers).toBe(1);
    expect(state.currentOverBalls).toBe(0);
    expect(state.currentStrikerId).toBe('batter2'); // Rotated at end of over
    expect(state.bowlerStats['bowler1'].maidens).toBe(1);
  });

  it('should be idempotent', () => {
    const event: BallEvent = {
      eventId: 'duplicate_event', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 4, isBoundary: true, boundaryType: 'FOUR'
    };
    let nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(4);
    
    // Process again
    nextState = processEvent(nextState, event);
    expect(nextState.totalRuns).toBe(4); // Should not increase
  });

  it('should handle match completion by target', () => {
    const event: BallEvent = {
      eventId: 'e8', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 150, isBoundary: false // unrealistic but works for test
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.status).toBe('COMPLETED');
  });
});
