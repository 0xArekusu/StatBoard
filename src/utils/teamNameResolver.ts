import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cache for team names to avoid repeated database queries
 */
const teamNameCache = new Map<string, string>();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a UUID
 */
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Resolve a team identifier to its name
 * If it's a UUID, fetch the team name from database
 * If it's already a name, return it as-is
 */
export async function resolveTeamName(
  teamIdentifier: string,
  supabase: SupabaseClient
): Promise<string> {
  // If it's not a UUID, return as-is (it's already a name)
  if (!isUUID(teamIdentifier)) {
    return teamIdentifier;
  }

  // Check cache first
  if (teamNameCache.has(teamIdentifier)) {
    return teamNameCache.get(teamIdentifier)!;
  }

  try {
    // Fetch team name from database
    const { data, error } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamIdentifier)
      .single();

    if (error) {
      console.warn(`Failed to resolve team UUID ${teamIdentifier}:`, error);
      return teamIdentifier; // Fallback to UUID
    }

    if (data && data.name) {
      // Cache the result
      teamNameCache.set(teamIdentifier, data.name);
      return data.name;
    }
  } catch (error) {
    console.warn(`Error resolving team name for ${teamIdentifier}:`, error);
  }

  // Fallback to UUID if resolution failed
  return teamIdentifier;
}

