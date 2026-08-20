import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, processEvent } from './engine';
import { BallEvent, InningsState } from './types';

describe('Extras and Mixed Scenarios', () => {
  let initialState: InningsState;

  beforeEach(() => {
    initialState = createInitialState(
      'match1', 'inning1', 'team1',
      'batter1', 'batter2', 'bowler1',
      20, 150
    );
  });

  it('should process leg byes', () => {
    const event: BallEvent = {
      eventId: 'eb1', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      extras: [{ type: 'LEG_BYE', runs: 1 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(1);
    expect(nextState.extras.legByes).toBe(1);
    expect(nextState.batterStats['batter1'].runs).toBe(0); // Not batter runs
    expect(nextState.batterStats['batter1'].ballsFaced).toBe(1); // Still counts as ball faced
    expect(nextState.bowlerStats['bowler1'].runs).toBe(0); // Leg byes do not count against bowler
    expect(nextState.currentStrikerId).toBe('batter2'); // Strike rotates
  });

  it('should process byes and boundaries', () => {
    const event: BallEvent = {
      eventId: 'eb2', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: true, boundaryType: 'FOUR', // Boundary byes
      extras: [{ type: 'BYE', runs: 4 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(4);
    expect(nextState.extras.byes).toBe(4);
    expect(nextState.batterStats['batter1'].runs).toBe(0);
    expect(nextState.batterStats['batter1'].fours).toBe(0); // Boundary wasn't off bat
    expect(nextState.bowlerStats['bowler1'].runs).toBe(0); // Byes do not count against bowler
  });

  it('should process no ball with leg byes', () => {
    const event: BallEvent = {
      eventId: 'eb3', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      // 1 No Ball penalty + 2 Leg Byes
      extras: [
        { type: 'NO_BALL', runs: 1 },
        { type: 'LEG_BYE', runs: 2 }
      ]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(3);
    expect(nextState.extras.noBalls).toBe(1);
    expect(nextState.extras.legByes).toBe(2);
    expect(nextState.bowlerStats['bowler1'].runs).toBe(1); // Only NO_BALL penalty counts against bowler
    expect(nextState.currentOverBalls).toBe(0); // Not a legal delivery
    expect(nextState.currentStrikerId).toBe('batter1'); // 2 runs -> no rotation
  });

  it('should process penalty runs', () => {
    const event: BallEvent = {
      eventId: 'eb4', timestamp: 1, matchId: 'm1', inningId: 'i1',
      bowlerId: 'bowler1', strikerId: 'batter1', nonStrikerId: 'batter2',
      runs: 0, isBoundary: false,
      extras: [{ type: 'PENALTY', runs: 5 }]
    };
    const nextState = processEvent(initialState, event);
    expect(nextState.totalRuns).toBe(5);
    expect(nextState.extras.penalty).toBe(5);
    expect(nextState.bowlerStats['bowler1'].runs).toBe(0);
    expect(nextState.currentOverBalls).toBe(1); // Usually a legal ball if it's just penalty? Wait, penalty doesn't necessarily consume a ball, but usually attached to an event. If it's pure penalty without a delivery, it's just added. For now, assuming it accompanies a dot ball.
    expect(nextState.batterStats['batter1'].ballsFaced).toBe(1);
  });
});
