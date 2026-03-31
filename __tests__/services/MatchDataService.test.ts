import { MatchDataService } from "../../services/MatchDataService";
import { Team } from "../../src/models/types";

// ─── Mock repositories ────────────────────────────────────────────────────────

const mockActionRepo = {
  getActionsForMatch: jest.fn(),
};

const mockMatchPlayerRepo = {
  getPlayersForMatch: jest.fn(),
};

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockSingle = jest.fn();
const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
};
const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeLocalMatch = (overrides: any = {}) => ({
  id: 1,
  synced_to_server: 0,
  ...overrides,
});

const makeSyncedMatch = (overrides: any = {}) => ({
  id: 1,
  supabase_id: "uuid-match-1",
  synced_to_server: 1,
  ...overrides,
});

const makeLocalAction = (overrides: any = {}) => ({
  action_type: "2pt_made",
  specification: "layup",
  points: 2,
  player_number: 10,
  team: Team.MY_TEAM,
  timestamp: "2024-01-01T00:01:00Z",
  period_number: 1,
  time_in_period: 60,
  semantic_x: 0.5,
  semantic_y: 0.3,
  ...overrides,
});

const makeMatchPlayer = (overrides: any = {}) => ({
  player_number: 10,
  player_name: "John Doe",
  team: "MyTeam",
  is_starter: true,
  photo_url: "https://example.com/photo.jpg",
  playing_time_seconds: 300,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchDataService", () => {
  let service: MatchDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnThis();
    queryBuilder.eq.mockReturnThis();
    service = new MatchDataService(
      mockSupabase,
      mockActionRepo as any,
      mockMatchPlayerRepo as any
    );
  });

  // ─── loadMatchDetails — routage ──────────────────────────────────────────────

  describe("loadMatchDetails — routage local vs Supabase", () => {
    it("charge depuis le local si le match n'est pas syncé", async () => {
      mockActionRepo.getActionsForMatch.mockResolvedValue([]);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue([]);

      await service.loadMatchDetails(makeLocalMatch() as any);

      expect(mockActionRepo.getActionsForMatch).toHaveBeenCalledWith(1);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("charge depuis Supabase si le match est syncé avec supabase_id", async () => {
      mockSingle.mockResolvedValue({
        data: { players: [], player_stats: {} },
        error: null,
      });

      await service.loadMatchDetails(makeSyncedMatch() as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("matches");
      expect(mockActionRepo.getActionsForMatch).not.toHaveBeenCalled();
    });
  });

  // ─── loadFromLocal ──────────────────────────────────────────────────────────

  describe("loadFromLocal", () => {
    it("retourne actions et players mappés depuis SQLite", async () => {
      mockActionRepo.getActionsForMatch.mockResolvedValue([makeLocalAction()]);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue([makeMatchPlayer()]);

      const result = await service.loadMatchDetails(makeLocalMatch() as any);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({
        type: "2pt_made",
        points: 2,
        player: 10,
        team: Team.MY_TEAM,
        period_number: 1,
      });
      expect(result.actions[0].timestamp).toBeInstanceOf(Date);
      expect(result.actions[0].position).toEqual({ x: 0, y: 0 });

      expect(result.players).toHaveLength(1);
      expect(result.players[0]).toMatchObject({
        id: 10,
        num: 10,
        name: "John Doe",
        isSubstitute: false,
        photoUrl: "https://example.com/photo.jpg",
        playingTimeSeconds: 300,
      });
    });

    it("isSubstitute = true si is_starter = false", async () => {
      mockActionRepo.getActionsForMatch.mockResolvedValue([]);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue([
        makeMatchPlayer({ is_starter: false }),
      ]);

      const result = await service.loadMatchDetails(makeLocalMatch() as any);

      expect(result.players[0].isSubstitute).toBe(true);
    });

    it("photo_url null → photoUrl undefined", async () => {
      mockActionRepo.getActionsForMatch.mockResolvedValue([]);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue([
        makeMatchPlayer({ photo_url: null }),
      ]);

      const result = await service.loadMatchDetails(makeLocalMatch() as any);

      expect(result.players[0].photoUrl).toBeUndefined();
    });
  });

  // ─── loadFromSupabase ───────────────────────────────────────────────────────

  describe("loadFromSupabase", () => {
    it("retourne { actions: [], players: [] } si data est null", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await service.loadMatchDetails(makeSyncedMatch() as any);

      expect(result).toEqual({ actions: [], players: [] });
    });

    it("lève une erreur si Supabase retourne une erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

      await expect(service.loadMatchDetails(makeSyncedMatch() as any)).rejects.toThrow(
        "Failed to load match: Not found"
      );
    });

    it("mappe correctement players et actions depuis Supabase", async () => {
      const supabaseMatch = {
        players: [
          {
            player_id: "player-uuid-1",
            player_number: 10,
            player_name: "John Doe",
            team: Team.MY_TEAM,
            is_starter: true,
            photo_url: null,
            playing_time_seconds: 500,
          },
        ],
        player_stats: {
          "player-uuid-1": {
            actions: [
              {
                action_type: "3pt_made",
                specification: "catch_and_shoot",
                points: 3,
                team: Team.MY_TEAM,
                timestamp: "2024-01-01T00:05:00Z",
                period_number: 1,
                time_in_period: 120,
                semantic_x: 0.7,
                semantic_y: 0.2,
              },
            ],
          },
        },
      };
      mockSingle.mockResolvedValue({ data: supabaseMatch, error: null });

      const result = await service.loadMatchDetails(makeSyncedMatch() as any);

      expect(result.players).toHaveLength(1);
      expect(result.players[0]).toMatchObject({
        id: 10,
        name: "John Doe",
        isSubstitute: false,
        playingTimeSeconds: 500,
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({
        type: "3pt_made",
        points: 3,
        player: 10, // player_number résolu depuis player_id
        team: Team.MY_TEAM,
        semanticPosition: { xNormalized: 0.7, yNormalized: 0.2 },
      });
    });

    it("ignore les actions si player_id est inconnu", async () => {
      const supabaseMatch = {
        players: [
          { player_id: "known-id", player_number: 5, player_name: "A", team: Team.MY_TEAM, is_starter: true },
        ],
        player_stats: {
          "unknown-id": {
            actions: [{ action_type: "foul", points: 0, team: Team.MY_TEAM, timestamp: "2024-01-01T00:01:00Z", period_number: 1, time_in_period: 10, semantic_x: 0, semantic_y: 0 }],
          },
        },
      };
      mockSingle.mockResolvedValue({ data: supabaseMatch, error: null });

      const result = await service.loadMatchDetails(makeSyncedMatch() as any);

      expect(result.actions).toHaveLength(0);
    });
  });
});
