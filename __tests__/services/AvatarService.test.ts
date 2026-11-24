import { AvatarService } from "../../src/services/AvatarService";

const PHOTO_URL = "https://cdn.example.com/player.jpg";
const NO_PHOTO_VALUES = [undefined, null, "", "   "];

describe("AvatarService", () => {
  // ─── hasPhoto ──────────────────────────────────────────────────────────────

  describe("hasPhoto", () => {
    it("retourne true pour une URL de photo", () => {
      expect(AvatarService.hasPhoto(PHOTO_URL)).toBe(true);
    });

    it.each(NO_PHOTO_VALUES)("retourne false sans photo (%p)", (photoUrl) => {
      expect(AvatarService.hasPhoto(photoUrl)).toBe(false);
    });
  });

  // ─── getInitials ───────────────────────────────────────────────────────────

  describe("getInitials", () => {
    it.each([
      ["John Doe", "JD"],
      ["Marie", "MA"],
      ["Joueur 4", "J4"],
      ["Jean Paul Durand", "JD"],
      ["  lucas   martin ", "LM"],
      ["Élodie Œuvrard", "ÉŒ"],
      ["O'Neal", "ON"],
      ["A", "A"],
      ["<b> & \"c\"", "BC"],
      ["", ""],
      ["---", ""],
    ])("%p donne %p", (name, initials) => {
      expect(AvatarService.getInitials(name)).toBe(initials);
    });
  });

  // ─── getHtmlImageSource ────────────────────────────────────────────────────

  describe("getHtmlImageSource", () => {
    it("retourne la photo si elle est fournie", () => {
      expect(AvatarService.getHtmlImageSource("John", PHOTO_URL)).toBe(PHOTO_URL);
    });

    it.each(NO_PHOTO_VALUES)("dessine les initiales localement sans photo (%p)", (photoUrl) => {
      const source = AvatarService.getHtmlImageSource("Élodie Doe", photoUrl);
      expect(source).toMatch(/^data:image\/svg\+xml/);
      expect(decodeURIComponent(source)).toContain(">ÉD</text>");
    });

    it("n'envoie ni le nom ni une requête à un service externe", () => {
      const source = AvatarService.getHtmlImageSource("John Doe");
      expect(source).not.toMatch(/^https?:/);
      expect(decodeURIComponent(source)).not.toContain("John");
    });
  });
});
