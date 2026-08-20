import { Match } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MIN_MATCH_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const MIN_REST_PERIOD_MS = 12 * 60 * 60 * 1000; // 12 hours

export function validateFixtures(proposedMatches: Match[], existingMatches: Match[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const allMatches = [...existingMatches, ...proposedMatches];

  proposedMatches.forEach((match, index) => {
    // 1. Team playing itself
    if (match.team1Id === match.team2Id && !match.team1Id.startsWith('TBD')) {
      errors.push(`Match ${index + 1}: ${match.team1Name} is scheduled to play against itself.`);
    }

    // 2. TBD validation
    if (match.team1Id.startsWith('TBD') || match.team2Id.startsWith('TBD')) {
       warnings.push(`Match ${index + 1} has TBD (To Be Decided) teams. Please update them later.`);
    }

    // Compare against ALL other matches
    allMatches.forEach(otherMatch => {
      if (match.id === otherMatch.id) return; // Skip self

      const timeDiff = Math.abs(match.scheduledAt - otherMatch.scheduledAt);

      // 3. Venue Clash
      const matchVenue = match.venue || 'Default Venue';
      const otherVenue = otherMatch.venue || 'Default Venue';
      
      if (matchVenue === otherVenue) {
        if (timeDiff < MIN_MATCH_DURATION_MS) {
           const timeStr = new Date(match.scheduledAt).toLocaleString();
           errors.push(`Venue Clash: Match ${index + 1} (${match.team1Name} vs ${match.team2Name}) is scheduled at ${timeStr} which overlaps with another match at ${matchVenue}.`);
        }
      }

      // 4. Rest Period / Team Overlap
      const hasCommonTeam = 
        match.team1Id === otherMatch.team1Id || match.team1Id === otherMatch.team2Id ||
        match.team2Id === otherMatch.team1Id || match.team2Id === otherMatch.team2Id;

      if (hasCommonTeam && !match.team1Id.startsWith('TBD') && !match.team2Id.startsWith('TBD')) {
        if (timeDiff < MIN_MATCH_DURATION_MS) {
           errors.push(`Schedule Conflict: A team in Match ${index + 1} (${match.team1Name} vs ${match.team2Name}) is already playing another match at the same time.`);
        } else if (timeDiff < MIN_REST_PERIOD_MS) {
           warnings.push(`Rest Period Warning: A team in Match ${index + 1} (${match.team1Name} vs ${match.team2Name}) has less than 12 hours of rest between matches.`);
        }
      }
    });
  });

  // Remove duplicates from arrays
  const uniqueErrors = Array.from(new Set(errors));
  const uniqueWarnings = Array.from(new Set(warnings));

  return {
    valid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    warnings: uniqueWarnings
  };
}
