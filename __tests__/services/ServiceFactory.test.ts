import { ServiceFactory } from "../../services/ServiceFactory";

// ─── Mocks pour toutes les dépendances ────────────────────────────────────────

// Bloque la chaîne AsyncStorage (importée via src/config/supabase)
jest.mock("../../src/config/supabase", () => ({
  supabase: { auth: {}, from: jest.fn() },
}));

jest.mock("../../repositories/SupabaseClubRepository");
jest.mock("../../repositories/SupabaseClubMemberRepository");
jest.mock("../../repositories/SupabaseTeamRepository");
jest.mock("../../repositories/SupabasePlayerRepository");
jest.mock("../../services/ClubService");
jest.mock("../../services/ClubMemberService");
jest.mock("../../services/TeamService");
jest.mock("../../services/PlayerService");
jest.mock("../../services/SubscriptionService");
jest.mock("../../services/MatchDataService");
jest.mock("../../services/MatchListService");
jest.mock("../../src/services/api/MatchSyncService");
jest.mock("../../src/services/database/ActionRepository");
jest.mock("../../src/services/database/MatchRepository");

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ServiceFactory", () => {
  const mockSupabase: any = { auth: {}, from: jest.fn() };

  beforeEach(() => {
    ServiceFactory.reset();
  });

  afterEach(() => {
    ServiceFactory.reset();
  });

  // ─── Pattern Singleton ────────────────────────────────────────────────────

  it("getClubService retourne la même instance (singleton)", () => {
    const a = ServiceFactory.getClubService(mockSupabase);
    const b = ServiceFactory.getClubService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getClubMemberService retourne la même instance", () => {
    const a = ServiceFactory.getClubMemberService(mockSupabase);
    const b = ServiceFactory.getClubMemberService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getTeamService retourne la même instance", () => {
    const a = ServiceFactory.getTeamService(mockSupabase);
    const b = ServiceFactory.getTeamService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getPlayerService retourne la même instance", () => {
    const a = ServiceFactory.getPlayerService(mockSupabase);
    const b = ServiceFactory.getPlayerService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getSubscriptionService retourne la même instance", () => {
    const a = ServiceFactory.getSubscriptionService(mockSupabase);
    const b = ServiceFactory.getSubscriptionService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getMatchDataService retourne la même instance", () => {
    const a = ServiceFactory.getMatchDataService(mockSupabase);
    const b = ServiceFactory.getMatchDataService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getMatchListService retourne la même instance", () => {
    const a = ServiceFactory.getMatchListService(mockSupabase);
    const b = ServiceFactory.getMatchListService(mockSupabase);
    expect(a).toBe(b);
  });

  it("getMatchSyncService retourne la même instance", () => {
    const a = ServiceFactory.getMatchSyncService(mockSupabase);
    const b = ServiceFactory.getMatchSyncService(mockSupabase);
    expect(a).toBe(b);
  });

  // ─── reset ────────────────────────────────────────────────────────────────

  it("reset vide toutes les instances", () => {
    const before = ServiceFactory.getClubService(mockSupabase);
    ServiceFactory.reset();
    const after = ServiceFactory.getClubService(mockSupabase);
    expect(after).not.toBe(before);
  });

  it("les services sont indépendants après reset", () => {
    ServiceFactory.getClubService(mockSupabase);
    ServiceFactory.getSubscriptionService(mockSupabase);
    ServiceFactory.reset();

    // Re-création indépendante après reset
    const clubService = ServiceFactory.getClubService(mockSupabase);
    const subService = ServiceFactory.getSubscriptionService(mockSupabase);
    expect(clubService).toBeDefined();
    expect(subService).toBeDefined();
  });
});
