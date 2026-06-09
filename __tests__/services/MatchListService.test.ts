import { MatchListService } from "../../services/MatchListService";
import { MatchStatus } from "../../src/models/types";

// ─── Mock repositories ────────────────────────────────────────────────────────

const mockMatchRepo = {
  getAllMatches: jest.fn(),
  findActiveMatch: jest.fn(),
  delete: jest.fn(),
};

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockOrder = jest.fn();
const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: mockOrder,
};
const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeLocalMatch = (overrides: any = {}) => ({
  id: 1,
  my_team_name: "Lions",
  opponent_name: "Tigers",
  status: MatchStatus.COMPLETED,
  synced_to_server: 0,
  club_id: "club-1",
  team_id: "team-1",
  created_at: "2024-01-01T00:00:00Z",
  ended_at: "2024-01-01T02:00:00Z",
  ...overrides,
});

const makeServerMatch = (overrides: any = {}) => ({
  id: "uuid-1",
  my_team_name: "Lions",
  opponent_name: "Bears",
  is_home: true,
  status: "completed",
  total_periods: 4,
  period_duration: 600,
  club_id: "club-1",
  team_id: "team-1",
  my_team_score: 80,
  opponent_score: 70,
  created_at: "2024-01-02T00:00:00Z",
  started_at: "2024-01-02T00:00:00Z",
  ended_at: "2024-01-02T02:00:00Z",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchListService", () => {
  let service: MatchListService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnThis();
    queryBuilder.eq.mockReturnThis();
    service = new MatchListService(mockSupabase, mockMatchRepo as any);
  });

  // ─── loadAllMatches ──────────────────────────────────────────────────────────

  describe("loadAllMatches", () => {
    it("en mode guest (userId=null), retourne uniquement les matches locaux non-syncés et terminés", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([
        makeLocalMatch({ id: 1, status: MatchStatus.COMPLETED, synced_to_server: 0 }),
        makeLocalMatch({ id: 2, status: MatchStatus.IN_PROGRESS, synced_to_server: 0 }),
        makeLocalMatch({ id: 3, status: MatchStatus.COMPLETED, synced_to_server: 1 }),
      ]);

      const result = await service.loadAllMatches(null);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("avec userId, filtre les locaux par club et team", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([
        makeLocalMatch({ id: 1, club_id: "club-1", team_id: "team-1" }),
        makeLocalMatch({ id: 2, club_id: "club-2", team_id: "team-1" }),
        makeLocalMatch({ id: 3, club_id: "club-1", team_id: "team-2" }),
      ]);
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await service.loadAllMatches("user-1", "club-1", "team-1");

      expect(result.filter((m) => m.id > 0)).toHaveLength(1);
      expect(result.find((m) => m.id === 1)).toBeDefined();
    });

    it("avec userId, charge et mappe les matches serveur", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([]);
      mockOrder.mockResolvedValue({
        data: [makeServerMatch()],
        error: null,
      });

      const result = await service.loadAllMatches("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].synced_to_server).toBe(1);
      expect(result[0].id).toBe(-1); // IDs négatifs pour les matches serveur
      expect((result[0] as any).supabase_id).toBe("uuid-1");
    });

    it("les matches serveur ont is_home converti en 0/1", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([]);
      mockOrder.mockResolvedValue({
        data: [makeServerMatch({ is_home: true }), makeServerMatch({ id: "uuid-2", is_home: false })],
        error: null,
      });

      const result = await service.loadAllMatches("user-1");

      expect(result[0].is_home).toBe(1);
      expect(result[1].is_home).toBe(0);
    });

    it("continue sans erreur si Supabase échoue", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([makeLocalMatch()]);
      mockOrder.mockResolvedValue({ data: null, error: { message: "network error" } });

      const result = await service.loadAllMatches("user-1");

      // Retourne uniquement les matches locaux
      expect(result).toHaveLength(1);
    });

    it("merge les matches locaux et serveur", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([makeLocalMatch({ id: 5 })]);
      mockOrder.mockResolvedValue({ data: [makeServerMatch()], error: null });

      const result = await service.loadAllMatches("user-1");

      expect(result).toHaveLength(2);
    });

    it("applique les filtres clubId et teamId sur la requête Supabase", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([]);
      mockOrder.mockResolvedValue({ data: [], error: null });

      await service.loadAllMatches("user-1", "club-1", "team-1");

      expect(queryBuilder.eq).toHaveBeenCalledWith("club_id", "club-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("team_id", "team-1");
    });
  });

  // ─── loadAllMatchesSorted ────────────────────────────────────────────────────

  describe("loadAllMatchesSorted", () => {
    it("trie les matches par date décroissante", async () => {
      mockMatchRepo.getAllMatches.mockResolvedValue([
        makeLocalMatch({ id: 1, ended_at: "2024-01-01T00:00:00Z" }),
        makeLocalMatch({ id: 2, ended_at: "2024-03-01T00:00:00Z" }),
        makeLocalMatch({ id: 3, ended_at: "2024-02-01T00:00:00Z" }),
      ]);
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await service.loadAllMatchesSorted("user-1");

      expect(result[0].id).toBe(2); // le plus récent
      expect(result[1].id).toBe(3);
      expect(result[2].id).toBe(1);
    });
  });

  // ─── findActiveMatch / deleteMatch ───────────────────────────────────────────

  describe("findActiveMatch", () => {
    it("délègue au repository sans paramètres", async () => {
      const match = makeLocalMatch({ status: MatchStatus.IN_PROGRESS });
      mockMatchRepo.findActiveMatch.mockResolvedValue(match);
      expect(await service.findActiveMatch()).toBe(match);
    });

    it("passe clubId au repository (mode guest avec GUEST_IDS.CLUB)", async () => {
      mockMatchRepo.findActiveMatch.mockResolvedValue(null);

      await service.findActiveMatch("guest-club");

      expect(mockMatchRepo.findActiveMatch).toHaveBeenCalledWith("guest-club", undefined);
    });

    it("passe clubId et teamId au repository (mode connecté)", async () => {
      const match = makeLocalMatch({ status: MatchStatus.IN_PROGRESS });
      mockMatchRepo.findActiveMatch.mockResolvedValue(match);

      const result = await service.findActiveMatch("club-1", "team-1");

      expect(mockMatchRepo.findActiveMatch).toHaveBeenCalledWith("club-1", "team-1");
      expect(result).toBe(match);
    });

    it("retourne null si aucun match actif trouvé", async () => {
      mockMatchRepo.findActiveMatch.mockResolvedValue(null);

      const result = await service.findActiveMatch("club-1", "team-1");

      expect(result).toBeNull();
    });
  });

  describe("deleteMatch", () => {
    it("délègue au repository", async () => {
      mockMatchRepo.delete.mockResolvedValue(undefined);
      await service.deleteMatch("match-1");
      expect(mockMatchRepo.delete).toHaveBeenCalledWith("match-1");
    });
  });
});
