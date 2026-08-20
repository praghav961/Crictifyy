export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';
export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED_HURT' | 'RETIRED_OUT' | 'TIMED_OUT' | 'OBSTRUCTING_THE_FIELD';

export interface ExtraInfo {
  type: ExtraType;
  runs: number; // Includes the penalty for the extra (e.g. 1 for wide) + any runs taken
}

export interface WicketInfo {
  type: WicketType;
  playerOutId: string;
  assistIds?: string[]; // Catchers, fielders for run out
  runsCompleted?: number; // In case of run out, how many runs were completed before the wicket
}

export interface BallEvent {
  eventId: string;
  timestamp: number;
  matchId: string;
  inningId: string;

  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;

  runs: number; // Runs scored by batter off the bat
  extras?: ExtraInfo[];
  wickets?: WicketInfo[];

  isBoundary: boolean;
  boundaryType?: 'FOUR' | 'SIX';
  isFreeHit?: boolean;
  shotZone?: string;
}

export interface BatterStats {
  id: string;
  name?: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  howOut?: string;
}

export interface BowlerStats {
  id: string;
  name?: string;
  overs: number;
  balls: number; // Legal balls in current over
  maidens: number;
  runs: number; // Runs conceded
  wickets: number; // Wickets credited to bowler
  wides: number;
  noBalls: number;
  dots: number;
}

export interface FallOfWicket {
  runs: number;
  wicketNumber: number;
  overs: number;
  balls: number;
  playerOutId: string;
}

export interface Partnership {
  player1Id: string;
  player2Id: string;
  runs: number;
  balls: number;
}

export interface InningsState {
  matchId: string;
  inningId: string;
  teamId: string;
  
  totalRuns: number;
  totalWickets: number;
  
  completedOvers: number;
  currentOverBalls: number;
  
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
  
  batterStats: Record<string, BatterStats>;
  bowlerStats: Record<string, BowlerStats>;
  
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  currentBowlerId?: string;
  
  fallOfWickets: FallOfWicket[];
  currentPartnership: Partnership;
  
  targetRuns?: number;
  dlsTarget?: number;
  revisedOvers?: number;
  isSuperOver?: boolean;
  maxOvers?: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

  processedEvents: string[]; // Idempotency array

  // Track runs in the current over to determine maidens
  currentOverRunsConcededByBowler: number;
  freeHitActive?: boolean;
  powerplays?: { type: string; startOver: number; endOver: number; }[];
}
