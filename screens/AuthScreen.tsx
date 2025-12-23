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
  SHADOW_COLOR,
  OPACITY,
  LOGO_SIZE,
  PASSWORD_VALIDATION,
} from "../src/theme";
import { ROUTES } from "../constants/routes";
import Logo from "../components/icons/Logo";
import GoogleLogo from "../components/icons/GoogleLogo";
import FacebookLogo from "../components/icons/FacebookLogo";
import { PlatformOS, AUTH_VIEW, AuthView } from "../constants";

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
  const [view, setView] = useState<AuthView>(AUTH_VIEW.LANDING);
  const { colors } = useTheme();
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
      setView(AUTH_VIEW.LANDING);
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }, [])
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
  if (view === AUTH_VIEW.LANDING) {
    return (
      <ImageBackground
        source={require("../assets/images/basketball-court-bg.jpg")}
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
                primaryColor={colors.shadow}
                secondaryColor={colors.onPrimary}
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
                onPress={() => setView(AUTH_VIEW.REGISTER)}
                activeOpacity={OPACITY.interaction.high}
              >
                <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Créer un compte</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={colors.onPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.button.secondary, borderColor: colors.border }]}
                onPress={() => setView(AUTH_VIEW.LOGIN)}
                activeOpacity={OPACITY.interaction.high}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.onPrimary }]}>Se connecter</Text>
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

  // Login / Register View
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === PlatformOS.IOS ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => setView(AUTH_VIEW.LANDING)}
            style={styles.backButton}
            activeOpacity={OPACITY.interaction.low}
          >
            <View style={styles.backButtonContent}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={colors.text.secondary}
              />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.formHeader}>
            <Text
              style={[styles.formTitle, { color: colors.text.primary }]}
            >
              {view === AUTH_VIEW.LOGIN ? "Bon retour !" : "Créer un compte"}
            </Text>
            <Text
              style={[
                styles.formSubtitle,
                { color: colors.text.secondary },
              ]}
            >
              {view === AUTH_VIEW.LOGIN
                ? "Entrez vos identifiants pour continuer."
                : "Rejoignez la communauté des coachs."}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            {view === AUTH_VIEW.REGISTER && (
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.label, { color: colors.text.secondary }]}
                >
                  Nom complet
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.input.background,
                      borderColor: colors.input.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color={colors.text.disabled}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Coach Carter"
                    placeholderTextColor={colors.text.disabled}
                    style={[styles.input, { color: colors.text.primary }]}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: colors.text.secondary }]}
              >
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={20}
                  color={colors.text.disabled}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="coach@exemple.com"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary }]}
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
                style={[styles.label, { color: colors.text.secondary }]}
              >
                Mot de passe
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={20}
                  color={colors.text.disabled}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary }]}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Confirm Password (only for register) */}
            {view === AUTH_VIEW.REGISTER && (
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.label, { color: colors.text.secondary }]}
                >
                  Confirmer le mot de passe
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.input.background,
                      borderColor: colors.input.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-check"
                    size={20}
                    color={colors.text.disabled}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={colors.text.disabled}
                    style={[styles.input, { color: colors.text.primary }]}
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
              { backgroundColor: colors.primary },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={view === AUTH_VIEW.LOGIN ? handleLogin : handleRegister}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                {view === AUTH_VIEW.LOGIN ? "Se connecter" : "S'inscrire"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Social Login Separator */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: colors.input.border },
              ]}
            />
            <Text
              style={[
                styles.dividerText,
                {
                  color: colors.text.secondary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              Ou continuer avec
            </Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: colors.input.border },
              ]}
            />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
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
                  color={colors.text.primary}
                />
              ) : (
                <>
                  <GoogleLogo />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: colors.text.primary },
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
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
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
                  { color: colors.text.primary },
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
    shadowColor: SHADOW_COLOR,
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
