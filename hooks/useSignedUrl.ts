/**
 * useSignedUrl Hook
 *
 * React hook to generate signed URLs from storage paths for private bucket access.
 * Automatically regenerates URLs with 2-hour expiration.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../src/config/supabase';
import { getSignedUrl } from '../utils/storageHelper';

/**
 * Generate a signed URL from a storage path
 * @param path Storage path (e.g., "club-123/logo-123.jpg") or full URL or null
 * @returns Signed URL or null if path is null/invalid
 */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const generateUrl = async () => {
      // If path is already a full URL (http/https) or local file URI (file://), use it as-is
      if (path && (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://'))) {
        if (isMounted) setSignedUrl(path);
        return;
      }

      // If path is a storage path, generate signed URL
      if (path) {
        const url = await getSignedUrl(supabase, path);
        if (isMounted) setSignedUrl(url);
      } else {
        if (isMounted) setSignedUrl(null);
      }
    };

    generateUrl();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return signedUrl;
}
