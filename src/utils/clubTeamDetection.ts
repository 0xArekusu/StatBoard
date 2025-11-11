/**
 * Club Team Detection Utility
 *
 * Provides utilities for detecting which team is the club team in a match.
 * Handles different team modes (A, B, BOTH) and UUID-based team identification.
 *
 * In StatBoard:
 * - Club teams are stored by UUID (references to teams table in database)
 * - Temporary opponent teams are stored by name (plain string)
 * - In "BOTH" mode, we need to detect which team has a UUID to identify the club team
 */

/**
 * UUID validation regex (RFC 4122)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 * @param value - The string to check
 * @returns true if the string is a valid UUID
 */
export const isUUID = (value: string | undefined): boolean => {
  if (!value) return false;
  return UUID_REGEX.test(value);
};

/**
 * Determine which team is the club team based on team mode and UUID detection
 *
 * Logic:
 * - Mode "A": Team A is always the club team
 * - Mode "B": Team B is always the club team
 * - Mode "BOTH": Check which team has a UUID:
 *   - If only Team A has UUID → Team A is club team
 *   - If only Team B has UUID → Team B is club team
 *   - If both or neither have UUID → It's a friendly match (no club team)
 *
 * @param teamMode - The team mode ("A", "B", or "BOTH")
 * @param teamA - Team A identifier (UUID or name)
 * @param teamB - Team B identifier (UUID or name)
 * @returns "A" if Team A is club team, "B" if Team B is club team, null if no club team
 */
export const determineClubTeam = (
  teamMode: "A" | "B" | "BOTH",
  teamA: string | undefined,
  teamB: string | undefined
): "A" | "B" | null => {
  if (teamMode === "A") {
    return "A";
  } else if (teamMode === "B") {
    return "B";
  } else if (teamMode === "BOTH") {
    const teamAIsUUID = isUUID(teamA);
    const teamBIsUUID = isUUID(teamB);

    if (teamAIsUUID && !teamBIsUUID) {
      return "A"; // Team A is club team
    } else if (teamBIsUUID && !teamAIsUUID) {
      return "B"; // Team B is club team
    }
    // If both are UUIDs or neither, it's a friendly match (no club team)
  }
  return null;
};

/**
 * Get the club team name based on detection
 *
 * @param teamMode - The team mode ("A", "B", or "BOTH")
 * @param teamAName - Team A display name
 * @param teamBName - Team B display name
 * @param teamA - Team A identifier (UUID or name)
 * @param teamB - Team B identifier (UUID or name)
 * @returns The club team name, or null if no club team
 */
export const getClubTeamName = (
  teamMode: "A" | "B" | "BOTH",
  teamAName: string,
  teamBName: string,
  teamA?: string,
  teamB?: string
): string | null => {
  const clubTeam = determineClubTeam(teamMode, teamA, teamB);

  if (clubTeam === "A") {
    return teamAName;
  } else if (clubTeam === "B") {
    return teamBName;
  }

  return null;
};

/**
 * Determine if a match is a club match (has a club team)
 *
 * @param teamMode - The team mode ("A", "B", or "BOTH")
 * @param teamA - Team A identifier (UUID or name)
 * @param teamB - Team B identifier (UUID or name)
 * @returns true if the match has a club team
 */
export const isClubMatch = (
  teamMode: "A" | "B" | "BOTH",
  teamA?: string,
  teamB?: string
): boolean => {
  return determineClubTeam(teamMode, teamA, teamB) !== null;
};
