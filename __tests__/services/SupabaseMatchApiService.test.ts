import { SupabaseMatchApiService } from "../../src/services/api/SupabaseMatchApiService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const mockInsertActions = jest.fn();
const mockInsertMatch = jest.fn();

// Factory pour chaîner .from(...).insert(...).select().single()
const createMatchChain = (result: any) => ({
  insert: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(result),
    }),
  }),
});

const createActionsChain = (result: any) => ({
  insert: jest.fn().mockResolvedValue(result),
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "matches") return mockInsertMatch();
      if (table === "match_actions") return mockInsertActions();
    },
  })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makePayload = (overrides: any = {}) => ({
  match: {
    id: "local-1",
    my_team_name: "Lions",
    players: [{ player_number: 7, player_name: "John" }],
    ...overrides.match,
  },
  actions: overrides.actions ?? [],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabaseMatchApiService", () => {
  let service: SupabaseMatchApiService;
  const mockAdapter: any = { adapt: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SupabaseMatchApiService("https://fake.supabase.co", "fake-key", mockAdapter);
  });

  // ─── uploadMatch ──────────────────────────────────────────────────────────

  describe("uploadMatch", () => {
    it("insère le match et retourne sans erreur si pas d'actions", async () => {
      mockInsertMatch.mockReturnValue(
        createMatchChain({ data: { id: "server-1" }, error: null })
      );

      await expect(service.uploadMatch(makePayload())).resolves.toBeUndefined();

      expect(mockInsertMatch).toHaveBeenCalledTimes(1);
      expect(mockInsertActions).not.toHaveBeenCalled();
    });

    it("insère le match ET les actions si payload.actions est non vide", async () => {
      const payload = makePayload({ actions: [{ action_type: "shot" }] });
      mockInsertMatch.mockReturnValue(
        createMatchChain({ data: { id: "server-2" }, error: null })
      );
      mockInsertActions.mockReturnValue(
        createActionsChain({ error: null })
      );

      await service.uploadMatch(payload);

      expect(mockInsertMatch).toHaveBeenCalledTimes(1);
      expect(mockInsertActions).toHaveBeenCalledTimes(1);
    });

    it("ajoute match_id aux actions lors de l'insertion", async () => {
      const payload = makePayload({ actions: [{ action_type: "rebound" }] });
      mockInsertMatch.mockReturnValue(
        createMatchChain({ data: { id: "server-3" }, error: null })
      );

      let capturedActions: any[] = [];
      mockInsertActions.mockReturnValue({
        insert: jest.fn().mockImplementation((actions) => {
          capturedActions = actions;
          return Promise.resolve({ error: null });
        }),
      });

      await service.uploadMatch(payload);

      expect(capturedActions[0].match_id).toBe("server-3");
    });

    it("lance une erreur si l'insertion du match échoue", async () => {
      mockInsertMatch.mockReturnValue(
        createMatchChain({ data: null, error: { message: "DB constraint error" } })
      );

      await expect(service.uploadMatch(makePayload())).rejects.toThrow(
        "Failed to insert match"
      );
    });

    it("lance une erreur si l'insertion des actions échoue", async () => {
      const payload = makePayload({ actions: [{ action_type: "foul" }] });
      mockInsertMatch.mockReturnValue(
        createMatchChain({ data: { id: "server-4" }, error: null })
      );
      mockInsertActions.mockReturnValue(
        createActionsChain({ error: { message: "Actions insert failed" } })
      );

      await expect(service.uploadMatch(payload)).rejects.toThrow("Failed to insert actions");
    });
  });
});
