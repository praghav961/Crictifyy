import { InningsState } from './types';

export function getOversString(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

export function getBallsFromOvers(overs: number, balls: number): number {
  return overs * 6 + balls;
}

export function calculateStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(2);
}

export function calculateEconomy(runs: number, overs: number, balls: number): string {
  const totalBalls = getBallsFromOvers(overs, balls);
  if (totalBalls === 0) return '0.00';
  return ((runs / totalBalls) * 6).toFixed(2);
}

export function calculateCRR(totalRuns: number, completedOvers: number, currentOverBalls: number): string {
  const totalBalls = getBallsFromOvers(completedOvers, currentOverBalls);
  if (totalBalls === 0) return '0.00';
  return ((totalRuns / totalBalls) * 6).toFixed(2);
}

export function calculateRRR(target: number | undefined, currentRuns: number, maxOvers: number | undefined, completedOvers: number, currentOverBalls: number): string {
  if (!target || !maxOvers) return '0.00';
  const totalBalls = maxOvers * 6;
  const ballsBowled = getBallsFromOvers(completedOvers, currentOverBalls);
  const ballsRemaining = totalBalls - ballsBowled;
  const runsRequired = target - currentRuns;
  
  if (runsRequired <= 0) return '0.00';
  if (ballsRemaining <= 0) return '0.00';
  return ((runsRequired / ballsRemaining) * 6).toFixed(2);
}

export function getRunsRequired(target?: number, currentRuns?: number): number {
  if (!target || currentRuns === undefined) return 0;
  return Math.max(0, target - currentRuns);
}

export function getBallsRemaining(maxOvers?: number, completedOvers?: number, currentOverBalls?: number): number {
  if (!maxOvers || completedOvers === undefined || currentOverBalls === undefined) return 0;
  return Math.max(0, (maxOvers * 6) - getBallsFromOvers(completedOvers, currentOverBalls));
}
