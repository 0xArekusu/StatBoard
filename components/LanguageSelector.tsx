import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/contexts/ThemeContext";
import { useLanguage } from "../src/contexts/LanguageContext";
import { SUPPORTED_LANGUAGES, SupportedLanguage, LANGUAGE_FLAGS } from "../src/i18n";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

interface LanguageSelectorProps {
  /** Overrides the trigger button's default surface/border styling (e.g. to stay legible over a background image) */
  buttonStyle?: StyleProp<ViewStyle>;
}

/**
 * LanguageSelector - Compact flag button that opens a dropdown to switch app language.
 * Self-contained: reads/writes language via LanguageContext, no props required.
 */
export default function LanguageSelector({ buttonStyle }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const posthog = usePostHog();
  const [visible, setVisible] = useState(false);

  const handleChangeLanguage = async (lang: SupportedLanguage) => {
    setVisible(false);
    if (lang === language) return;
    posthog?.capture(ANALYTICS_EVENTS.LANGUAGE_CHANGED, { language: lang });
    await setLanguage(lang);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[
          styles.button,
          { backgroundColor: colors.surface, borderColor: colors.border },
          buttonStyle,
        ]}
      >
        <Text style={styles.buttonFlag}>{LANGUAGE_FLAGS[language]}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t("common.language.title")}
            </Text>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.option,
                  {
                    backgroundColor:
                      language === lang
                        ? isDark
                          ? `${colors.primary}33`
                          : `${colors.primary}1A`
                        : "transparent",
                  },
                ]}
                onPress={() => handleChangeLanguage(lang)}
              >
                <View style={styles.optionLabel}>
                  <Text style={styles.optionFlag}>{LANGUAGE_FLAGS[lang]}</Text>
                  <Text style={[styles.optionText, { color: colors.text.primary }]}>
                    {t(`common.language.options.${lang}`)}
                  </Text>
                </View>
                {language === lang && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonFlag: {
    fontSize: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionFlag: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
