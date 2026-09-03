import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { ROUTES, PlatformOS } from '../../constants';
import { useTheme } from '../../src/contexts/ThemeContext';
import { SHADOW_COLOR, OPACITY, PASSWORD_VALIDATION, STATUS_COLORS } from '../../src/theme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { logInfo, logError } from '../../utils/logger';

/**
 * ResetPasswordScreen - New password form after email reset link
 *
 * Displayed when the user returns to the app via the password reset deep link.
 * A temporary Supabase session is already active at this point.
 *
 * Features:
 * - New password + confirmation fields
 * - Calls supabase.auth.updateUser to persist the new password
 * - Navigates to LoginScreen with a success banner on completion
 */
export default function ResetPasswordScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updatePassword } = useAuth();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  /**
   * Validates inputs and calls updatePassword
   */
  const handleSubmit = async () => {
    setError(null);

    if (!password || !confirmPassword) {
      setError(t('resetPasswordScreen.errors.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('resetPasswordScreen.errors.passwordsDontMatch'));
      return;
    }

    if (password.length < PASSWORD_VALIDATION.minLength) {
      setError(t('resetPasswordScreen.errors.passwordTooShort', { minLength: PASSWORD_VALIDATION.minLength }));
      return;
    }

    setLoading(true);
    logInfo('ResetPasswordScreen', '🔑 Attempting password update');
    const { error: updateError } = await updatePassword(password);
    setLoading(false);

    if (updateError) {
      logError('ResetPasswordScreen', '❌ Password update failed', { error: updateError.message });
      setError(updateError.message);
    } else {
      logInfo('ResetPasswordScreen', '✅ Password updated successfully');
      navigation.navigate(ROUTES.LOGIN, { passwordReset: true });
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
          {/* Header */}
          <View style={[styles.formHeader, { marginBottom: sp.xl }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.button.brandAlpha, marginBottom: sp.lg }]}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={sizes.avatarSm}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.formTitle, { color: colors.text.primary, fontSize: font.xxxl, marginBottom: sp.sm }]}>
              {t('resetPasswordScreen.title')}
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.text.secondary, fontSize: font.lg }]}>
              {t('resetPasswordScreen.subtitle')}
            </Text>
          </View>

          {/* Error banner */}
          {error && (
            <View style={[styles.errorBanner, { marginBottom: sp.lg }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={STATUS_COLORS.error} />
              <Text style={[styles.errorBannerText, { fontSize: font.md }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={[styles.formFields, { gap: sp.lg, marginBottom: sp.xl }]}>
            <View style={[styles.inputGroup, { gap: sp.sm }]}>
              <Text style={[styles.label, { color: colors.text.secondary, fontSize: font.md }]}>
                {t('resetPasswordScreen.newPasswordLabel')}
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
                {t('resetPasswordScreen.confirmPasswordLabel')}
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
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                paddingVertical: sp.md,
                borderRadius: 12,
              },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={OPACITY.interaction.high}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary, fontSize: font.lg }]}>
                {t('resetPasswordScreen.submitButton')}
              </Text>
            )}
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
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  formSubtitle: {
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STATUS_COLORS.errorBackground,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    color: STATUS_COLORS.errorLight,
    fontWeight: '600',
    flex: 1,
  },
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
});
