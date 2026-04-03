import { MatchSyncService } from "../../src/services/api/MatchSyncService";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";

// ─── Repository / Service mocks ───────────────────────────────────────────────

const mockMatchFindById = jest.fn();
const mockMatchDelete = jest.fn();
const mockMatchFindUnsynced = jest.fn();
const mockActionGetForMatch = jest.fn();
const mockActionDeleteForMatch = jest.fn();
const mockPlayerGetForMatch = jest.fn();
const mockPlayerDeleteForMatch = jest.fn();
const mockGetClubSubscriptionInfo = jest.fn();

jest.mock("../../src/services/database/MatchRepository", () => ({
  MatchRepository: jest.fn().mockImplementation(() => ({
    findById: (...args: any[]) => mockMatchFindById(...args),
    delete: (...args: any[]) => mockMatchDelete(...args),
    findUnsyncedCompletedMatches: (...args: any[]) => mockMatchFindUnsynced(...args),
  })),
}));

jest.mock("../../src/services/database/ActionRepository", () => ({
  ActionRepository: jest.fn().mockImplementation(() => ({
    getActionsForMatch: (...args: any[]) => mockActionGetForMatch(...args),
    deleteActionsForMatch: (...args: any[]) => mockActionDeleteForMatch(...args),
  })),
}));

jest.mock("../../src/services/database/MatchPlayerRepository", () => ({
  MatchPlayerRepository: jest.fn().mockImplementation(() => ({
    getPlayersForMatch: (...args: any[]) => mockPlayerGetForMatch(...args),
    deletePlayersForMatch: (...args: any[]) => mockPlayerDeleteForMatch(...args),
  })),
}));

