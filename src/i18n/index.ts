/**
 * i18n
 *
 * i18next configuration for the app.
 * Initial language is detected from the device locale (expo-localization);
 * LanguageContext later overrides it with any persisted user preference.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

// Maps app language to an Intl/toLocaleDateString locale tag
export const INTL_LOCALES: Record<SupportedLanguage, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
};

// Maps app language to a flag emoji, used by the language switcher UI
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
};

function isSupportedLanguage(code: string | null | undefined): code is SupportedLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

export function getDeviceLanguage(): SupportedLanguage {
  const deviceCode = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(deviceCode) ? deviceCode : DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    de: { translation: de },
  },
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
