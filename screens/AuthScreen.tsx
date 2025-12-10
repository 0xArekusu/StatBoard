import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  BRAND_COLORS,
  COMMON_COLORS,
  SLATE_COLORS,
  SHADOW_COLOR,
  OPACITY,
  LOGO_SIZE,
  PASSWORD_VALIDATION,
} from "../src/theme";
import { ROUTES } from "../constants/routes";
import Logo from "../components/icons/Logo";
import GoogleLogo from "../components/icons/GoogleLogo";
import FacebookLogo from "../components/icons/FacebookLogo";

type ViewType = "landing" | "login" | "register";

/**
 * AuthScreen - Main authentication screen with three views:
 * - landing: Initial screen with branding and action buttons
 * - login: Email/password login form
 * - register: Registration form with email/password
 *
 * Supports multiple authentication methods:
 * - Guest mode (no authentication)
 * - Email/Password
 * - Google OAuth
 * - Facebook OAuth (placeholder)
 */
export default function AuthScreen() {
  const [view, setView] = useState<ViewType>("landing");
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset to landing view when screen comes into focus (e.g., after logout)
  useFocusEffect(
    React.useCallback(() => {
      setView("landing");
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }, [])
  );

  // Login / Register View - Dynamic theme colors based on dark mode
  // IMPORTANT: This useMemo must be called BEFORE any conditional returns to respect React Hooks rules
  const themeColors = React.useMemo(
    () => ({
      formBg: isDark ? SLATE_COLORS[950] : SLATE_COLORS[50],
      inputBg: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
      inputBorder: isDark ? SLATE_COLORS[800] : SLATE_COLORS[200],
      textPrimary: isDark ? COMMON_COLORS.white : SLATE_COLORS[900],
      textSecondary: isDark ? SLATE_COLORS[400] : SLATE_COLORS[500],
      textDisabled: isDark ? SLATE_COLORS[600] : SLATE_COLORS[400],
    }),
    [isDark]
  );

  /**
   * Handles guest login - navigates directly to main app without authentication
   */
  const handleGuestLogin = () => {
    navigation.navigate(ROUTES.MAIN_TABS as never);
  };

  /**
   * Handles email/password login with validation
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Erreur de connexion", error.message);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }
  };

  /**
   * Handles user registration with email/password
   * Validates password length and confirmation match
   */
  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < PASSWORD_VALIDATION.minLength) {
      Alert.alert(
        "Erreur",
        `Le mot de passe doit contenir au moins ${PASSWORD_VALIDATION.minLength} caractères`
      );
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      Alert.alert("Erreur d'inscription", error.message);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }
  };

  /**
   * Handles Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert("Erreur de connexion Google", error.message);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }
  };

  /**
   * Handles Facebook OAuth sign-in (placeholder - not yet implemented)
   */
  const handleFacebookSignIn = () => {
    Alert.alert(
      "Bientôt disponible",
      "La connexion avec Facebook sera bientôt disponible"
    );
  };

  // Landing view - Initial screen with branding and navigation options
  if (view === "landing") {
    return (
      <ImageBackground
        source={require("../assets/images/basketball-court-bg.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            `${SLATE_COLORS[900]}${OPACITY.gradient.low}`,
            `${SLATE_COLORS[900]}${OPACITY.gradient.medium}`,
            `${SLATE_COLORS[900]}${OPACITY.gradient.full}`,
          ]}
          style={styles.overlay}
        >
          <View style={styles.landingContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Logo
                width={LOGO_SIZE.auth.width}
                primaryColor={COMMON_COLORS.black}
                secondaryColor={COMMON_COLORS.white}
                ballColor={BRAND_COLORS[500]}
                ballBackgroundColor={BRAND_COLORS[900]}
              />
              <Text style={styles.tagline}>
                Gérez vos équipes, et analysez vos performances.
              </Text>
            </View>

            {/* Buttons Section */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: BRAND_COLORS[500] },
                ]}
                onPress={() => setView("register")}
                activeOpacity={OPACITY.interaction.high}
              >
                <Text style={styles.primaryButtonText}>Créer un compte</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={COMMON_COLORS.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setView("login")}
                activeOpacity={OPACITY.interaction.high}
              >
                <Text style={styles.secondaryButtonText}>Se connecter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGuestLogin}
                activeOpacity={OPACITY.interaction.low}
              >
                <Text style={styles.guestButtonText}>
                  Essayer gratuitement (Invité)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // Login / Register View
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: themeColors.formBg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => setView("landing")}
            style={styles.backButton}
            activeOpacity={OPACITY.interaction.low}
          >
            <View style={styles.backButtonContent}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={themeColors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.formHeader}>
            <Text
              style={[styles.formTitle, { color: themeColors.textPrimary }]}
            >
              {view === "login" ? "Bon retour !" : "Créer un compte"}
            </Text>
            <Text
              style={[
                styles.formSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {view === "login"
                ? "Entrez vos identifiants pour continuer."
                : "Rejoignez la communauté des coachs."}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            {view === "register" && (
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.label, { color: themeColors.textSecondary }]}
                >
                  Nom complet
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: themeColors.inputBg,
                      borderColor: themeColors.inputBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color={themeColors.textDisabled}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Coach Carter"
                    placeholderTextColor={themeColors.textDisabled}
                    style={[styles.input, { color: themeColors.textPrimary }]}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: themeColors.textSecondary }]}
              >
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={20}
                  color={themeColors.textDisabled}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="coach@exemple.com"
                  placeholderTextColor={themeColors.textDisabled}
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: themeColors.textSecondary }]}
              >
                Mot de passe
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={20}
                  color={themeColors.textDisabled}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={themeColors.textDisabled}
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Confirm Password (only for register) */}
            {view === "register" && (
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.label, { color: themeColors.textSecondary }]}
                >
                  Confirmer le mot de passe
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: themeColors.inputBg,
                      borderColor: themeColors.inputBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-check"
                    size={20}
                    color={themeColors.textDisabled}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={themeColors.textDisabled}
                    style={[styles.input, { color: themeColors.textPrimary }]}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: BRAND_COLORS[500] },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={view === "login" ? handleLogin : handleRegister}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COMMON_COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {view === "login" ? "Se connecter" : "S'inscrire"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Social Login Separator */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: themeColors.inputBorder },
              ]}
            />
            <Text
              style={[
                styles.dividerText,
                {
                  color: themeColors.textSecondary,
                  backgroundColor: themeColors.formBg,
                },
              ]}
            >
              Ou continuer avec
            </Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: themeColors.inputBorder },
              ]}
            />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.inputBorder,
                },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              activeOpacity={OPACITY.interaction.high}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={themeColors.textPrimary}
                />
              ) : (
                <>
                  <GoogleLogo />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.inputBorder,
                },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleFacebookSignIn}
              activeOpacity={OPACITY.interaction.high}
              disabled={loading}
            >
              <FacebookLogo />
              <Text
                style={[
                  styles.socialButtonText,
                  { color: themeColors.textPrimary },
                ]}
              >
                Facebook
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    color: SLATE_COLORS[300],
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
    color: COMMON_COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: `${SLATE_COLORS[800]}${OPACITY.gradient.medium}`,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SLATE_COLORS[700],
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COMMON_COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  guestButtonText: {
    color: SLATE_COLORS[400],
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },

  // Form view styles
  container: {
    flex: 1,
    paddingBottom: 60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  formContainer: {
    flex: 1,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
  },
  formFields: {
    gap: 24,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: BRAND_COLORS[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: "auto",
  },
  submitButtonDisabled: {
    opacity: OPACITY.disabled,
  },
  submitButtonText: {
    color: COMMON_COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  socialButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
