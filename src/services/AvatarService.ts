/**
 * AvatarService
 *
 * Service for generating avatar URLs for players
 * Uses ui-avatars.com API when player doesn't have a photo
 */

export class AvatarService {
  /**
   * Get the avatar URL for a player
   *
   * @param playerName - The name of the player
   * @param photoUrl - Optional photo URL from player profile
   * @returns The avatar URL to use (photo or generated avatar)
   */
  static getAvatarUrl(playerName: string, photoUrl?: string | null): string {
    // If player has a photo, use it
    if (photoUrl && photoUrl.trim() !== '') {
      return photoUrl;
    }

    // Otherwise, generate an avatar from ui-avatars.com
    // Clean the player name to handle cases like "Joueur 4"
    const encodedName = encodeURIComponent(playerName);

    return `https://ui-avatars.com/api/?name=${encodedName}&rounded=true&size=128`;
  }

  /**
   * Check if a URL is a valid photo URL (not a generated avatar)
   *
   * @param url - The URL to check
   * @returns true if it's a player's actual photo, false if it's a generated avatar
   */
  static isPlayerPhoto(url: string): boolean {
    return !url.includes('ui-avatars.com');
  }
}
