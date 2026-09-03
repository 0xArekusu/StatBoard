import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../../src/contexts/AuthContext";
import i18n from "../../src/i18n";

// These tests assert French copy directly, so pin the language regardless of
// the device locale the test environment resolves (jest-expo mocks it to "en").
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lazy closures are required here: jest.mock is hoisted BEFORE const declarations,
// so variables must be captured at call time, not at factory-evaluation time.

const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signInWithIdToken: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  setSession: jest.fn(),
  updateUser: jest.fn(),
};

jest.mock("../../src/config/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockAuth.getSession(...args),
      onAuthStateChange: (...args: any[]) => mockAuth.onAuthStateChange(...args),
      signUp: (...args: any[]) => mockAuth.signUp(...args),
      signInWithPassword: (...args: any[]) => mockAuth.signInWithPassword(...args),
      signInWithIdToken: (...args: any[]) => mockAuth.signInWithIdToken(...args),
      signOut: (...args: any[]) => mockAuth.signOut(...args),
      resetPasswordForEmail: (...args: any[]) => mockAuth.resetPasswordForEmail(...args),
      setSession: (...args: any[]) => mockAuth.setSession(...args),
      updateUser: (...args: any[]) => mockAuth.updateUser(...args),
    },
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: "FULL_NAME", EMAIL: "EMAIL" },
}));

jest.mock("@sentry/react-native", () => ({ setUser: jest.fn() }));
jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));
jest.mock("../../src/config/terms", () => ({ CURRENT_TERMS_VERSION: "v2" }));

// Import after mocks
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: any = {}) => ({
  id: "user-1",
  email: "user@example.com",
  user_metadata: { terms_version: "v2", full_name: "John Doe" },
  ...overrides,
});

