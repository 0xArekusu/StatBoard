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

/**
 * Resolve multiple team identifiers at once (more efficient)
 */
export async function resolveTeamNames(
  teamIdentifiers: string[],
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uuidsToFetch: string[] = [];

  // Separate UUIDs from names and check cache
  for (const identifier of teamIdentifiers) {
    if (!isUUID(identifier)) {
      // Already a name
      result.set(identifier, identifier);
    } else if (teamNameCache.has(identifier)) {
      // In cache
      result.set(identifier, teamNameCache.get(identifier)!);
    } else {
      // Need to fetch
      uuidsToFetch.push(identifier);
    }
  }

  // Fetch all missing UUIDs in one query
  if (uuidsToFetch.length > 0) {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", uuidsToFetch);

      if (error) {
        console.warn("Failed to resolve team UUIDs:", error);
        // Fallback to UUIDs
        for (const uuid of uuidsToFetch) {
          result.set(uuid, uuid);
        }
      } else if (data) {
        // Cache and add to result
        for (const team of data) {
          teamNameCache.set(team.id, team.name);
          result.set(team.id, team.name);
        }

        // Add fallback for any UUIDs not found
        for (const uuid of uuidsToFetch) {
          if (!result.has(uuid)) {
            result.set(uuid, uuid);
          }
        }
      }
    } catch (error) {
      console.warn("Error resolving team names:", error);
      // Fallback to UUIDs
      for (const uuid of uuidsToFetch) {
        result.set(uuid, uuid);
      }
    }
  }

  return result;
}

/**
 * Clear the team name cache (useful for testing or after updates)
 */
export function clearTeamNameCache(): void {
  teamNameCache.clear();
}
