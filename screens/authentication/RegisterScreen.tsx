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
import FacebookLogo from '../../components/icons/FacebookLogo';
import { useResponsive } from '../../src/hooks/useResponsive';
import PolicyBottomSheet from '../../components/PolicyBottomSheet';

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
  const { signUp, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  /**
   * Handles user registration with email/password
   * Validates password length and confirmation match
   */
  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < PASSWORD_VALIDATION.minLength) {
      Alert.alert(
        'Erreur',
        `Le mot de passe doit contenir au moins ${PASSWORD_VALIDATION.minLength} caractères`
      );
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Erreur',
        'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer un compte'
      );
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message);
    } else {
      Alert.alert(
        'Inscription réussie',
        'Un email de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception et cliquer sur le lien de confirmation avant de vous connecter.',
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
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert('Erreur de connexion Google', error.message);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS);
    }
  };

  /**
   * Handles Facebook OAuth sign-in (placeholder - not yet implemented)
   */
  const handleFacebookSignIn = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion avec Facebook sera bientôt disponible'
    );
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

            {/* Facebook button - temporarily hidden
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
              <Text style={[styles.socialButtonText, { color: colors.text.primary }]}>
                Facebook
              </Text>
            </TouchableOpacity>
            */}
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
