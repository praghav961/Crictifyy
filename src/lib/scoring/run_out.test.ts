import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, processEvent } from './engine';
import { BallEvent, InningsState } from './types';

describe('Run Out Scenarios', () => {
  let initialState: InningsState;

  beforeEach(() => {
    initialState = createInitialState(
      'match1', 'inning1', 'team1',
      'batter1', 'batter2', 'bowler1',
      20, 150
    );
  });

  it('should process a run out at non-striker end with 1 run completed', () => {
    const event: BallEvent = {
      eventId: 'ro1', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 1, isBoundary: false,
      wickets: [{ type: 'RUN_OUT', playerOutId: 'batter2', runsCompleted: 1 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(1); // 1 run scored
    expect(nextState.totalWickets).toBe(1);
    expect(nextState.batterStats['batter2'].isOut).toBe(true);
    // 1 run completed = batters crossed.
    // So striker batter1 is now at non-striker end.
    // Non-striker batter2 is out.
    // The new batter will come to striker end.
    expect(nextState.currentStrikerId).toBe('');
    expect(nextState.currentNonStrikerId).toBe('batter1');
    expect(nextState.batterStats['batter1'].runs).toBe(1);
  });

  it('should process a run out at striker end with 0 runs completed', () => {
    const event: BallEvent = {
      eventId: 'ro2', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      wickets: [{ type: 'RUN_OUT', playerOutId: 'batter1', runsCompleted: 0 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(0);
    expect(nextState.totalWickets).toBe(1);
    expect(nextState.batterStats['batter1'].isOut).toBe(true);
    // 0 runs = didn't cross.
    // Striker batter1 is out.
    // New batter comes to striker end.
    expect(nextState.currentStrikerId).toBe('');
    expect(nextState.currentNonStrikerId).toBe('batter2');
  });

  it('should handle run out on the last ball of the over with 1 run', () => {
    // 5 dot balls to get to the last ball
    let state = initialState;
    for(let i=0; i<5; i++) {
      state = processEvent(state, {
        eventId: `ball_${i}`, timestamp: 1, matchId: 'm1', inningId: 'i1',
        bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
        runs: 0, isBoundary: false
      });
    }

    // 6th ball: run out of non-striker, 1 run completed
    const event: BallEvent = {
      eventId: 'ro3', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 1, isBoundary: false,
      wickets: [{ type: 'RUN_OUT', playerOutId: 'batter2', runsCompleted: 1 }]
    };
    state = processEvent(state, event);
    expect(state.completedOvers).toBe(1);
    expect(state.currentOverBalls).toBe(0);
    expect(state.totalRuns).toBe(1);
    
    // They crossed (1 run), so batter1 is at non-striker.
    // Then over ends, so they swap. batter1 comes back to striker.
    // batter2 is out, new batter is at non-striker end.
    expect(state.currentStrikerId).toBe('batter1');
    expect(state.currentNonStrikerId).toBe('');
  });
});
