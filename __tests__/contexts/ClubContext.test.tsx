import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { ClubProvider, useClub } from "../../src/contexts/ClubContext";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lazy pattern: all externals use (...args) => fn(...args) to avoid hoisting issues.

const mockGetUserMemberClubs = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args),
  removeItem: (...args: any[]) => mockRemoveItem(...args),
}));

jest.mock("../../services/ServiceFactory", () => ({
  ServiceFactory: {
    getClubService: () => ({
      getUserMemberClubs: (...args: any[]) => mockGetUserMemberClubs(...args),
    }),
  },
}));

jest.mock("../../src/config/supabase", () => ({ supabase: {} }));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock useAuth — injected via AuthContext
const mockUseAuth = jest.fn();
jest.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ClubProvider>{children}</ClubProvider>
);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeClub = (overrides: any = {}) => ({
  id: "club-1",
  name: "Mon Club",
  acronym: "MC",
  ownerId: "user-1",
  subscriptionTier: "free",
  ...overrides,
});

const mockUser = { id: "user-1", email: "user@example.com" };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClubContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
    mockGetUserMemberClubs.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  // ─── useClub hors Provider ──────────────────────────────────────────────────

  describe("useClub hors Provider", () => {
    it("lève une erreur si utilisé hors ClubProvider", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useClub())).toThrow(
        "useClub must be used within a ClubProvider"
      );
      spy.mockRestore();
    });
  });

  // ─── sans utilisateur ───────────────────────────────────────────────────────

  describe("sans utilisateur", () => {
    it("vide les clubs et passe loading=false si pas d'utilisateur", async () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.currentClub).toBeNull();
      expect(result.current.allClubs).toEqual([]);
      expect(mockGetUserMemberClubs).not.toHaveBeenCalled();
    });
  });

  // ─── chargement initial ─────────────────────────────────────────────────────

  describe("chargement initial avec utilisateur", () => {
    it("charge les clubs et sélectionne le premier si aucun club sauvegardé", async () => {
      const club = makeClub();
      mockGetUserMemberClubs.mockResolvedValue([club]);

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.allClubs).toHaveLength(1);
      expect(result.current.currentClub?.id).toBe("club-1");
      expect(mockSetItem).toHaveBeenCalledWith("@current_club_id", "club-1");
    });

    it("restaure le club précédemment sélectionné depuis AsyncStorage", async () => {
      const clubs = [makeClub({ id: "club-1" }), makeClub({ id: "club-2" })];
      mockGetUserMemberClubs.mockResolvedValue(clubs);
      mockGetItem.mockImplementation((key: string) => {
        if (key === "@current_club_id") return Promise.resolve("club-2");
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.currentClub?.id).toBe("club-2");
    });

    it("supprime le club sauvegardé s'il n'est plus dans la liste", async () => {
      mockGetUserMemberClubs.mockResolvedValue([makeClub({ id: "club-1" })]);
      mockGetItem.mockImplementation((key: string) => {
        if (key === "@current_club_id") return Promise.resolve("club-999"); // inexistant
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockRemoveItem).toHaveBeenCalledWith("@current_club_id");
      expect(result.current.currentClub?.id).toBe("club-1"); // repli sur le premier
    });

    it("currentClub est null si l'utilisateur n'a aucun club", async () => {
      mockGetUserMemberClubs.mockResolvedValue([]);

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.currentClub).toBeNull();
    });

    it("restaure l'activeTeamId depuis AsyncStorage", async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === "@active_team_id") return Promise.resolve("team-42");
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useClub(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeTeamId).toBe("team-42");
    });
  });

  // ─── setCurrentClub ─────────────────────────────────────────────────────────

  describe("setCurrentClub", () => {
    it("met à jour currentClub et persiste dans AsyncStorage", async () => {
      mockGetUserMemberClubs.mockResolvedValue([makeClub({ id: "club-1" }), makeClub({ id: "club-2" })]);
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const newClub = makeClub({ id: "club-2" });
      await act(async () => {
        await result.current.setCurrentClub(newClub);
      });

      expect(result.current.currentClub?.id).toBe("club-2");
      expect(mockSetItem).toHaveBeenCalledWith("@current_club_id", "club-2");
    });

    it("met quand même à jour l'état si AsyncStorage échoue", async () => {
      mockSetItem.mockRejectedValue(new Error("Storage error"));
      mockGetUserMemberClubs.mockResolvedValue([]);

      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const club = makeClub();
      await act(async () => {
        await result.current.setCurrentClub(club);
      });

      expect(result.current.currentClub?.id).toBe("club-1");
    });
  });

  // ─── setActiveTeamId ────────────────────────────────────────────────────────

  describe("setActiveTeamId", () => {
    it("sauvegarde le teamId dans AsyncStorage", async () => {
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setActiveTeamId("team-42");
      });

      expect(mockSetItem).toHaveBeenCalledWith("@active_team_id", "team-42");
      expect(result.current.activeTeamId).toBe("team-42");
    });

    it("supprime le teamId d'AsyncStorage si null", async () => {
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setActiveTeamId(null);
      });

      expect(mockRemoveItem).toHaveBeenCalledWith("@active_team_id");
      expect(result.current.activeTeamId).toBeNull();
    });
  });

  // ─── refreshClubs ───────────────────────────────────────────────────────────

  describe("refreshClubs", () => {
    it("recharge les clubs et met à jour currentClub avec les données fraîches", async () => {
      const club = makeClub({ name: "Ancien nom" });
      mockGetUserMemberClubs.mockResolvedValue([club]);
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.currentClub?.name).toBe("Ancien nom"));

      const updatedClub = makeClub({ name: "Nouveau nom" });
      mockGetUserMemberClubs.mockResolvedValue([updatedClub]);

      await act(async () => {
        await result.current.refreshClubs();
      });

      expect(result.current.currentClub?.name).toBe("Nouveau nom");
    });

    it("efface currentClub si le club actuel n'existe plus après refresh", async () => {
      const club = makeClub({ id: "club-1" });
      mockGetUserMemberClubs.mockResolvedValue([club]);
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.currentClub?.id).toBe("club-1"));

      // Club supprimé
      mockGetUserMemberClubs.mockResolvedValue([]);

      await act(async () => {
        await result.current.refreshClubs();
      });

      expect(result.current.currentClub).toBeNull();
    });

    it("sélectionne le premier club si currentClub est null mais des clubs existent", async () => {
      mockGetUserMemberClubs.mockResolvedValue([]); // initial: aucun club
      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.currentClub).toBeNull());

      const newClub = makeClub();
      mockGetUserMemberClubs.mockResolvedValue([newClub]);

      await act(async () => {
        await result.current.refreshClubs();
      });

      expect(result.current.currentClub?.id).toBe("club-1");
    });

    it("vide les clubs si pas d'utilisateur lors du refresh", async () => {
      // refreshClubs lit `user` depuis la closure du composant — on doit initialiser sans user
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useClub(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.refreshClubs();
      });

      expect(result.current.currentClub).toBeNull();
      expect(result.current.allClubs).toEqual([]);
    });
  });
});
