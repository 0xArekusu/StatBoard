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
import { BRAND_COLORS, COMMON_COLORS, SLATE_COLORS } from "../src/theme";
import { ROUTES } from "../constants/routes";
import Logo from "../components/icons/Logo";
import GoogleLogo from "../components/icons/GoogleLogo";
import FacebookLogo from "../components/icons/FacebookLogo";

type ViewType = "landing" | "login" | "register";

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

  // Guest login
  const handleGuestLogin = () => {
    navigation.navigate(ROUTES.MAIN_TABS as never);
  };

  // Email/Password login
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

  // Email/Password registration
  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Erreur",
        "Le mot de passe doit contenir au moins 6 caractères"
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

  // Google sign in
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

  // Facebook sign in (placeholder)
  const handleFacebookSignIn = () => {
    Alert.alert(
      "Bientôt disponible",
      "La connexion avec Facebook sera bientôt disponible"
    );
  };

  if (view === "landing") {
    return (
      <ImageBackground
        source={require("../assets/images/basketball-court-bg.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            `${SLATE_COLORS[900]}66`, // 40% opacity
            `${SLATE_COLORS[900]}CC`, // 80% opacity
            SLATE_COLORS[900], // 100% opacity
          ]}
          style={styles.overlay}
        >
          <View style={styles.landingContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Logo
                width={240}
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
                activeOpacity={0.8}
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
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Se connecter</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleGuestLogin} activeOpacity={0.7}>
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
  const formBgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const inputBgColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const inputBorderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const textPrimaryColor = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondaryColor = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const textDisabledColor = isDark ? SLATE_COLORS[600] : SLATE_COLORS[400];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: formBgColor }]}
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
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContent}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={textSecondaryColor}
              />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: textPrimaryColor }]}>
              {view === "login" ? "Bon retour !" : "Créer un compte"}
            </Text>
            <Text style={[styles.formSubtitle, { color: textSecondaryColor }]}>
              {view === "login"
                ? "Entrez vos identifiants pour continuer."
                : "Rejoignez la communauté des coachs."}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            {view === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: textSecondaryColor }]}>
                  Nom complet
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: inputBgColor,
                      borderColor: inputBorderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color={textDisabledColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Coach Carter"
                    placeholderTextColor={textDisabledColor}
                    style={[styles.input, { color: textPrimaryColor }]}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: inputBgColor,
                    borderColor: inputBorderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={20}
                  color={textDisabledColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="coach@exemple.com"
                  placeholderTextColor={textDisabledColor}
                  style={[styles.input, { color: textPrimaryColor }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>
                Mot de passe
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: inputBgColor,
                    borderColor: inputBorderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={20}
                  color={textDisabledColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={textDisabledColor}
                  style={[styles.input, { color: textPrimaryColor }]}
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
                <Text style={[styles.label, { color: textSecondaryColor }]}>
                  Confirmer le mot de passe
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: inputBgColor,
                      borderColor: inputBorderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-check"
                    size={20}
                    color={textDisabledColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={textDisabledColor}
                    style={[styles.input, { color: textPrimaryColor }]}
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
            activeOpacity={0.8}
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
                { backgroundColor: inputBorderColor },
              ]}
            />
            <Text
              style={[
                styles.dividerText,
                { color: textSecondaryColor, backgroundColor: formBgColor },
              ]}
            >
              Ou continuer avec
            </Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: inputBorderColor },
              ]}
            />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={textPrimaryColor} />
              ) : (
                <>
                  <GoogleLogo />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: textPrimaryColor },
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
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleFacebookSignIn}
              activeOpacity={0.8}
              disabled={loading}
            >
              <FacebookLogo />
              <Text
                style={[styles.socialButtonText, { color: textPrimaryColor }]}
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

const styles = StyleSheet.create({
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
    shadowColor: "#000",
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
    backgroundColor: `${SLATE_COLORS[800]}CC`, // 80% opacity
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
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
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
    shadowColor: "#000",
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
    opacity: 0.6,
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
    shadowColor: "#000",
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
