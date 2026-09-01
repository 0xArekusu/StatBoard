import { renderHook, act, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { useReviewPrompt, recordReviewPromptSignal } from "../../hooks/useReviewPrompt";
import { ANALYTICS_EVENTS } from "../../constants/analyticsEvents";
import { ROUTES } from "../../constants/routes";

// ─── AsyncStorage mock ─────────────────────────────────────────────────────────

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args),
}));

// ─── expo-store-review mock ────────────────────────────────────────────────────

const mockIsAvailableAsync = jest.fn();
const mockRequestReview = jest.fn();

jest.mock("expo-store-review", () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  requestReview: () => mockRequestReview(),
}));

// ─── posthog mock ───────────────────────────────────────────────────────────────

const mockCapture = jest.fn();
const mockPosthogClient = { capture: mockCapture };

jest.mock("posthog-react-native", () => ({
  usePostHog: () => mockPosthogClient,
}));

// ─── supabase mock (app_config) ────────────────────────────────────────────────

const mockMaybeSingle = jest.fn();
const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
};

jest.mock("../../src/config/supabase", () => ({
  supabase: { from: jest.fn(() => mockQueryBuilder) },
}));

// ─── logger mock ────────────────────────────────────────────────────────────────

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

let mockOpenURL: jest.SpyInstance;

/** Sans config app_config dans les tests de recordReviewPromptSignal (non utilisée). */
beforeEach(() => {
  jest.clearAllMocks();
  mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // repli sur le seuil par défaut (3) par défaut
  mockOpenURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

afterEach(() => {
  mockOpenURL.mockRestore();
});

// ─── recordReviewPromptSignal ────────────────────────────────────────────────

describe("recordReviewPromptSignal", () => {
  it("part de 0 et incrémente à 1 si aucun score existant", async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_answered" ? null : null)
    );

    await recordReviewPromptSignal();

    expect(mockSetItem).toHaveBeenCalledWith("@review_prompt_score", "1");
  });

  it("incrémente un score existant", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "@review_prompt_answered") return Promise.resolve(null);
      if (key === "@review_prompt_score") return Promise.resolve("2");
      return Promise.resolve(null);
    });

    await recordReviewPromptSignal();

    expect(mockSetItem).toHaveBeenCalledWith("@review_prompt_score", "3");
  });

  it("ne fait rien si l'utilisateur a déjà répondu au popup", async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_answered" ? "true" : "0")
    );

    await recordReviewPromptSignal();

    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

// ─── useReviewPrompt — affichage ─────────────────────────────────────────────

describe("useReviewPrompt — affichage", () => {
  it("n'affiche jamais le popup sur un écran hors allowlist, même si le score dépasse le seuil", async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "5" : null)
    );

    const { result } = renderHook(() => useReviewPrompt(ROUTES.LIVE_MATCH));

    await waitFor(() => {
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    expect(result.current.visible).toBe(false);
  });

  it("n'affiche pas le popup si le score est sous le seuil", async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "2" : null)
    );

    const { result } = renderHook(() => useReviewPrompt("Dashboard"));

    await waitFor(() => {
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    expect(result.current.visible).toBe(false);
  });

  it("affiche le popup sur un écran safe quand le score atteint le seuil par défaut (3)", async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "3" : null)
    );

    const { result } = renderHook(() => useReviewPrompt(ROUTES.MATCH_DETAILS));

    await waitFor(() => {
      expect(result.current.visible).toBe(true);
    });

    expect(mockCapture).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.REVIEW_PROMPT_SHOWN,
      expect.objectContaining({ score: 3, threshold: 3, screen: ROUTES.MATCH_DETAILS })
    );
  });

  it("n'affiche pas le popup si l'utilisateur a déjà répondu", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "@review_prompt_answered") return Promise.resolve("true");
      if (key === "@review_prompt_score") return Promise.resolve("10");
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useReviewPrompt("Dashboard"));

    await waitFor(() => {
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    expect(result.current.visible).toBe(false);
  });

  it("utilise le seuil configuré à distance via app_config", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: "1" }, error: null });
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "1" : null)
    );

    const { result } = renderHook(() => useReviewPrompt("Dashboard"));

    await waitFor(() => {
      expect(result.current.visible).toBe(true);
    });
  });

  it("retombe sur le seuil par défaut si app_config est injoignable", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "network error" } });
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "3" : null)
    );

    const { result } = renderHook(() => useReviewPrompt("Dashboard"));

    await waitFor(() => {
      expect(result.current.visible).toBe(true);
    });
  });
});

// ─── useReviewPrompt — réponses ──────────────────────────────────────────────

describe("useReviewPrompt — réponses", () => {
  const renderVisible = async () => {
    mockGetItem.mockImplementation((key: string) =>
      Promise.resolve(key === "@review_prompt_score" ? "3" : null)
    );
    const hook = renderHook(() => useReviewPrompt("Dashboard"));
    await waitFor(() => expect(hook.result.current.visible).toBe(true));
    return hook;
  };

  it("onLike masque le popup, marque répondu et déclenche l'avis natif si disponible", async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    const { result } = await renderVisible();

    await act(async () => {
      await result.current.onLike();
    });

    expect(result.current.visible).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith("@review_prompt_answered", "true");
    expect(mockCapture).toHaveBeenCalledWith(ANALYTICS_EVENTS.REVIEW_PROMPT_LIKED);
    expect(mockRequestReview).toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith(ANALYTICS_EVENTS.REVIEW_PROMPT_NATIVE_REQUESTED);
  });

  it("onLike ne déclenche pas l'avis natif si indisponible", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    const { result } = await renderVisible();

    await act(async () => {
      await result.current.onLike();
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("onDislike masque le popup, marque répondu et ouvre un email de feedback", async () => {
    const { result } = await renderVisible();

    await act(async () => {
      await result.current.onDislike();
    });

    expect(result.current.visible).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith("@review_prompt_answered", "true");
    expect(mockCapture).toHaveBeenCalledWith(ANALYTICS_EVENTS.REVIEW_PROMPT_DISLIKED);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:contact.coachassistant@gmail.com")
    );
  });
});
