import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { OPACITY, SHADOW_COLOR } from "../../src/theme";
import { ROUTES } from "../../constants/routes";
import { ANALYTICS_EVENTS } from "../../constants/analyticsEvents";
import Logo from "../../components/icons/Logo";
import LanguageSelector from "../../components/LanguageSelector";
import { useResponsive } from "../../src/hooks/useResponsive";

/**
 * AuthScreen - Landing screen for authentication
 *
 * Features:
 * - Guest mode (no authentication)
 * - Navigation to Login screen
 * - Navigation to Register screen
 */
export default function AuthScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { sp, font, sizes, isCompact } = useResponsive();

  /**
   * Handles guest login - navigates directly to main app without authentication
   */
  const handleGuestLogin = async () => {
    posthog?.capture(ANALYTICS_EVENTS.GUEST_MODE_STARTED);
    // Set a flag to show guest welcome modal on next dashboard visit
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem("@show_guest_welcome_once", "true");
    navigation.navigate(ROUTES.MAIN_TABS as never);
  };

  return (
    <ImageBackground
      source={require("../../assets/images/basketball-court-bg.jpg")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[
          `${colors.shadow}${OPACITY.gradient.low}`,
          `${colors.shadow}${OPACITY.gradient.medium}`,
          `${colors.shadow}${OPACITY.gradient.full}`,
        ]}
        style={styles.overlay}
      >
        <View style={[styles.languageSelectorContainer, { top: sp.xl, right: sp.xl }]}>
          <LanguageSelector
            buttonStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
            textColor={colors.onPrimary}
          />
        </View>

        <View
          style={[
            styles.landingContainer,
            {
              paddingHorizontal: sp.xl,
              paddingTop: isCompact ? sp.xxl * 2 : sp.xxl * 2,
              paddingBottom: sp.xl,
            },
          ]}
        >
          {/* Logo Section */}
          <View
            style={[
              styles.logoSection,
              { marginTop: isCompact ? sp.md : sp.xl },
            ]}
          >
            <Logo
              width={sizes.logoMd * 2}
              primaryColor={colors.onPrimary}
              secondaryColor={colors.onSecondary}
              ballColor={colors.primary}
              ballBackgroundColor={colors.button.secondary}
            />
            <Text
              style={[
                styles.tagline,
                {
                  color: colors.text.secondary,
                  marginTop: sp.lg,
                  fontSize: font.lg,
                  lineHeight: font.lg * 1.5,
                },
              ]}
            >
              Vos statistiques au rythme du match.
            </Text>
          </View>

          {/* Buttons Section */}
          <View style={styles.bottomSection}>
          <View
            style={[styles.buttonSection, { gap: sp.md, marginBottom: sp.lg }]}
          >
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  paddingVertical: sp.md,
                  borderRadius: 12,
                  gap: sp.sm,
                },
              ]}
              onPress={() => navigation.navigate(ROUTES.SIGN_UP as never)}
              activeOpacity={OPACITY.interaction.high}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.onPrimary, fontSize: font.lg },
                ]}
              >
                Créer un compte
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={sizes.iconMd}
                color={colors.onPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.button.secondary,
                  borderColor: colors.border,
                  paddingVertical: sp.md,
                  borderRadius: 12,
                },
              ]}
              onPress={() => navigation.navigate(ROUTES.LOGIN as never)}
              activeOpacity={OPACITY.interaction.high}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.onPrimary, fontSize: font.lg },
                ]}
              >
                Se connecter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGuestLogin}
              activeOpacity={OPACITY.interaction.low}
            >
              <Text
                style={[
                  styles.guestButtonText,
                  {
                    color: colors.text.tertiary,
                    fontSize: font.md,
                    paddingVertical: sp.sm,
                  },
                ]}
              >
                Essayer gratuitement (Invité)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Version */}
          <Text
            style={[
              styles.versionText,
              { color: colors.text.tertiary, fontSize: font.xs },
            ]}
          >
            v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

// ===========================
// STYLES
// ===========================

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
  },
  languageSelectorContainer: {
    position: "absolute",
    zIndex: 10,
  },
  landingContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
  },
  tagline: {
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 320,
  },
  buttonSection: {
    width: "100%",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  guestButtonText: {
    fontWeight: "500",
    textAlign: "center",
  },
  bottomSection: {
    width: "100%",
  },
  versionText: {
    textAlign: "center",
    opacity: 0.5,
  },
});
