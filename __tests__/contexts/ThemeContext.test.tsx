import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions } from "react-native";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  default: jest.fn(() => "light"),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  // ─── état initial ──────────────────────────────────────────────────────────

  describe("état initial", () => {
    it("démarre en mode dark par défaut", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe("dark");
        expect(result.current.isDark).toBe(true);
        expect(result.current.colorScheme).toBe("dark");
      });
    });

    it("charge la préférence sauvegardée depuis AsyncStorage", async () => {
      mockGetItem.mockResolvedValue("light");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe("light");
        expect(result.current.isDark).toBe(false);
      });
    });

    it("ignore une valeur invalide dans AsyncStorage", async () => {
      mockGetItem.mockResolvedValue("invalid_value");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe("dark"); // valeur par défaut conservée
      });
    });
  });

  // ─── setThemeMode ──────────────────────────────────────────────────────────

  describe("setThemeMode", () => {
    it("passe en mode light et met à jour isDark", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode("light");
      });

      expect(result.current.themeMode).toBe("light");
      expect(result.current.isDark).toBe(false);
      expect(result.current.colorScheme).toBe("light");
    });

    it("passe en mode dark et met à jour isDark", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode("light");
      });
      await act(async () => {
        await result.current.setThemeMode("dark");
      });

      expect(result.current.themeMode).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("persiste le mode dans AsyncStorage", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode("light");
      });

      expect(mockSetItem).toHaveBeenCalledWith("@statboard_theme_preference", "light");
    });

    it("ne plante pas si AsyncStorage échoue", async () => {
      mockSetItem.mockRejectedValue(new Error("Storage error"));
      const { result } = renderHook(() => useTheme(), { wrapper });

      await expect(
        act(async () => {
          await result.current.setThemeMode("light");
        })
      ).resolves.not.toThrow();
    });
  });

  // ─── mode system ────────────────────────────────────────────────────────────

  describe("mode system", () => {
    it("en mode system avec système light → colorScheme light", async () => {
      // useColorScheme mocké retourne "light"
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode("system");
      });

      expect(result.current.colorScheme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });
  });

  // ─── useTheme hors Provider ────────────────────────────────────────────────

  describe("useTheme hors Provider", () => {
    it("lève une erreur si utilisé hors ThemeProvider", () => {
      // Supprimer le console.error de React pour ce test
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within ThemeProvider");

      spy.mockRestore();
    });
  });

  // ─── colors ────────────────────────────────────────────────────────────────

  describe("colors", () => {
    it("fournit un objet colors non-null", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.colors).toBeDefined();
        expect(typeof result.current.colors).toBe("object");
      });
    });

    it("les colors changent selon le mode", async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Récupérer les couleurs en mode dark
      await waitFor(() => expect(result.current.isDark).toBe(true));
      const darkColors = result.current.colors;

      // Passer en light
      await act(async () => {
        await result.current.setThemeMode("light");
      });
      const lightColors = result.current.colors;

      expect(darkColors).not.toBe(lightColors);
    });
  });
});