jest.mock("../../services/SubscriptionService", () => ({
  SubscriptionService: jest.fn().mockImplementation(() => ({
    getClubSubscriptionInfo: (...args: any[]) => mockGetClubSubscriptionInfo(...args),
  })),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockInsertSingle = jest.fn();

const mockMatchesQB: any = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: mockInsertSingle,
};

const mockSupabase: any = {
  auth: {
    getUser: (...args: any[]) => mockGetUser(...args),
  },
  from: jest.fn(() => mockMatchesQB),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeMatch = (overrides: any = {}) => ({
  id: "match-1",
  status: "completed",
  synced_to_server: false,
  club_id: null,
  team_id: null,
  my_team_name: "Lions",
  opponent_name: "Tigers",
  is_home: 1,
  total_periods: 4,
  period_duration: 600,
  overtime_duration: null,
  overtime_periods: 0,
  my_team_score: 80,
  opponent_score: 75,
  created_at: "2024-01-01T09:00:00Z",
  started_at: "2024-01-01T10:00:00Z",
  ended_at: "2024-01-01T12:00:00Z",
  ...overrides,
});

const makePlayer = (overrides: any = {}) => ({
  player_id: "player-1",
  player_number: 10,
  player_name: "John",
  team: "A",
  is_starter: true,
  photo_url: null,
  on_court: 1,
  playing_time_seconds: 1200,
  ...overrides,
});

const makeAction = (overrides: any = {}) => ({
  team: "A",
  player_number: 10,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.3,
  action_order: 1,
  period_number: 1,
  time_in_period: 120,
  timestamp: "2024-01-01T10:02:00Z",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchSyncService", () => {
  let service: MatchSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchesQB.insert.mockReturnThis();
    mockMatchesQB.select.mockReturnThis();
    service = new MatchSyncService(mockSupabase);
  });

  // ─── checkSyncEligibility ────────────────────────────────────────────────────

  describe("checkSyncEligibility", () => {
    it("refuse si l'utilisateur n'est pas authentifié", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("connecté");
    });

    it("refuse si une erreur d'auth survient", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Auth error" } });

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
    });

    it("refuse si le match est introuvable", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(null);

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("introuvable");
    });

    it("refuse si le match n'est pas terminé", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ status: "in_progress" }));

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("terminés");
    });

    it("refuse si le match est déjà synchronisé", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ synced_to_server: true }));

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("déjà");
    });

    it("refuse si l'abonnement du club ne permet pas la synchro", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ club_id: "club-1" }));
      mockGetClubSubscriptionInfo.mockResolvedValue({
        tier: "free",
        limits: { canSyncToServer: false },
      });

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("abonnement");
    });

    it("refuse si l'info d'abonnement est introuvable", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ club_id: "club-1" }));
      mockGetClubSubscriptionInfo.mockResolvedValue(null);

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
    });

    it("autorise un match de club avec abonnement actif", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ club_id: "club-1" }));
      mockGetClubSubscriptionInfo.mockResolvedValue({
        tier: "basic",
        limits: { canSyncToServer: true },
      });

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(true);
    });

    it("autorise un match personnel (sans club_id) pour tout utilisateur connecté", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch({ club_id: null }));

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(true);
      expect(mockGetClubSubscriptionInfo).not.toHaveBeenCalled();
    });

    it("retourne canSync:false en cas d'erreur inattendue", async () => {
      mockGetUser.mockRejectedValue(new Error("network error"));

      const result = await service.checkSyncEligibility("match-1");

      expect(result.canSync).toBe(false);
      expect(result.reason).toContain("Erreur");
    });
  });

  // ─── syncMatch ───────────────────────────────────────────────────────────────

  describe("syncMatch", () => {
    beforeEach(() => {
      // Default: eligible personal match
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockMatchFindById.mockResolvedValue(makeMatch());
      mockActionGetForMatch.mockResolvedValue([]);
      mockPlayerGetForMatch.mockResolvedValue([]);
      mockActionDeleteForMatch.mockResolvedValue(undefined);
      mockPlayerDeleteForMatch.mockResolvedValue(undefined);
      mockMatchDelete.mockResolvedValue(undefined);
    });

    it("retourne success:false si le match n'est pas éligible", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await service.syncMatch("match-1");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("retourne success:false si Supabase refuse l'insertion", async () => {
      mockInsertSingle.mockResolvedValue({
        data: null,
        error: { message: "RLS violation", code: "42501" },
      });

      const result = await service.syncMatch("match-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("RLS violation");
    });

    it("retourne success:true et l'id Supabase après sync réussi", async () => {
      mockInsertSingle.mockResolvedValue({
        data: { id: "supabase-uuid-1" },
        error: null,
      });

      const result = await service.syncMatch("match-1");

      expect(result.success).toBe(true);
      expect(result.matchId).toBe("supabase-uuid-1");
    });

    it("supprime les données locales après un sync réussi", async () => {
      mockInsertSingle.mockResolvedValue({ data: { id: "supabase-uuid-1" }, error: null });

      await service.syncMatch("match-1");

      expect(mockActionDeleteForMatch).toHaveBeenCalledWith("match-1");
      expect(mockPlayerDeleteForMatch).toHaveBeenCalledWith("match-1");
      expect(mockMatchDelete).toHaveBeenCalledWith("match-1");
    });

    it("ne supprime pas les données locales si le sync échoue", async () => {
      mockInsertSingle.mockResolvedValue({
        data: null,
        error: { message: "error", code: "500" },
      });

      await service.syncMatch("match-1");

      expect(mockActionDeleteForMatch).not.toHaveBeenCalled();
      expect(mockMatchDelete).not.toHaveBeenCalled();
    });

    it("inclut les joueurs et actions dans le payload Supabase", async () => {
      const player = makePlayer();
      const action = makeAction();
      mockPlayerGetForMatch.mockResolvedValue([player]);
      mockActionGetForMatch.mockResolvedValue([action]);
      mockInsertSingle.mockResolvedValue({ data: { id: "uuid" }, error: null });

      await service.syncMatch("match-1");

      const insertedData = mockMatchesQB.insert.mock.calls[0][0];
      expect(insertedData.players).toHaveLength(1);
      expect(insertedData.players[0].player_number).toBe(10);
      expect(insertedData.player_stats["player-1"].actions).toHaveLength(1);
    });
  });

  // ─── syncAllPendingMatches ───────────────────────────────────────────────────

  describe("syncAllPendingMatches", () => {
    it("retourne synced:0 si aucun match en attente", async () => {
      mockMatchFindUnsynced.mockResolvedValue([]);

      const result = await service.syncAllPendingMatches();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("compte correctement les succès et échecs", async () => {
      mockMatchFindUnsynced.mockResolvedValue([
        makeMatch({ id: "match-1" }),
        makeMatch({ id: "match-2" }),
        makeMatch({ id: "match-3" }),
      ]);
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mockActionGetForMatch.mockResolvedValue([]);
      mockPlayerGetForMatch.mockResolvedValue([]);
      mockActionDeleteForMatch.mockResolvedValue(undefined);
      mockPlayerDeleteForMatch.mockResolvedValue(undefined);
      mockMatchDelete.mockResolvedValue(undefined);

      // match-1 and match-3 succeed, match-2 fails at DB insert
      mockMatchFindById
        .mockResolvedValueOnce(makeMatch({ id: "match-1" }))
        .mockResolvedValueOnce(makeMatch({ id: "match-2" }))
        .mockResolvedValueOnce(makeMatch({ id: "match-2" })) // called again in syncMatch
        .mockResolvedValueOnce(makeMatch({ id: "match-3" }))
        .mockResolvedValueOnce(makeMatch({ id: "match-3" }));

      mockInsertSingle
        .mockResolvedValueOnce({ data: { id: "uuid-1" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "fail" } })
        .mockResolvedValueOnce({ data: { id: "uuid-3" }, error: null });

      const result = await service.syncAllPendingMatches();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it("retourne des erreurs si le repository plante", async () => {
      mockMatchFindUnsynced.mockRejectedValue(new Error("SQLite error"));

      const result = await service.syncAllPendingMatches();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors[0]).toContain("SQLite error");
    });
  });
});
