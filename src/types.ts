export type UserRole = 
  | 'VIEWER'
  | 'PLAYER'
  | 'TEAM_MANAGER'
  | 'SCORER'
  | 'MATCH_ADMIN'
  | 'TOURNAMENT_ADMIN'
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  canHostTournament: boolean;
  createdAt: number;
}

export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export type TournamentFormat = 'Round Robin' | 'Double Round Robin' | 'Group Stage';



export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  displayOrder: number;
  teamIds: string[];
  qualificationSlots: number;
  pointsConfiguration: string;
  tieBreakConfiguration: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  createdAt: number;
  updatedAt: number;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  hostId: string;
  status: TournamentStatus;
  startDate: number;
  endDate?: number;
  venue?: string;
  organizer?: string;
  contact?: string;
  numberOfTeams?: number;
  playersPerTeam?: number;
  overs?: number;
  format?: TournamentFormat;
    groups?: string[]; // e.g., ["Group A", "Group B"]
  visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  isFinalized?: boolean;
  championId?: string;
  runnerUpId?: string;
  awards?: {
    playerOfTournament?: string;
    bestBatter?: string;
    bestBowler?: string;
    bestFielder?: string;
    emergingPlayer?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Sponsor {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl: string;
  sponsorType: string;
  website?: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  createdAt: number;
}

export interface TournamentTeam {
  id: string; // usually teamId
  name: string;
  shortName: string;
  logoUrl?: string;
  groupId?: string; // Group A, Group B, etc.
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
  status?: 'ACTIVE' | 'ELIMINATED' | 'QUALIFIED' | 'WINNER' | 'RUNNER_UP';
  joinedAt: number;
}

export interface TournamentPlayer {
  id: string; // playerId
  tournamentId?: string;
  teamId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  joinedAt: number;
}

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'NO_RESULT';

export interface Match {
  id: string;
  tournamentId?: string;
  matchType?: string; // e.g., "Group A - Match 1", "Qualifier 1", "Final"
  groupId?: string; // e.g. "Group A"
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1ShortName?: string;
  team2ShortName?: string;
  team1Logo?: string;
  team2Logo?: string;
  status: MatchStatus;
  scheduledAt: number;
  venue?: string;
  tossWinnerId?: string;
  tossDecision?: 'BAT' | 'BOWL';
  result?: string;
  isSuperOver?: boolean;
  dlsApplied?: boolean;
  revisedOvers?: number;
    currentInningId?: string;
  overs?: number;
  scorers?: string[]; // Array of user IDs authorized to score
  createdAt: number;
  
  // Summary scores for easy listing
  team1Score?: string; // e.g. "150/4 (20.0)"
  team2Score?: string;
  
  potm?: {
    automaticPlayerId: string;
    finalPlayerId: string;
    overrideReason?: string;
    selectedBy?: string;
    selectedAt: number;
    explanation: string;
    isClose?: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  captainId?: string;
  viceCaptainId?: string;
  coach?: string;
  manager?: string;
  city?: string;
  teamColor?: string;
  squad?: string[]; // Array of player IDs
  players?: string[]; // Fallback array of player IDs
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  battingStyle?: string;
  bowlingStyle?: string;
  jerseyNumber?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScoringCode {
  id: string; // codeHash
  matchId: string;
  tournamentId: string;
  assignedUserId?: string;
  role: 'SCORER' | 'MATCH_ADMIN';
  createdAt: number;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  revoked: boolean;
}

export interface ScoringSession {
  id: string; // matchId_userId
  userId: string;
  matchId: string;
  tournamentId: string;
  role: 'SCORER' | 'MATCH_ADMIN';
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  revoked: boolean;
  codeHash: string;
}
