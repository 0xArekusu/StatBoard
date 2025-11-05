/**
 * PhotoUploadService
 *
 * Service for uploading and managing player photos in Supabase Storage.
 *
 * Features:
 * - Upload player photos from local device to cloud storage
 * - Generate unique filenames with timestamp to avoid collisions
 * - Retrieve public URLs for uploaded photos
 * - Delete photos from storage
 *
 * Storage:
 * - Bucket: "player-photos" (public bucket)
 * - Naming: {playerId}_{timestamp}.{ext}
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
   * Upload a player photo to Supabase Storage
   * Generates unique filename with timestamp to prevent collisions
   *
   * @param uri Local URI of the image file
   * @param playerId Player ID used for filename generation
   * @returns Public URL of uploaded image and error if any
   */
  async uploadPlayerPhoto(
    uri: string,
    playerId: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      logInfo('PhotoUploadService', '📸 Starting photo upload', { playerId, uri });

      // 1. Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${playerId}_${timestamp}.${fileExt}`;

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

      // 3. Upload to Supabase Storage with FormData
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (error) {
        logError('PhotoUploadService', '❌ Supabase Storage upload failed', {
          fileName,
          error: error.message
        });
        return { url: null, error: error.message };
      }

      // 4. Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

      logInfo('PhotoUploadService', '✅ Photo uploaded successfully', {
        fileName,
        publicUrl
      });
      return { url: publicUrl, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logError('PhotoUploadService', '❌ Exception during photo upload', {
        playerId,
        error: errorMessage
      });
      return { url: null, error: errorMessage };
    }
  }

  /**
   * Delete a photo from Supabase Storage
   * Extracts filename from public URL and removes file from bucket
   *
   * @param photoUrl Public URL of the photo to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async deletePhoto(photoUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const fileName = photoUrl.split("/").pop();
      if (!fileName) {
        logWarn('PhotoUploadService', '⚠️ Cannot delete photo - invalid URL', { photoUrl });
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
