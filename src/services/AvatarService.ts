/**
 * AvatarService
 *
 * Avatars of the players: their photo, or their initials.
 * Initials are drawn locally: a player's name never leaves the app for this.
 */

import { INITIALS_AVATAR } from "../../constants/avatarConstants";
import { PDF_COLORS } from "../theme/colors";

const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{M}\p{N}]/gu;

export class AvatarService {
  /**
   * Whether the player has a usable photo URL
   */
  static hasPhoto(photoUrl?: string | null): photoUrl is string {
    return !!photoUrl && photoUrl.trim() !== "";
  }

  /**
   * Initials of a player: first letter of the first and last words,
   * or the first two letters of a single word ("Joueur 4" gives "J4")
   */
  static getInitials(playerName: string): string {
    const words = playerName
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(NOT_LETTER_OR_DIGIT, ""))
      .filter((word) => word !== "");
    if (words.length === 0) return "";

    const firstWord = Array.from(words[0]);
    const letters =
      words.length === 1
        ? firstWord.slice(0, INITIALS_AVATAR.maxInitials)
        : [firstWord[0], Array.from(words[words.length - 1])[0]];

    return letters.join("").toUpperCase();
  }

  /**
   * Image source for HTML documents (PDF exports): the photo, or an inline SVG
   * of the initials
   */
  static getHtmlImageSource(playerName: string, photoUrl?: string | null): string {
    return AvatarService.hasPhoto(photoUrl)
      ? photoUrl
      : AvatarService.buildInitialsDataUri(playerName);
  }

  private static buildInitialsDataUri(playerName: string): string {
    const { svgSize, svgBaselineRatio, fontSizeRatio, fontWeight } = INITIALS_AVATAR;
    const { headerBg, text } = PDF_COLORS.card;
    const center = svgSize / 2;
    const fontSize = svgSize * fontSizeRatio;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">` +
      `<rect width="${svgSize}" height="${svgSize}" fill="${headerBg}"/>` +
      `<text x="${center}" y="${center + fontSize * svgBaselineRatio}" text-anchor="middle" ` +
      `font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${text}">` +
      `${AvatarService.getInitials(playerName)}</text></svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}
