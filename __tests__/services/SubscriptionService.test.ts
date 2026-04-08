import { SubscriptionService } from "../../services/SubscriptionService";
import { SUBSCRIPTION_LIMITS } from "../../models/Subscription";

// ─── Per-table queryBuilders ──────────────────────────────────────────────────
// canCreateTeam / getClubSubscriptionInfo query "clubs", "subscription_plans", and "teams"
// Using distinct builders avoids shared-mock conflicts.

const clubsSingle = jest.fn();
const plansSingle = jest.fn();
const plansOrder = jest.fn();

const clubsQB: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: clubsSingle,
};

const plansQB: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: plansOrder,
  single: plansSingle,
};

const teamsQB: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
};

const mockSupabase: any = {
  from: jest.fn((table: string) => {
    if (table === "clubs") return clubsQB;
    if (table === "subscription_plans") return plansQB;
    return teamsQB; // "teams"
  }),
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Setup the 3-eq chain for team count that ends with a resolved value */
const setupTeamsCount = (count: number | null, error: any = null) => {
  teamsQB.eq
    .mockReturnValueOnce(teamsQB)
    .mockReturnValueOnce(teamsQB)
    .mockResolvedValueOnce({ count, error });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SubscriptionService", () => {
  let service: SubscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mockReturnThis for all queryBuilder methods
    clubsQB.select.mockReturnThis();
    clubsQB.eq.mockReturnThis();
    plansQB.select.mockReturnThis();
    plansQB.eq.mockReturnThis();
    plansQB.order.mockReturnThis();
    teamsQB.select.mockReturnThis();
    teamsQB.eq.mockReturnThis();
    service = new SubscriptionService(mockSupabase);
  });

  // ─── getLimitsForTier ───────────────────────────────────────────────────────

  describe("getLimitsForTier", () => {
    it("retourne les limites depuis la DB", async () => {
      plansSingle.mockResolvedValue({
        data: { name: "Basic", max_teams: 1, max_local_matches: 999, can_sync_to_server: true, price_monthly: 4.99 },
        error: null,
      });

      const result = await service.getLimitsForTier("basic");

      expect(result.maxTeams).toBe(1);
      expect(result.canSyncToServer).toBe(true);
      expect(result.name).toBe("Basic");
    });

    it("retourne les limites hardcodées si la DB échoue", async () => {
      plansSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await service.getLimitsForTier("premium");

      expect(result).toEqual(SUBSCRIPTION_LIMITS["premium"]);
    });

    it("utilise le cache lors d'un deuxième appel", async () => {
      plansSingle.mockResolvedValue({
        data: { name: "Free", max_teams: 0, max_local_matches: 3, can_sync_to_server: false, price_monthly: 0 },
        error: null,
      });

      await service.getLimitsForTier("free");
      await service.getLimitsForTier("free");

      expect(plansSingle).toHaveBeenCalledTimes(1);
    });
  });

  // ─── canCreateTeam ──────────────────────────────────────────────────────────

  describe("canCreateTeam", () => {
    it("retourne allowed:false si le club est introuvable", async () => {
      clubsSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await service.canCreateTeam("club-1");

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Club introuvable");
    });

    it("retourne allowed:true si sous la limite", async () => {
      clubsSingle.mockResolvedValue({ data: { subscription_tier: "basic" }, error: null });
      plansSingle.mockResolvedValue({ data: null, error: { message: "no plan" } }); // fallback → basic.maxTeams=1
      setupTeamsCount(0); // 0 < 1 → allowed

      const result = await service.canCreateTeam("club-1");

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe("basic");
      expect(result.currentCount).toBe(0);
      expect(result.maxAllowed).toBe(SUBSCRIPTION_LIMITS.basic.maxTeams);
    });

    it("retourne allowed:false si à la limite", async () => {
      clubsSingle.mockResolvedValue({ data: { subscription_tier: "basic" }, error: null });
      plansSingle.mockResolvedValue({ data: null, error: { message: "no plan" } }); // fallback → basic.maxTeams=1
      setupTeamsCount(1); // 1 >= 1 → not allowed

      const result = await service.canCreateTeam("club-1");

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Limite atteinte");
    });

    it("retourne allowed:false si erreur de count", async () => {
      clubsSingle.mockResolvedValue({ data: { subscription_tier: "premium" }, error: null });
      plansSingle.mockResolvedValue({ data: null, error: { message: "no plan" } });
      teamsQB.eq
        .mockReturnValueOnce(teamsQB)
        .mockReturnValueOnce(teamsQB)
        .mockResolvedValueOnce({ count: null, error: { message: "count error" } });

      const result = await service.canCreateTeam("club-1");

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Erreur lors du comptage des équipes");
    });
  });

  // ─── getClubSubscriptionInfo ─────────────────────────────────────────────────

  describe("getClubSubscriptionInfo", () => {
    it("retourne null si le club est introuvable", async () => {
      clubsSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await service.getClubSubscriptionInfo("club-1");

      expect(result).toBeNull();
    });

    it("retourne tier, limits et currentTeamCount", async () => {
      clubsSingle.mockResolvedValue({ data: { subscription_tier: "premium" }, error: null });
      plansSingle.mockResolvedValue({ data: null, error: { message: "no plan" } }); // fallback
      setupTeamsCount(2);

      const result = await service.getClubSubscriptionInfo("club-1");

      expect(result?.tier).toBe("premium");
      expect(result?.limits).toEqual(SUBSCRIPTION_LIMITS.premium);
      expect(result?.currentTeamCount).toBe(2);
    });
  });

  // ─── getAllPlans ─────────────────────────────────────────────────────────────

  describe("getAllPlans", () => {
    it("retourne les plans depuis la DB", async () => {
      plansOrder.mockResolvedValue({
        data: [
          { tier: "free", name: "Free", max_teams: 0, max_local_matches: 3, can_sync_to_server: false, price_monthly: 0 },
          { tier: "basic", name: "Basic", max_teams: 1, max_local_matches: 999, can_sync_to_server: true, price_monthly: 4.99 },
        ],
        error: null,
      });

      const result = await service.getAllPlans();

      expect(result).toHaveLength(2);
      expect(result[0].tier).toBe("free");
      expect(result[1].limits.maxTeams).toBe(1);
    });

    it("retourne les plans hardcodés si la DB est vide", async () => {
      plansOrder.mockResolvedValue({ data: [], error: null });

      const result = await service.getAllPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((p) => p.tier === "free")).toBe(true);
    });

    it("retourne les plans hardcodés si la DB échoue", async () => {
      plansOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await service.getAllPlans();

      expect(result.length).toBeGreaterThan(0);
    });

    it("met à jour le cache après getAllPlans", async () => {
      plansOrder.mockResolvedValue({
        data: [
          { tier: "basic", name: "Basic", max_teams: 2, max_local_matches: 100, can_sync_to_server: true, price_monthly: 5 },
        ],
        error: null,
      });

      await service.getAllPlans();
      // Le cache est chaud → getLimitsForTier ne doit plus appeler la DB
      const limits = await service.getLimitsForTier("basic");

      expect(limits.maxTeams).toBe(2); // valeur issue de getAllPlans, pas de la DB individuelle
      expect(plansSingle).not.toHaveBeenCalled();
    });
  });
});
