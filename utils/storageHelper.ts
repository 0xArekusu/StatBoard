/**
 * Storage Helper
 *
 * Utility functions for generating signed URLs from storage paths
 * for private bucket access with time-limited expiration (2 hours)
 */

import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "clubs";
const EXPIRATION_TIME = 60 * 60 * 2; // 2 hours in seconds

/**
 * Generate a signed URL from a storage path
 * @param supabase Supabase client
 * @param path Storage path (e.g., "club-123/logo-123.jpg")
 * @returns Signed URL (expires in 2 hours) or null if error
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;

  // If already a full URL (http/https) or local file URI, use as-is (same behavior as useSignedUrl hook)
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, EXPIRATION_TIME);

    if (error) {
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    return null;
  }
}

/**
 * Generate multiple signed URLs in parallel
 * @param supabase Supabase client
 * @param paths Array of storage paths
 * @returns Array of signed URLs (or null for each failed path)
 */
export async function getSignedUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(paths.map(path => getSignedUrl(supabase, path)));
}
