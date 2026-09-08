import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useMatchSync } from "../../hooks/useMatchSync";
import i18n from "../../src/i18n";

// These tests assert French copy directly, so pin the language regardless of
// the device locale the test environment resolves (jest-expo mocks it to "en").
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ─── Navigation mock ──────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── useInterstitialAd mock ───────────────────────────────────────────────────

const mockShowInterstitial = jest.fn().mockResolvedValue(undefined);

jest.mock("../../hooks/useInterstitialAd", () => ({
  useInterstitialAd: () => ({ showIfReady: (...args: any[]) => mockShowInterstitial(...args) }),
}));

// ─── MatchSyncService mock ────────────────────────────────────────────────────
// Le hook utilise un import dynamique (`await import(...)`).
// Pour garantir que le mock est appliqué à chaque test (y compris après clearAllMocks),
// on ré-applique l'implémentation du constructeur dans beforeEach via require().

const mockCheckSyncEligibility = jest.fn();
const mockSyncMatch = jest.fn();

jest.mock("../../src/services/api/MatchSyncService", () => ({
  MatchSyncService: jest.fn(),
}));

// ─── Repository mocks (instanciations internes dans fetchAndNavigateToLocalMatch)

const mockGetPlayersForMatch = jest.fn();
const mockGetActionsForMatch = jest.fn();

jest.mock("../../src/services/database/MatchRepository", () => ({
  MatchRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn().mockResolvedValue(null),
    updateFinalScores: jest.fn().mockResolvedValue(undefined),
    updateOvertimePeriods: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../src/services/database/MatchPlayerRepository", () => ({
  MatchPlayerRepository: jest.fn().mockImplementation(() => ({
    getPlayersForMatch: (...args: any[]) => mockGetPlayersForMatch(...args),
  })),
}));

