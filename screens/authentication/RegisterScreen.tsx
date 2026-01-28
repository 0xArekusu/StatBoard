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
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const { colors } = useTheme();

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

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS);
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
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
            <Text style={[styles.formTitle, { color: colors.text.primary }]}>
              Créer un compte
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.text.secondary }]}>
              Rejoignez la communauté des coachs.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
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
              <Text style={[styles.label, { color: colors.text.secondary }]}>
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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
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
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleRegister}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                S'inscrire
              </Text>
            )}
          </TouchableOpacity>

          {/* Social Login Separator */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.input.border }]} />
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
            <View style={[styles.dividerLine, { backgroundColor: colors.input.border }]} />
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
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={[styles.socialButtonText, { color: colors.text.primary }]}>
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
            style={styles.linkButton}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.text.secondary }]}>
              Déjà un compte ?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Se connecter
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 'auto',
  },
  submitButtonDisabled: {
    opacity: OPACITY.disabled,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
});
