/**
 * ClubStorageService
 *
 * Service for managing club files in Supabase Storage (logos, coach photos, and player photos).
 *
 * Features:
 * - Upload/manage club logos (one per club)
 * - Upload/manage coach photos (one per team)
 * - Upload/manage player photos (one per player per team)
 * - Generate signed URLs for secure access
 * - Delete files from storage
 *
 * Storage Structure:
 * - Bucket: "clubs" (PRIVATE bucket)
 * - Club logo: club-{clubId}/logo-{clubId}.{ext}
 * - Coach photo: club-{clubId}/team-{teamId}/coach-{teamId}.{ext}
 * - Player photo: club-{clubId}/team-{teamId}/player-{playerId}.{ext}
 * - Formats: JPG, JPEG, PNG
 *
 * Used by:
 * - Club management screens: Logo CRUD operations
 * - Team management screens: Coach photo CRUD operations
 * - Player management screens: Photo CRUD operations
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logError, logWarn } from "../utils/logger";

export class ClubStorageService {
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = "clubs";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Upload a club logo to Supabase Storage (PRIVATE bucket)
   * Path format: club-{clubId}/logo-{clubId}.{ext}
   *
   * @param uri Local URI of the image file
   * @param clubId Club ID
   * @returns Storage path (NOT signed URL) and error if any
   */
  async uploadClubLogo(
    uri: string,
    clubId: string
  ): Promise<{ path: string | null; error: string | null }> {
    try {
      logInfo('ClubStorageService', '📸 Starting club logo upload', { clubId, uri });

      // 1. Generate filename: club-{clubId}/logo-{clubId}.ext
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `club-${clubId}/logo-${clubId}.${fileExt}`;

      // 2. Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      logInfo('ClubStorageService', '⬆️ Uploading club logo to Supabase Storage', {
        fileName,
        bucket: this.BUCKET_NAME,
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });

      // 3. Upload to Supabase Storage (upsert=true replaces existing logo)
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) {
        logError('ClubStorageService', '❌ Supabase Storage upload failed', {
          fileName,
          error: error.message
        });
        return { path: null, error: error.message };
      }

      logInfo('ClubStorageService', '✅ Club logo uploaded successfully', {
        fileName,
        path: fileName
      });
      return { path: fileName, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logError('ClubStorageService', '❌ Exception during club logo upload', {
        clubId,
        error: errorMessage
      });
      return { path: null, error: errorMessage };
    }
  }

  /**
   * Upload a player photo to Supabase Storage (PRIVATE bucket)
   * Path format: club-{clubId}/team-{teamId}/player-{playerId}.{ext}
   *
   * @param uri Local URI of the image file
   * @param playerId Player ID
   * @param teamId Team ID
   * @param clubId Club ID
   * @returns Storage path (NOT signed URL) and error if any
   */
  async uploadPlayerPhoto(
    uri: string,
    playerId: string,
    teamId: string,
    clubId: string
  ): Promise<{ path: string | null; error: string | null }> {
    try {
      logInfo('ClubStorageService', '📸 Starting player photo upload', { playerId, teamId, clubId, uri });

      // 1. Generate filename: club-{clubId}/team-{teamId}/player-{playerId}.ext
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `club-${clubId}/team-${teamId}/player-${playerId}.${fileExt}`;

      // 2. Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      logInfo('ClubStorageService', '⬆️ Uploading player photo to Supabase Storage', {
        fileName,
        bucket: this.BUCKET_NAME,
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });

      // 3. Upload to Supabase Storage (upsert=true replaces existing photo)
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) {
        logError('ClubStorageService', '❌ Supabase Storage upload failed', {
          fileName,
          error: error.message
        });
        return { path: null, error: error.message };
      }

      logInfo('ClubStorageService', '✅ Player photo uploaded successfully', {
        fileName,
        path: fileName
      });
      return { path: fileName, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logError('ClubStorageService', '❌ Exception during player photo upload', {
        playerId,
        teamId,
        clubId,
        error: errorMessage
      });
      return { path: null, error: errorMessage };
    }
  }

  /**
   * Upload a coach photo to Supabase Storage (PRIVATE bucket)
   * Path format: club-{clubId}/team-{teamId}/coach-{teamId}.{ext}
   *
   * @param uri Local URI of the image file
   * @param teamId Team ID
   * @param clubId Club ID
   * @returns Storage path (NOT signed URL) and error if any
   */
  async uploadCoachPhoto(
    uri: string,
    teamId: string,
    clubId: string
  ): Promise<{ path: string | null; error: string | null }> {
    try {
      logInfo('ClubStorageService', '📸 Starting coach photo upload', { teamId, clubId, uri });

      // 1. Generate filename: club-{clubId}/team-{teamId}/coach-{teamId}.ext
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `club-${clubId}/team-${teamId}/coach-${teamId}.${fileExt}`;

      // 2. Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      logInfo('ClubStorageService', '⬆️ Uploading coach photo to Supabase Storage', {
        fileName,
        bucket: this.BUCKET_NAME,
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });

      // 3. Upload to Supabase Storage (upsert=true replaces existing photo)
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) {
        logError('ClubStorageService', '❌ Supabase Storage upload failed', {
          fileName,
          error: error.message
        });
        return { path: null, error: error.message };
      }

      logInfo('ClubStorageService', '✅ Coach photo uploaded successfully', {
        fileName,
        path: fileName
      });
      return { path: fileName, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logError('ClubStorageService', '❌ Exception during coach photo upload', {
        teamId,
        clubId,
        error: errorMessage
      });
      return { path: null, error: errorMessage };
    }
  }

  /**
   * Delete a club logo from Supabase Storage
   * Path format: club-{clubId}/logo-{clubId}.{ext}
   *
   * @param logoUrl Signed URL of the logo to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async deleteClubLogo(logoUrl: string): Promise<boolean> {
    try {
      // Extract path: club-{clubId}/logo-{clubId}.ext from signed URL
      const urlParts = logoUrl.split("/");
      const fileName = urlParts.slice(-2).join("/"); // Last 2 segments

      if (!fileName || !fileName.includes('logo-')) {
        logWarn('ClubStorageService', '⚠️ Cannot delete logo - invalid URL format', { logoUrl });
        return false;
      }

      logInfo('ClubStorageService', '🗑️ Deleting club logo from storage', {
        fileName,
        bucket: this.BUCKET_NAME
      });

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        logError('ClubStorageService', '❌ Failed to delete logo', {
          fileName,
          error: error.message
        });
        return false;
      }

      logInfo('ClubStorageService', '✅ Club logo deleted successfully', { fileName });
      return true;
    } catch (err) {
      logError('ClubStorageService', '❌ Exception during logo deletion', {
        logoUrl,
        error: err instanceof Error ? err.message : err
      });
      return false;
    }
  }

  /**
   * Delete a coach photo from Supabase Storage
   * Path format: club-{clubId}/team-{teamId}/coach-{teamId}.{ext}
   *
   * @param photoUrl Signed URL of the photo to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async deleteCoachPhoto(photoUrl: string): Promise<boolean> {
    try {
      // Extract path: club-{clubId}/team-{teamId}/coach-{teamId}.ext from signed URL
      const urlParts = photoUrl.split("/");
      const fileName = urlParts.slice(-3).join("/"); // Last 3 segments

      if (!fileName || !fileName.includes('team-') || !fileName.includes('coach-')) {
        logWarn('ClubStorageService', '⚠️ Cannot delete coach photo - invalid URL format', { photoUrl });
        return false;
      }

      logInfo('ClubStorageService', '🗑️ Deleting coach photo from storage', {
        fileName,
        bucket: this.BUCKET_NAME
      });

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        logError('ClubStorageService', '❌ Failed to delete coach photo', {
          fileName,
          error: error.message
        });
        return false;
      }

      logInfo('ClubStorageService', '✅ Coach photo deleted successfully', { fileName });
      return true;
    } catch (err) {
      logError('ClubStorageService', '❌ Exception during coach photo deletion', {
        photoUrl,
        error: err instanceof Error ? err.message : err
      });
      return false;
    }
  }

  /**
   * Delete a player photo from Supabase Storage
   * Path format: club-{clubId}/team-{teamId}/player-{playerId}.{ext}
   *
   * @param photoUrl Signed URL of the photo to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async deletePlayerPhoto(photoUrl: string): Promise<boolean> {
    try {
      // Extract path: club-{clubId}/team-{teamId}/player-{playerId}.ext from signed URL
      const urlParts = photoUrl.split("/");
      const fileName = urlParts.slice(-3).join("/"); // Last 3 segments

      if (!fileName || !fileName.includes('team-') || !fileName.includes('player-')) {
        logWarn('ClubStorageService', '⚠️ Cannot delete player photo - invalid URL format', { photoUrl });
        return false;
      }

      logInfo('ClubStorageService', '🗑️ Deleting player photo from storage', {
        fileName,
        bucket: this.BUCKET_NAME
      });

      const { error} = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        logError('ClubStorageService', '❌ Failed to delete player photo', {
          fileName,
          error: error.message
        });
        return false;
      }

      logInfo('ClubStorageService', '✅ Player photo deleted successfully', { fileName });
      return true;
    } catch (err) {
      logError('ClubStorageService', '❌ Exception during player photo deletion', {
        photoUrl,
        error: err instanceof Error ? err.message : err
      });
      return false;
    }
  }
}
