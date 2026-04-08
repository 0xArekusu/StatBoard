import { AvatarService } from "../../src/services/AvatarService";

describe("AvatarService", () => {
  // ─── getAvatarUrl ──────────────────────────────────────────────────────────

  describe("getAvatarUrl", () => {
    it("retourne la photoUrl si elle est fournie et non vide", () => {
      const url = "https://cdn.example.com/player.jpg";
      expect(AvatarService.getAvatarUrl("John", url)).toBe(url);
    });

    it("génère un avatar ui-avatars si aucune photo n'est fournie", () => {
      const result = AvatarService.getAvatarUrl("John Doe");
      expect(result).toContain("ui-avatars.com");
      expect(result).toContain(encodeURIComponent("John Doe"));
    });

    it("génère un avatar si photoUrl est null", () => {
      const result = AvatarService.getAvatarUrl("Marie", null);
      expect(result).toContain("ui-avatars.com");
    });

    it("génère un avatar si photoUrl est undefined", () => {
      const result = AvatarService.getAvatarUrl("Pierre");
      expect(result).toContain("ui-avatars.com");
    });

    it("génère un avatar si photoUrl est une chaîne vide", () => {
      const result = AvatarService.getAvatarUrl("Ali", "");
      expect(result).toContain("ui-avatars.com");
    });

    it("génère un avatar si photoUrl ne contient que des espaces", () => {
      const result = AvatarService.getAvatarUrl("Ali", "   ");
      expect(result).toContain("ui-avatars.com");
    });

    it("encode correctement les noms avec espaces", () => {
      const result = AvatarService.getAvatarUrl("Joueur 4");
      expect(result).toContain(encodeURIComponent("Joueur 4"));
    });

    it("l'URL générée contient rounded=true et size=128", () => {
      const result = AvatarService.getAvatarUrl("Test");
      expect(result).toContain("rounded=true");
      expect(result).toContain("size=128");
    });
  });

  // ─── isPlayerPhoto ─────────────────────────────────────────────────────────

  describe("isPlayerPhoto", () => {
    it("retourne true pour une URL de photo réelle", () => {
      expect(AvatarService.isPlayerPhoto("https://cdn.example.com/player.jpg")).toBe(true);
    });

    it("retourne false pour une URL ui-avatars.com", () => {
      expect(
        AvatarService.isPlayerPhoto(
          "https://ui-avatars.com/api/?name=John&rounded=true"
        )
      ).toBe(false);
    });

    it("retourne true pour une URL Supabase Storage", () => {
      expect(
        AvatarService.isPlayerPhoto(
          "https://xyz.supabase.co/storage/v1/object/sign/clubs/player.jpg"
        )
      ).toBe(true);
    });
  });
});
