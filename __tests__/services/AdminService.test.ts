import { AdminService } from "../../services/AdminService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockSingle = jest.fn();

let capturedAuthCallback: ((event: string, session: any) => void) | null = null;

const mockOnAuthStateChange = jest.fn().mockImplementation((cb: any) => {
  capturedAuthCallback = cb;
  return { data: { subscription: { unsubscribe: jest.fn() } } };
});

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
};

jest.mock("../../src/config/supabase", () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
    from: () => mockQueryBuilder,
  },
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AdminService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAuthCallback = null;
    // Reset singleton between tests
    (AdminService as any).instance = undefined;
    // Re-register callback capture
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedAuthCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
  });

  // ─── Singleton ──────────────────────────────────────────────────────────────

  describe("singleton", () => {
    it("retourne toujours la même instance", () => {
      const a = AdminService.getInstance();
      const b = AdminService.getInstance();
      expect(a).toBe(b);
    });

    it("enregistre un listener sur onAuthStateChange à l'instanciation", () => {
      AdminService.getInstance();
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    });
  });

  // ─── isAdmin ────────────────────────────────────────────────────────────────

  describe("isAdmin", () => {
    it("retourne false si aucun utilisateur connecté", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await AdminService.getInstance().isAdmin();

      expect(result).toBe(false);
    });

    it("retourne false si utilisateur absent de la table admins (PGRST116)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "no rows" } });

      const result = await AdminService.getInstance().isAdmin();

      expect(result).toBe(false);
    });

    it("retourne true si l'utilisateur est dans la table admins", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const result = await AdminService.getInstance().isAdmin();

      expect(result).toBe(true);
    });

    it("retourne false en cas d'erreur DB autre que PGRST116", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: null, error: { code: "500", message: "DB error" } });

      const result = await AdminService.getInstance().isAdmin();

      expect(result).toBe(false);
    });

    it("retourne false en cas d'erreur réseau inattendue", async () => {
      mockGetUser.mockRejectedValue(new Error("network error"));

      const result = await AdminService.getInstance().isAdmin();

      expect(result).toBe(false);
    });

    it("utilise le cache lors d'un deuxième appel (DB interrogée une seule fois)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      await service.isAdmin();
      await service.isAdmin();

      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getCachedStatus ────────────────────────────────────────────────────────

  describe("getCachedStatus", () => {
    it("retourne null avant le premier appel à isAdmin", () => {
      expect(AdminService.getInstance().getCachedStatus()).toBeNull();
    });

    it("retourne true après isAdmin() si l'utilisateur est admin", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      await service.isAdmin();

      expect(service.getCachedStatus()).toBe(true);
    });

    it("retourne false après isAdmin() si l'utilisateur n'est pas admin", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const service = AdminService.getInstance();
      await service.isAdmin();

      expect(service.getCachedStatus()).toBe(false);
    });
  });

  // ─── clearCache ─────────────────────────────────────────────────────────────

  describe("clearCache", () => {
    it("vide le cache et force un nouvel appel DB au prochain isAdmin()", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      await service.isAdmin();

      service.clearCache();
      expect(service.getCachedStatus()).toBeNull();

      await service.isAdmin();
      expect(mockGetUser).toHaveBeenCalledTimes(2);
    });
  });

  // ─── refreshAdminStatus ─────────────────────────────────────────────────────

  describe("refreshAdminStatus", () => {
    it("force le refresh et retourne le nouveau statut", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle
        .mockResolvedValueOnce({ data: { user_id: "user-1" }, error: null }) // initial: admin
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }); // après refresh: plus admin

      const service = AdminService.getInstance();
      await service.isAdmin();

      const refreshed = await service.refreshAdminStatus();

      expect(refreshed).toBe(false);
      expect(mockGetUser).toHaveBeenCalledTimes(2);
    });
  });

  // ─── invalidation du cache sur changement d'auth ────────────────────────────

  describe("invalidation du cache via onAuthStateChange", () => {
    it("vide le cache quand l'utilisateur change", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      await service.isAdmin();
      expect(service.getCachedStatus()).toBe(true);

      // Simulate auth state change: new user
      capturedAuthCallback!("SIGNED_IN", { user: { id: "user-2" } });

      expect(service.getCachedStatus()).toBeNull();
    });

    it("vide le cache quand l'utilisateur se déconnecte (session null)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      // Establish currentUserId first
      capturedAuthCallback!("SIGNED_IN", { user: { id: "user-1" } });
      await service.isAdmin();
      expect(service.getCachedStatus()).toBe(true);

      // Sign out: null session → currentUserId changes to null → cache cleared
      capturedAuthCallback!("SIGNED_OUT", null);

      expect(service.getCachedStatus()).toBeNull();
    });

    it("ne vide pas le cache si c'est le même utilisateur", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });

      const service = AdminService.getInstance();
      // First callback sets currentUserId to "user-1"
      capturedAuthCallback!("SIGNED_IN", { user: { id: "user-1" } });
      await service.isAdmin();
      expect(service.getCachedStatus()).toBe(true);

      // Same user re-auth — currentUserId already "user-1" so no cache clear
      capturedAuthCallback!("TOKEN_REFRESHED", { user: { id: "user-1" } });

      expect(service.getCachedStatus()).toBe(true);
    });
  });
});
