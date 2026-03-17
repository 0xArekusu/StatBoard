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
import { ROUTES, PlatformOS } from '../../constants';
import { useTheme } from '../../src/contexts/ThemeContext';
import { SHADOW_COLOR, OPACITY, PASSWORD_VALIDATION } from '../../src/theme';
import GoogleLogo from '../../components/icons/GoogleLogo';
import AppleLogo from '../../components/icons/AppleLogo';
import { useResponsive } from '../../src/hooks/useResponsive';
import PolicyBottomSheet from '../../components/PolicyBottomSheet';
import TermsAcceptanceModal from '../../components/TermsAcceptanceModal';
import { logInfo, logError } from '../../utils/logger';

/**
 * RegisterScreen - Registration form with email/password
 *
 * Features:
 * - Email/Password registration
 * - Password confirmation validation
 * - Google OAuth
 * - Facebook OAuth (placeholder)
 * - Navigation to login screen
 */
export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { signUp, signInWithGoogle, signInWithApple, acceptTerms, signOut, resendConfirmationEmail } = useAuth();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  /**
   * Handles user registration with email/password
   * Validates password length and confirmation match
   */
  const handleRegister = async () => {
    logInfo('RegisterScreen', '🚀 Starting registration process', {
      hasFullName: !!fullName,
      hasEmail: !!email,
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword,
      termsAccepted,
    });

    if (!fullName || !email || !password || !confirmPassword) {
      logError('RegisterScreen', '❌ Validation failed: Missing fields', {
        hasFullName: !!fullName,
        hasEmail: !!email,
        hasPassword: !!password,
        hasConfirmPassword: !!confirmPassword,
      });
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      logError('RegisterScreen', '❌ Validation failed: Passwords do not match');
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < PASSWORD_VALIDATION.minLength) {
      logError('RegisterScreen', '❌ Validation failed: Password too short', {
        passwordLength: password.length,
        minLength: PASSWORD_VALIDATION.minLength,
      });
      Alert.alert(
        'Erreur',
        `Le mot de passe doit contenir au moins ${PASSWORD_VALIDATION.minLength} caractères`
      );
      return;
    }

    if (!termsAccepted) {
      logError('RegisterScreen', '❌ Validation failed: Terms not accepted');
      Alert.alert(
        'Erreur',
        'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer un compte'
      );
      return;
    }

    logInfo('RegisterScreen', '✅ All validations passed, calling signUp', {
      email,
      fullName,
    });

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    logInfo('RegisterScreen', '📬 SignUp completed', {
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (error) {
      logError('RegisterScreen', '❌ Registration failed', {
        error: error.message,
        email,
      });

      // Détecter si c'est une erreur de rate limiting (email existant non confirmé qui tente de se réinscrire)
      if (error.message && error.message.toLowerCase().includes('sécurité')) {
        // C'est probablement un compte non confirmé existant
        Alert.alert(
          'Compte non confirmé',
          'Un compte existe déjà avec cet email mais n\'a pas été confirmé.\n\n⚠️ Note importante : Le mot de passe pris en compte sera celui que vous avez défini la première fois, utilisez "Mot de passe oublié" après confirmation de l\'email si besoin.',
          [
            {
              text: 'Renvoyer l\'email',
              onPress: () => handleResendConfirmation(email),
            },
            {
              text: 'Retour à la connexion',
              onPress: () => navigation.navigate(ROUTES.LOGIN),
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Erreur d\'inscription', error.message);
      }
    } else {
      logInfo('RegisterScreen', '✅ Registration successful - showing confirmation dialog', {
        email,
      });
      Alert.alert(
        'Inscription réussie',
        'Un email de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception (et les spams) et cliquer sur le lien de confirmation depuis cet appareil avant de vous connecter.',
        [
          {
            text: 'OK',
            onPress: () => {
              logInfo('RegisterScreen', '🔄 Navigating to login screen');
              navigation.navigate(ROUTES.LOGIN);
            },
          },
        ]
      );
    }
  };

  /**
   * Handles resending confirmation email
   * Rate limiting is handled by Supabase server-side
   */
  const handleResendConfirmation = async (emailToResend: string) => {
    logInfo('RegisterScreen', '📧 Resending confirmation email', { email: emailToResend });

    setLoading(true);
    const { error } = await resendConfirmationEmail(emailToResend);
    setLoading(false);

    if (error) {
      logError('RegisterScreen', '❌ Failed to resend confirmation email', {
        error: error.message,
      });
      Alert.alert('Erreur', error.message || 'Impossible de renvoyer l\'email. Veuillez réessayer plus tard.');
    } else {
      logInfo('RegisterScreen', '✅ Confirmation email resent successfully');
      Alert.alert(
        'Email envoyé',
        'Un nouvel email de confirmation a été envoyé. Veuillez vérifier votre boîte de réception et vos spams.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate(ROUTES.LOGIN),
          },
        ]
      );
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
    } else if (needsTermsAcceptance) {
      setShowTermsModal(true);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  const handleTermsAccept = async () => {
    await acceptTerms();
    setShowTermsModal(false);
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
    } else if (needsTermsAcceptance) {
      setShowTermsModal(true);
    } else if (error === null) {
      navigation.navigate(ROUTES.MAIN_TABS);
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
              Créer un compte
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.text.secondary, fontSize: font.lg }]}>
              Rejoignez la communauté des coachs.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={[styles.formFields, { gap: sp.lg, marginBottom: sp.xl }]}>
            <View style={[styles.inputGroup, { gap: sp.sm }]}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: font.md }]}>
                Nom complet
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
                  name="account"
                  size={sizes.iconMd}
                  color={colors.text.disabled}
                  style={[styles.inputIcon, { marginRight: sp.md }]}
                />
                <TextInput
                  placeholder="Coach Carter"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary, fontSize: font.lg, paddingVertical: sp.sm }]}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>

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

            <View style={[styles.inputGroup, { gap: sp.sm }]}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: font.md }]}>
                Confirmer le mot de passe
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
                  name="lock-check"
                  size={sizes.iconMd}
                  color={colors.text.disabled}
                  style={[styles.inputIcon, { marginRight: sp.md }]}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.disabled}
                  style={[styles.input, { color: colors.text.primary, fontSize: font.lg, paddingVertical: sp.sm }]}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Terms and Conditions Checkbox */}
            <TouchableOpacity
              style={[styles.checkboxContainer, { gap: sp.sm }]}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={OPACITY.interaction.high}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.input.border,
                    backgroundColor: termsAccepted ? colors.primary : colors.input.background,
                  },
                ]}
              >
                {termsAccepted && (
                  <MaterialCommunityIcons
                    name="check"
                    size={sizes.iconSm}
                    color={colors.onPrimary}
                  />
                )}
              </View>
              <Text style={[styles.checkboxText, { color: colors.text.secondary, fontSize: font.sm, flex: 1 }]}>
                J'accepte les{' '}
                <Text
                  style={{ color: colors.primary, fontWeight: '600' }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setPolicyUrl('https://coachassistant.fr/terms.html');
                    setPolicyTitle('Conditions d\'utilisation');
                  }}
                >
                  Conditions d'utilisation
                </Text>
                {' '}et la{' '}
                <Text
                  style={{ color: colors.primary, fontWeight: '600' }}
                  onPress={(e) => {
                    e.stopPropagation();
                    setPolicyUrl('https://coachassistant.fr/privacy.html');
                    setPolicyTitle('Politique de confidentialité');
                  }}
                >
                  Politique de confidentialité
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

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
            onPress={handleRegister}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary, fontSize: font.lg }]}>
                S'inscrire
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

          {/* Link to Login */}
          <TouchableOpacity
            style={[styles.linkButton, { marginTop: sp.sm }]}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.text.secondary, fontSize: font.md }]}>
              Déjà un compte ?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Se connecter
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

      {/* Policy Bottom Sheet */}
      <PolicyBottomSheet
        isVisible={policyUrl !== null}
        url={policyUrl || ''}
        title={policyTitle}
        onClose={() => setPolicyUrl(null)}
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    lineHeight: 20,
  },
});
