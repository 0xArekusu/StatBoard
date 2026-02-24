/**
 * PhotoUploadService
 *
 * Service for uploading and managing player photos in Supabase Storage.
 *
 * Features:
 * - Upload player photos from local device to cloud storage (PRIVATE bucket)
 * - One photo per player (upsert replaces existing photo)
 * - Generate signed URLs for secure access
 * - Delete photos from storage
 *
 * Storage:
 * - Bucket: "player-photos" (PRIVATE bucket)
 * - Naming: {clubId}/{playerId}.{ext} (NO TIMESTAMP)
 * - Formats: JPG, JPEG, PNG
 *
 * Used by:
 * - MatchSyncService: Upload player photos during match sync
 * - Player management screens: Photo CRUD operations
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logError, logWarn } from "../utils/logger";

export class PhotoUploadService {
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = "player-photos";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Upload a player photo to Supabase Storage (PRIVATE bucket)
   * One photo per player - upsert replaces existing photo
   * Path format: {clubId}/{playerId}.{ext}
   *
   * @param uri Local URI of the image file
   * @param playerId Player ID used for filename generation
   * @param clubId Club ID for folder organization
   * @returns Signed URL of uploaded image (expires in 1 year) and error if any
   */
  async uploadPlayerPhoto(
    uri: string,
    playerId: string,
    clubId: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      logInfo('PhotoUploadService', '📸 Starting photo upload', { playerId, clubId, uri });

      // 1. Generate filename without timestamp (one photo per player)
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${clubId}/${playerId}.${fileExt}`;

      // 2. Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      logInfo('PhotoUploadService', '⬆️ Uploading to Supabase Storage', {
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
        logError('PhotoUploadService', '❌ Supabase Storage upload failed', {
          fileName,
          error: error.message
        });
        return { url: null, error: error.message };
      }

      // 4. Get signed URL (private bucket - expires in 1 year)
      const { data: signedData, error: signedError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiration

      if (signedError) {
        logError('PhotoUploadService', '❌ Failed to create signed URL', {
          fileName,
          error: signedError.message
        });
        return { url: null, error: signedError.message };
      }

      logInfo('PhotoUploadService', '✅ Photo uploaded successfully', {
        fileName,
        signedUrl: signedData.signedUrl
      });
      return { url: signedData.signedUrl, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logError('PhotoUploadService', '❌ Exception during photo upload', {
        playerId,
        clubId,
        error: errorMessage
      });
      return { url: null, error: errorMessage };
    }
  }

  /**
   * Delete a photo from Supabase Storage
   * Extracts filename from signed URL and removes file from bucket
   * Path format: {clubId}/{playerId}.{ext}
   *
   * @param photoUrl Signed URL of the photo to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async deletePhoto(photoUrl: string): Promise<boolean> {
    try {
      // Extract path: {clubId}/{playerId}.ext from signed URL
      const urlParts = photoUrl.split("/");
      const fileName = urlParts.slice(-2).join("/"); // Last 2 segments

      if (!fileName || !fileName.includes('/')) {
        logWarn('PhotoUploadService', '⚠️ Cannot delete photo - invalid URL format', { photoUrl });
        return false;
      }

      logInfo('PhotoUploadService', '🗑️ Deleting photo from storage', {
        fileName,
        bucket: this.BUCKET_NAME
      });

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        logError('PhotoUploadService', '❌ Failed to delete photo', {
          fileName,
          error: error.message
        });
        return false;
      }

      logInfo('PhotoUploadService', '✅ Photo deleted successfully', { fileName });
      return true;
    } catch (err) {
      logError('PhotoUploadService', '❌ Exception during photo deletion', {
        photoUrl,
        error: err instanceof Error ? err.message : err
      });
      return false;
    }
  }
}
