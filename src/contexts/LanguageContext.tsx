/**
 * LanguageContext
 *
 * Manages app-wide language with support for:
 * - Automatic device locale detection (via expo-localization, at i18n init)
 * - Manual language override
 * - Language persistence with AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage } from "../i18n";

const LANGUAGE_STORAGE_KEY = "@statboard_language_preference";

interface LanguageContextType {
  // Current active language
  language: SupportedLanguage;
  // Function to change language (persists the choice)
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage
  );

  // Load persisted language preference on mount (overrides device locale if set)
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isSupportedLanguage(storedLanguage) && storedLanguage !== i18n.language) {
        await i18n.changeLanguage(storedLanguage);
        setLanguageState(storedLanguage);
      }
    } catch (error) {
      console.error("Failed to load language preference:", error);
    }
  };

  const setLanguage = async (lang: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 * Must be used within LanguageProvider
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