const makeSession = (user = makeUser()) => ({ user, access_token: "tok", expires_at: 9999 });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active session, auth listener is registered
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  // ─── état initial ────────────────────────────────────────────────────────────

  describe("état initial", () => {
    it("démarre en chargement (loading=true, session=null)", () => {
      // Freeze getSession so it never resolves
      mockAuth.getSession.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.loading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it("loading passe à false après la résolution de la session initiale", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("restaure la session si une session active existe", async () => {
      const session = makeSession();
      mockAuth.getSession.mockResolvedValue({ data: { session }, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user?.id).toBe("user-1"));
      expect(result.current.session).toBe(session);
    });
  });

  // ─── useAuth hors Provider ───────────────────────────────────────────────────

  describe("useAuth hors Provider", () => {
    it("lève une erreur si utilisé hors AuthProvider", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider"
      );
      spy.mockRestore();
    });
  });

  // ─── signIn ─────────────────────────────────────────────────────────────────

  describe("signIn", () => {
    it("retourne error en cas d'échec", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signIn("user@example.com", "wrong");
      });

      expect(res.error).toBeDefined();
    });

    it("retourne needsTermsAcceptance=true si terms_version est obsolète", async () => {
      const user = makeUser({ user_metadata: { terms_version: "v1" } });
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user, session: makeSession(user) },
        error: null,
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signIn("user@example.com", "pass");
      });

      expect(res.error).toBeNull();
      expect(res.needsTermsAcceptance).toBe(true);
    });

    it("retourne needsTermsAcceptance=false si terms_version est à jour", async () => {
      const user = makeUser();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user, session: makeSession(user) },
        error: null,
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signIn("user@example.com", "pass");
      });

      expect(res.needsTermsAcceptance).toBe(false);
    });
  });

  // ─── signUp ─────────────────────────────────────────────────────────────────

  describe("signUp", () => {
    it("retourne error en cas d'échec", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: "Email taken" },
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signUp("user@example.com", "pass");
      });

      expect(res.error.message).toBe("Email taken");
    });

    it("traduit les erreurs de rate limiting", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: "For security purposes, please wait after 30 seconds" },
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signUp("user@example.com", "pass");
      });

      expect(res.error.message).toContain("30 secondes");
    });

    it("succès — retourne { error: null }", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: makeUser(), session: null },
        error: null,
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signUp("user@example.com", "pass", "John");
      });

      expect(res.error).toBeNull();
    });
  });

  // ─── signInWithGoogle ────────────────────────────────────────────────────────

  describe("signInWithGoogle", () => {
    it("succès avec idToken → retourne needsTermsAcceptance", async () => {
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
        data: { idToken: "google-id-token", user: { email: "g@example.com" } },
      });
      mockAuth.signInWithIdToken.mockResolvedValue({
        data: { user: makeUser() },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithGoogle();
      });

      expect(res.error).toBeNull();
      expect(mockAuth.signInWithIdToken).toHaveBeenCalledWith({
        provider: "google",
        token: "google-id-token",
      });
    });

    it("retourne error si pas d'idToken", async () => {
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
        data: { idToken: null, user: { email: "g@example.com" } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithGoogle();
      });

      expect(res.error).toBeDefined();
    });

    it("retourne error en cas d'exception GoogleSignin", async () => {
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(new Error("Play services error"));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithGoogle();
      });

      expect(res.error).toBeDefined();
    });
  });

  // ─── signInWithApple ─────────────────────────────────────────────────────────

  describe("signInWithApple", () => {
    it("succès avec identityToken → retourne needsTermsAcceptance", async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
        identityToken: "apple-identity-token",
      });
      mockAuth.signInWithIdToken.mockResolvedValue({
        data: { user: makeUser() },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithApple();
      });

      expect(res.error).toBeNull();
      expect(mockAuth.signInWithIdToken).toHaveBeenCalledWith({
        provider: "apple",
        token: "apple-identity-token",
      });
    });

    it("retourne { error: null } si l'utilisateur annule (ERR_REQUEST_CANCELED)", async () => {
      const cancelError: any = new Error("Cancelled");
      cancelError.code = "ERR_REQUEST_CANCELED";
      (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(cancelError);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithApple();
      });

      expect(res.error).toBeNull();
      expect(res.needsTermsAcceptance).toBe(false);
    });

    it("retourne error si pas d'identityToken", async () => {
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.signInWithApple();
      });

      expect(res.error).toBeDefined();
    });
  });

  // ─── signOut ─────────────────────────────────────────────────────────────────

  describe("signOut", () => {
    it("appelle Google signOut et Supabase signOut", async () => {
      (GoogleSignin.signOut as jest.Mock).mockResolvedValue(undefined);
      mockAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(GoogleSignin.signOut).toHaveBeenCalled();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it("ne plante pas si Google signOut échoue", async () => {
      (GoogleSignin.signOut as jest.Mock).mockRejectedValue(new Error("not signed in"));
      mockAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => { await result.current.signOut(); })
      ).resolves.not.toThrow();
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("délègue à supabase.auth.resetPasswordForEmail", async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.resetPassword("user@example.com");
      });

      expect(res.error).toBeNull();
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.any(Object)
      );
    });
  });

  // ─── acceptTerms ─────────────────────────────────────────────────────────────

  describe("acceptTerms", () => {
    it("appelle updateUser avec terms_accepted_at et terms_version", async () => {
      mockAuth.updateUser.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.acceptTerms();
      });

      expect(res.error).toBeNull();
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        data: expect.objectContaining({ terms_version: "v2" }),
      });
    });
  });

  // ─── createSessionFromUrl ────────────────────────────────────────────────────

  describe("createSessionFromUrl", () => {
    it("extrait les tokens depuis l'URL et crée une session", async () => {
      mockAuth.setSession.mockResolvedValue({ data: { user: makeUser() }, error: null });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const url =
        "com.coachassistant.basketball://auth/callback#access_token=acc123&refresh_token=ref456";

      let res: any;
      await act(async () => {
        res = await result.current.createSessionFromUrl(url);
      });

      expect(res.error).toBeNull();
      expect(mockAuth.setSession).toHaveBeenCalledWith({
        access_token: "acc123",
        refresh_token: "ref456",
      });
    });

    it("retourne error si les tokens sont absents de l'URL", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.createSessionFromUrl(
          "com.coachassistant.basketball://auth/callback"
        );
      });

      expect(res.error).toBeDefined();
      expect(mockAuth.setSession).not.toHaveBeenCalled();
    });
  });

  // ─── updatePassword ──────────────────────────────────────────────────────────

  describe("updatePassword", () => {
    it("délègue à supabase.auth.updateUser", async () => {
      mockAuth.updateUser.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.updatePassword("new-password-123");
      });

      expect(res.error).toBeNull();
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
    });
  });

  // ─── resendConfirmationEmail ─────────────────────────────────────────────────

  describe("resendConfirmationEmail", () => {
    it("traduit les erreurs de rate limiting", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: "For security purposes, please wait after 60 seconds" },
      });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.resendConfirmationEmail("user@example.com");
      });

      expect(res.error.message).toContain("60 secondes");
    });

    it("succès — retourne { error: null }", async () => {
      mockAuth.signUp.mockResolvedValue({ data: { user: makeUser() }, error: null });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: any;
      await act(async () => {
        res = await result.current.resendConfirmationEmail("user@example.com");
      });

      expect(res.error).toBeNull();
    });
  });
});
