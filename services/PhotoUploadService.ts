import { SupabaseClient } from "@supabase/supabase-js";

export class PhotoUploadService {
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = "player-photos";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Upload une photo vers Supabase Storage
   * @param uri URI locale de l'image
   * @param playerId ID du joueur (utilisé pour nommer le fichier)
   * @returns URL publique de l'image uploadée
   */
  async uploadPlayerPhoto(
    uri: string,
    playerId: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // 1. Créer un nom de fichier unique
      const timestamp = Date.now();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${playerId}_${timestamp}.${fileExt}`;

      // 2. Créer FormData pour l'upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      // 3. Upload vers Supabase Storage avec FormData
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Error uploading photo:", error);
        return { url: null, error: error.message };
      }

      // 4. Récupérer l'URL publique
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

      console.log("✅ Photo uploaded successfully:", publicUrl);
      return { url: publicUrl, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Exception uploading photo:", errorMessage);
      return { url: null, error: errorMessage };
    }
  }

  /**
   * Supprime une photo de Supabase Storage
   * @param photoUrl URL publique de la photo à supprimer
   */
  async deletePhoto(photoUrl: string): Promise<boolean> {
    try {
      // Extraire le nom du fichier depuis l'URL
      const fileName = photoUrl.split("/").pop();
      if (!fileName) {
        return false;
      }

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        console.error("Error deleting photo:", error);
        return false;
      }

      console.log("✅ Photo deleted successfully");
      return true;
    } catch (err) {
      console.error("Exception deleting photo:", err);
      return false;
    }
  }
}
