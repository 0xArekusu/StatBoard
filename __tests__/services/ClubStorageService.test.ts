import { ClubStorageService } from "../../services/ClubStorageService";

// ─── Logger mock ──────────────────────────────────────────────────────────────

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Supabase Storage mock ────────────────────────────────────────────────────

const mockUpload = jest.fn();
const mockRemove = jest.fn();

const mockStorageBucket: any = {
  upload: (...args: any[]) => mockUpload(...args),
  remove: (...args: any[]) => mockRemove(...args),
};

const mockSupabase: any = {
  storage: {
    from: jest.fn(() => mockStorageBucket),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClubStorageService", () => {
  let service: ClubStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClubStorageService(mockSupabase);
  });

  // ─── uploadClubLogo ───────────────────────────────────────────────────────

  describe("uploadClubLogo", () => {
    it("retourne le chemin si l'upload réussit", async () => {
      mockUpload.mockResolvedValue({ data: { path: "club-c1/logo-c1.jpg" }, error: null });

      const result = await service.uploadClubLogo("file.jpg", "c1");

      expect(result.path).toBe("club-c1/logo-c1.jpg");
      expect(result.error).toBeNull();
    });

    it("utilise le bon nom de fichier (club-{clubId}/logo-{clubId}.{ext})", async () => {
      mockUpload.mockResolvedValue({ data: {}, error: null });

      await service.uploadClubLogo("photo.png", "club-42");

      const uploadedFileName = mockUpload.mock.calls[0][0];
      expect(uploadedFileName).toBe("club-club-42/logo-club-42.png");
    });

    it("retourne path=null et l'erreur si Supabase échoue", async () => {
      mockUpload.mockResolvedValue({ data: null, error: { message: "Storage error" } });

      const result = await service.uploadClubLogo("file.jpg", "c1");

      expect(result.path).toBeNull();
      expect(result.error).toBe("Storage error");
    });

    it("retourne path=null et l'erreur si une exception est levée", async () => {
      mockUpload.mockRejectedValue(new Error("Network failure"));

      const result = await service.uploadClubLogo("file.jpg", "c1");

      expect(result.path).toBeNull();
      expect(result.error).toBe("Network failure");
    });

    it("convertit jpg en jpeg pour le contentType", async () => {
      mockUpload.mockResolvedValue({ data: {}, error: null });

      await service.uploadClubLogo("photo.jpg", "c1");

      const uploadOptions = mockUpload.mock.calls[0][2];
      expect(uploadOptions.contentType).toBe("image/jpeg");
    });
  });

  // ─── uploadPlayerPhoto ────────────────────────────────────────────────────

  describe("uploadPlayerPhoto", () => {
    it("retourne le chemin si l'upload réussit", async () => {
      mockUpload.mockResolvedValue({ data: {}, error: null });

      const result = await service.uploadPlayerPhoto("photo.jpg", "p1", "t1", "c1");

      expect(result.path).toBe("club-c1/team-t1/player-p1.jpg");
      expect(result.error).toBeNull();
    });

    it("retourne path=null si Supabase échoue", async () => {
      mockUpload.mockResolvedValue({ data: null, error: { message: "Upload failed" } });

      const result = await service.uploadPlayerPhoto("photo.jpg", "p1", "t1", "c1");

      expect(result.path).toBeNull();
      expect(result.error).toBe("Upload failed");
    });

    it("retourne path=null si une exception est levée", async () => {
      mockUpload.mockRejectedValue(new Error("Crash"));

      const result = await service.uploadPlayerPhoto("photo.jpg", "p1", "t1", "c1");

      expect(result.path).toBeNull();
      expect(result.error).toBe("Crash");
    });
  });

  // ─── uploadCoachPhoto ─────────────────────────────────────────────────────

  describe("uploadCoachPhoto", () => {
    it("retourne le chemin si l'upload réussit", async () => {
      mockUpload.mockResolvedValue({ data: {}, error: null });

      const result = await service.uploadCoachPhoto("coach.png", "t1", "c1");

      expect(result.path).toBe("club-c1/team-t1/coach-t1.png");
      expect(result.error).toBeNull();
    });

    it("retourne path=null si Supabase échoue", async () => {
      mockUpload.mockResolvedValue({ data: null, error: { message: "Upload failed" } });

      const result = await service.uploadCoachPhoto("coach.jpg", "t1", "c1");

      expect(result.path).toBeNull();
    });
  });

  // ─── deleteClubLogo ───────────────────────────────────────────────────────

  describe("deleteClubLogo", () => {
    it("retourne true si la suppression réussit", async () => {
      mockRemove.mockResolvedValue({ error: null });

      const result = await service.deleteClubLogo(
        "https://cdn.example.com/club-c1/logo-c1.jpg"
      );

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(["club-c1/logo-c1.jpg"]);
    });

    it("retourne false si l'URL n'a pas le format attendu (pas de 'logo-')", async () => {
      const result = await service.deleteClubLogo("https://cdn.example.com/invalid/path.jpg");

      expect(result).toBe(false);
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it("retourne false si Supabase échoue", async () => {
      mockRemove.mockResolvedValue({ error: { message: "Delete failed" } });

      const result = await service.deleteClubLogo(
        "https://cdn.example.com/club-c1/logo-c1.jpg"
      );

      expect(result).toBe(false);
    });

    it("retourne false si une exception est levée", async () => {
      mockRemove.mockRejectedValue(new Error("Network error"));

      const result = await service.deleteClubLogo(
        "https://cdn.example.com/club-c1/logo-c1.jpg"
      );

      expect(result).toBe(false);
    });
  });

  // ─── deleteCoachPhoto ─────────────────────────────────────────────────────

  describe("deleteCoachPhoto", () => {
    it("retourne true si la suppression réussit", async () => {
      mockRemove.mockResolvedValue({ error: null });

      const result = await service.deleteCoachPhoto(
        "https://cdn.example.com/club-c1/team-t1/coach-t1.jpg"
      );

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(["club-c1/team-t1/coach-t1.jpg"]);
    });

    it("retourne false si l'URL n'a pas le format attendu", async () => {
      const result = await service.deleteCoachPhoto("https://cdn.example.com/invalid.jpg");

      expect(result).toBe(false);
    });

    it("retourne false si Supabase échoue", async () => {
      mockRemove.mockResolvedValue({ error: { message: "Delete error" } });

      const result = await service.deleteCoachPhoto(
        "https://cdn.example.com/club-c1/team-t1/coach-t1.jpg"
      );

      expect(result).toBe(false);
    });
  });

  // ─── deletePlayerPhoto ────────────────────────────────────────────────────

  describe("deletePlayerPhoto", () => {
    it("retourne true si la suppression réussit", async () => {
      mockRemove.mockResolvedValue({ error: null });

      const result = await service.deletePlayerPhoto(
        "https://cdn.example.com/club-c1/team-t1/player-p1.jpg"
      );

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(["club-c1/team-t1/player-p1.jpg"]);
    });

    it("retourne false si l'URL n'a pas le format attendu", async () => {
      const result = await service.deletePlayerPhoto(
        "https://cdn.example.com/invalid.jpg"
      );

      expect(result).toBe(false);
    });

    it("retourne false si Supabase échoue", async () => {
      mockRemove.mockResolvedValue({ error: { message: "Delete error" } });

      const result = await service.deletePlayerPhoto(
        "https://cdn.example.com/club-c1/team-t1/player-p1.jpg"
      );

      expect(result).toBe(false);
    });
  });
});
