import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { ROUTES, PlatformOS, ANALYTICS_EVENTS, ANALYTICS_LOGIN_METHOD } from '../../constants';
import { useTheme } from '../../src/contexts/ThemeContext';
import { SHADOW_COLOR, OPACITY, STATUS_COLORS } from '../../src/theme';
import GoogleLogo from '../../components/icons/GoogleLogo';
import AppleLogo from '../../components/icons/AppleLogo';
import { useResponsive } from '../../src/hooks/useResponsive';
import TermsAcceptanceModal from '../../components/TermsAcceptanceModal';
import { usePostHog } from 'posthog-react-native';

/**
 * LoginScreen - Email/password login form
 *
 * Features:
 * - Email/Password authentication
 * - Google OAuth
 * - Facebook OAuth (placeholder)
 * - Navigation to registration screen
 */
export default function LoginScreen({ navigation, route }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const emailConfirmed = route?.params?.emailConfirmed === true;
  const emailError = route?.params?.emailError === true;
  const passwordReset = route?.params?.passwordReset === true;
  const { signIn, signInWithGoogle, signInWithApple, acceptTerms, signOut, resetPassword } = useAuth();
  const posthog = usePostHog();
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();

  /**
   * Translates common Supabase error messages to French
   */
  const translateError = (errorMessage: string): string => {
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Invalid credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'User not found': 'Aucun compte associé à cet email',
    };

    // Check if the error message matches any known error
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    // Return original message if no translation found
    return errorMessage;
  };

  /**
   * Handles email/password login with validation
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const { error, needsTermsAcceptance } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const translatedError = translateError(error.message);
      Alert.alert('Erreur de connexion', translatedError);
      posthog?.capture(ANALYTICS_EVENTS.LOGIN_FAILED, { method: ANALYTICS_LOGIN_METHOD.PASSWORD, error_message: error.message ?? null });
    } else if (needsTermsAcceptance) {
      setShowTermsModal(true);
    } else {
      posthog?.capture(ANALYTICS_EVENTS.USER_LOGGED_IN, { method: ANALYTICS_LOGIN_METHOD.PASSWORD });
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  /**
   * Handles Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error, needsTermsAcceptance } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert('Erreur de connexion Google', error.message);
      posthog?.capture(ANALYTICS_EVENTS.LOGIN_FAILED, { method: ANALYTICS_LOGIN_METHOD.GOOGLE, error_message: error.message ?? null });
    } else if (needsTermsAcceptance) {
      setShowTermsModal(true);
    } else {
      posthog?.capture(ANALYTICS_EVENTS.USER_LOGGED_IN, { method: ANALYTICS_LOGIN_METHOD.GOOGLE });
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  const handleTermsAccept = async () => {
    await acceptTerms();
    setShowTermsModal(false);
    posthog?.capture(ANALYTICS_EVENTS.USER_LOGGED_IN, { method: ANALYTICS_LOGIN_METHOD.PASSWORD_AFTER_TERMS });
    navigation.navigate(ROUTES.MAIN_TABS);
  };

  const handleTermsRefuse = async () => {
    setShowTermsModal(false);
    await signOut();
  };

  /**
   * Handles Apple Sign-In (iOS only)
   */
  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error, needsTermsAcceptance } = await signInWithApple();
    setLoading(false);

    if (error) {
      Alert.alert('Erreur de connexion Apple', error.message);
      posthog?.capture(ANALYTICS_EVENTS.LOGIN_FAILED, { method: ANALYTICS_LOGIN_METHOD.APPLE, error_message: error.message ?? null });
    } else if (needsTermsAcceptance) {
      setShowTermsModal(true);
    } else if (error === null) {
      posthog?.capture(ANALYTICS_EVENTS.USER_LOGGED_IN, { method: ANALYTICS_LOGIN_METHOD.APPLE });
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  /**
   * Handles password reset request
   */
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Email requis',
        'Veuillez entrer votre adresse email pour réinitialiser votre mot de passe'
      );
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert(
        'Email envoyé',
        'Un email de réinitialisation a été envoyé à votre adresse email'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === PlatformOS.IOS ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: sp.lg, paddingTop: sp.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Email confirmed banner */}
          {emailConfirmed && (
            <View style={styles.confirmedBanner}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.confirmedBannerText}>
                Email confirmé ! Vous pouvez maintenant vous connecter.
              </Text>
            </View>
          )}

          {/* Email error banner */}
          {emailError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={STATUS_COLORS.errorLight} />
              <Text style={styles.errorBannerText}>
                Le lien de confirmation est invalide ou a expiré. Veuillez vous réinscrire.
              </Text>
            </View>
          )}

          {/* Password reset success banner */}
          {passwordReset && (
            <View style={styles.confirmedBanner}>
              <MaterialCommunityIcons name="check-circle" size={20} color={STATUS_COLORS.successLight} />
              <Text style={styles.confirmedBannerText}>
                Mot de passe mis à jour ! Vous pouvez maintenant vous connecter.
              </Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { marginBottom: sp.lg }]}
            activeOpacity={OPACITY.interaction.low}
          >
            <View style={[styles.backButtonContent, { gap: sp.sm }]}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={sizes.iconMd}
                color={colors.text.secondary}
              />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={[styles.formHeader, { marginBottom: sp.xl }]}>
            <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: font.xxxl, marginBottom: sp.sm }]}>
              Bon retour !
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.text.secondary, fontSize: font.lg }]}>
              Entrez vos identifiants pour continuer.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={[styles.formFields, { gap: sp.lg, marginBottom: sp.xl }]}>
            <View style={[styles.inputGroup, { gap: sp.sm }]}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: font.md }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    paddingHorizontal: sp.md,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={sizes.iconMd}
                  color={colors.text.disabled}
                  style={[styles.inputIcon, { marginRight: sp.md }]}
                />
                <TextInput
                  placeholder="coach@exemple.com"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary, fontSize: font.lg, paddingVertical: sp.sm }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { gap: sp.sm }]}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: font.md }]}>
                Mot de passe
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    paddingHorizontal: sp.md,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={sizes.iconMd}
                  color={colors.text.disabled}
                  style={[styles.inputIcon, { marginRight: sp.md }]}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary, fontSize: font.lg, paddingVertical: sp.sm }]}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={loading}
            style={[styles.forgotPasswordButton, { marginBottom: sp.md }]}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary, fontSize: font.md }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                paddingVertical: sp.md,
                borderRadius: 12,
                marginTop: 'auto',
              },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary, fontSize: font.lg }]}>
                Se connecter
              </Text>
            )}
          </TouchableOpacity>

          {/* Social Login Separator */}
          <View style={[styles.dividerContainer, { marginVertical: sp.lg }]}>
            <View style={[styles.dividerLine, { backgroundColor: colors.input.border }]} />
            <Text
              style={[
                styles.dividerText,
                {
                  color: colors.text.secondary,
                  backgroundColor: colors.surface,
                  paddingHorizontal: sp.md,
                  fontSize: font.md,
                },
              ]}
            >
              Ou continuer avec
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.input.border }]} />
          </View>

          {/* Social Login Buttons */}
          <View style={[styles.socialButtonsContainer, { gap: sp.md, marginBottom: sp.lg }]}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  paddingVertical: sp.sm,
                  paddingHorizontal: sp.md,
                  borderRadius: 12,
                  gap: sp.md,
                },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              activeOpacity={OPACITY.interaction.high}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={[styles.socialButtonText, { color: colors.text.primary, fontSize: font.md }]}>
                    Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: colors.input.background,
                    borderColor: colors.input.border,
                    paddingVertical: sp.sm,
                    paddingHorizontal: sp.md,
                    borderRadius: 12,
                    gap: sp.md,
                  },
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleAppleSignIn}
                activeOpacity={OPACITY.interaction.high}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <>
                    <AppleLogo color={colors.text.primary} />
                    <Text style={[styles.socialButtonText, { color: colors.text.primary, fontSize: font.md }]}>
                      Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Link to Register */}
          <TouchableOpacity
            style={[styles.linkButton, { marginTop: sp.sm }]}
            onPress={() => navigation.navigate(ROUTES.SIGN_UP)}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.text.secondary, fontSize: font.md }]}>
              Pas encore de compte ?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                S'inscrire
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms Acceptance Modal (Google sign-in) */}
      <TermsAcceptanceModal
        isVisible={showTermsModal}
        onAccept={handleTermsAccept}
        onRefuse={handleTermsRefuse}
      />
    </KeyboardAvoidingView>
  );
}

// ===========================
// STYLES
// ===========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 60,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
  },
  backButton: {},
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formHeader: {},
  formTitle: {
    fontWeight: '700',
  },
  formSubtitle: {},
  formFields: {},
  inputGroup: {},
  label: {
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {},
  input: {
    flex: 1,
  },
  submitButton: {
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: OPACITY.disabled,
  },
  submitButtonText: {
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontWeight: '500',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonText: {
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {},
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontWeight: '600',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STATUS_COLORS.successBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  confirmedBannerText: {
    color: STATUS_COLORS.successLight,
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STATUS_COLORS.errorBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: STATUS_COLORS.errorLight,
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
});
