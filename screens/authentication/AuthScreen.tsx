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
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { OPACITY, LOGO_SIZE, SHADOW_COLOR } from "../../src/theme";
import { ROUTES } from "../../constants/routes";
import Logo from "../../components/icons/Logo";

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

  /**
   * Handles guest login - navigates directly to main app without authentication
   */
  const handleGuestLogin = () => {
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
        <View style={styles.landingContainer}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Logo
              width={LOGO_SIZE.auth.width}
              primaryColor={colors.onPrimary}
              secondaryColor={colors.onSecondary}
              ballColor={colors.primary}
              ballBackgroundColor={colors.button.secondary}
            />
            <Text style={[styles.tagline, { color: colors.text.secondary }]}>
              Gérez vos équipes, et analysez vos performances.
            </Text>
          </View>

          {/* Buttons Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigation.navigate(ROUTES.SIGN_UP as never)}
              activeOpacity={OPACITY.interaction.high}
            >
              <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                Créer un compte
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={colors.onPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.button.secondary, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate(ROUTES.LOGIN as never)}
              activeOpacity={OPACITY.interaction.high}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.onPrimary }]}>
                Se connecter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGuestLogin}
              activeOpacity={OPACITY.interaction.low}
            >
              <Text style={[styles.guestButtonText, { color: colors.text.tertiary }]}>
                Essayer gratuitement (Invité)
              </Text>
            </TouchableOpacity>
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
  // Landing view styles
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
  },
  landingContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 40,
  },
  tagline: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 16,
    fontWeight: "500",
    maxWidth: 320,
    lineHeight: 24,
  },
  buttonSection: {
    width: "100%",
    gap: 16,
    marginBottom: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },
});