jest.mock("../../src/services/database/ActionRepository", () => ({
  ActionRepository: jest.fn().mockImplementation(() => ({
    getActionsForMatch: (...args: any[]) => mockGetActionsForMatch(...args),
  })),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── useReviewPrompt mock (import indirect via useMatchSync) ──────────────────

jest.mock("../../hooks/useReviewPrompt", () => ({
  recordReviewPromptSignal: jest.fn(),
}));

// ─── Supabase mock (pour fetchAndNavigateToSyncedMatch) ───────────────────────

const mockSupabaseSingle = jest.fn();
const mockSupabaseQB: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSupabaseSingle,
};

const mockSupabase: any = {
  from: jest.fn(() => mockSupabaseQB),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeProps = (overrides: any = {}) => ({
  currentMatchId: "match-1",
  match: { location: "home", scoreHome: 80, scoreAway: 75 },
  quarter: 4,
  maxPeriods: 4,
  saveMatchState: jest.fn().mockResolvedValue(undefined),
  matchManager: { endMatch: jest.fn().mockResolvedValue(undefined) },
  // findById ici est celui appelé depuis les props du hook (fetchAndNavigateToLocalMatch).
  // Il est distinct de new MatchRepository().findById (utilisé par MatchSyncService en interne).
  matchRepository: {
    findById: jest.fn().mockResolvedValue(null),
    updateFinalScores: jest.fn().mockResolvedValue(undefined),
    updateOvertimePeriods: jest.fn().mockResolvedValue(undefined),
  },
  supabase: mockSupabase,
  user: { id: "user-1" },
  ...overrides,
});

/** Run endMatchAndSync — setTimeout est mocké pour s'exécuter immédiatement. */
async function runEndMatch(result: any) {
  await act(async () => {
    await result.current.endMatchAndSync();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useMatchSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseQB.select.mockReturnThis();
    mockSupabaseQB.eq.mockReturnThis();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    // Ré-appliquer l'implémentation du constructeur MatchSyncService après clearAllMocks,
    // car le hook l'importe dynamiquement et le mock doit être à jour à chaque test.
    const { MatchSyncService } =
      require("../../src/services/api/MatchSyncService") as {
        MatchSyncService: jest.Mock;
      };
    MatchSyncService.mockImplementation(() => ({
      checkSyncEligibility: (...args: any[]) => mockCheckSyncEligibility(...args),
      syncMatch: (...args: any[]) => mockSyncMatch(...args),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── État initial ─────────────────────────────────────────────────────────────

  it("isSyncing démarre à false", () => {
    const { result } = renderHook(() => useMatchSync(makeProps()));
    expect(result.current.isSyncing).toBe(false);
  });

  // ─── Pas de currentMatchId ────────────────────────────────────────────────────

  it("retourne immédiatement si currentMatchId est null", async () => {
    const props = makeProps({ currentMatchId: null });
    const { result } = renderHook(() => useMatchSync(props));

    await act(async () => {
      await result.current.endMatchAndSync();
    });

    expect(props.saveMatchState).not.toHaveBeenCalled();
  });

  // ─── Sync éligible + succès ───────────────────────────────────────────────────

  it("navigue vers le match Supabase après un sync réussi", async () => {
    mockCheckSyncEligibility.mockResolvedValue({ canSync: true });
    mockSyncMatch.mockResolvedValue({ success: true, matchId: "supabase-uuid" });
    mockSupabaseSingle.mockResolvedValue({
      data: { id: "supabase-uuid", players: [], player_stats: {} },
      error: null,
    });

    const props = makeProps();
    const { result } = renderHook(() => useMatchSync(props));

    await runEndMatch(result);

    expect(mockNavigate).toHaveBeenCalledWith(
      "MatchDetails",
      expect.objectContaining({ fromLiveMatch: true })
    );
    expect(result.current.isSyncing).toBe(false);
  });

  // ─── Sync éligible + échec ────────────────────────────────────────────────────

  it("affiche une Alert si le sync échoue", async () => {
    mockCheckSyncEligibility.mockResolvedValue({ canSync: true });
    mockSyncMatch.mockResolvedValue({ success: false, error: "Erreur réseau" });

    const props = makeProps();
    const { result } = renderHook(() => useMatchSync(props));

    await runEndMatch(result);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Erreur de synchronisation",
      expect.stringContaining("Erreur réseau"),
      expect.any(Array),
      expect.any(Object)
    );
  });

  // ─── Non éligible + utilisateur connecté ──────────────────────────────────────

  it("navigue vers le dashboard si non éligible et utilisateur connecté", async () => {
    mockCheckSyncEligibility.mockResolvedValue({ canSync: false, reason: "Abonnement requis" });

    const props = makeProps({ user: { id: "user-1" } });
    const { result } = renderHook(() => useMatchSync(props));

    await runEndMatch(result);

    expect(mockNavigate).toHaveBeenCalledWith("MainTabs");
  });

  // ─── Non éligible + invité ────────────────────────────────────────────────────

  it("navigue vers le match local si non éligible et utilisateur invité", async () => {
    mockCheckSyncEligibility.mockResolvedValue({ canSync: false, reason: "Non connecté" });
    mockGetPlayersForMatch.mockResolvedValue([]);
    mockGetActionsForMatch.mockResolvedValue([]);

    // Le hook appelle matchRepository.findById depuis les props (pas new MatchRepository()).
    // On passe donc un matchRepository personnalisé avec un findById qui retourne des données.
    const props = makeProps({
      user: null,
      matchRepository: {
        findById: jest.fn().mockResolvedValue({ id: "match-1", status: "completed" }),
        updateFinalScores: jest.fn().mockResolvedValue(undefined),
        updateOvertimePeriods: jest.fn().mockResolvedValue(undefined),
      },
    });
    const { result } = renderHook(() => useMatchSync(props));

    await runEndMatch(result);

    expect(mockNavigate).toHaveBeenCalledWith(
      "MatchDetails",
      expect.objectContaining({ isLocalMatch: true, fromLiveMatch: true })
    );
  });

  // ─── Erreur lors de la gestion du match ──────────────────────────────────────

  it("appelle goBack si endMatch plante", async () => {
    const props = makeProps();
    props.matchManager.endMatch = jest.fn().mockRejectedValue(new Error("SQLite crash"));

    const { result } = renderHook(() => useMatchSync(props));

    await runEndMatch(result);

    expect(mockGoBack).toHaveBeenCalled();
    expect(result.current.isSyncing).toBe(false);
  });
});
