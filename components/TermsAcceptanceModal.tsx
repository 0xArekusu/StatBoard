import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/contexts/ThemeContext';
import { useResponsive } from '../src/hooks/useResponsive';
import { SHADOW_COLOR, OPACITY } from '../src/theme';
import PolicyBottomSheet from './PolicyBottomSheet';

interface TermsAcceptanceModalProps {
  isVisible: boolean;
  onAccept: () => Promise<void>;
  onRefuse: () => void;
}

export default function TermsAcceptanceModal({
  isVisible,
  onAccept,
  onRefuse,
}: TermsAcceptanceModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sp, font } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');

  const handleAccept = async () => {
    setLoading(true);
    await onAccept();
    setLoading(false);
  };

  return (
    <>
      <Modal
        transparent
        visible={isVisible}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.surface,
                borderRadius: sp.lg,
                padding: sp.xl,
                gap: sp.lg,
              },
            ]}
          >
            <Text
              style={[styles.title, { color: colors.text.primary, fontSize: font.xl }]}
            >
              {t('termsAcceptanceModal.title')}
            </Text>

            <Text
              style={[styles.message, { color: colors.text.secondary, fontSize: font.md }]}
            >
              {t('termsAcceptanceModal.messagePrefix')}{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '600' }}
                onPress={() => {
                  setPolicyUrl('https://coachassistant.fr/terms.html');
                  setPolicyTitle(t('termsAcceptanceModal.title'));
                }}
              >
                {t('termsAcceptanceModal.title')}
              </Text>
              {' '}{t('termsAcceptanceModal.messageMiddle')}{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '600' }}
                onPress={() => {
                  setPolicyUrl('https://coachassistant.fr/privacy.html');
                  setPolicyTitle(t('termsAcceptanceModal.privacyLink'));
                }}
              >
                {t('termsAcceptanceModal.privacyLink')}
              </Text>
              .
            </Text>

            <View style={[styles.buttons, { gap: sp.md }]}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    paddingVertical: sp.md,
                    borderRadius: 12,
                  },
                  loading && { opacity: OPACITY.disabled },
                ]}
                onPress={handleAccept}
                disabled={loading}
                activeOpacity={OPACITY.interaction.high}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.onPrimary, fontSize: font.md }]}>
                    {t('termsAcceptanceModal.acceptButton')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.input.background,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    paddingVertical: sp.md,
                    borderRadius: 12,
                  },
                ]}
                onPress={onRefuse}
                disabled={loading}
                activeOpacity={OPACITY.interaction.high}
              >
                <Text style={[styles.buttonText, { color: colors.text.secondary, fontSize: font.md }]}>
                  {t('termsAcceptanceModal.refuseButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PolicyBottomSheet
        isVisible={policyUrl !== null}
        url={policyUrl || ''}
        title={policyTitle}
        onClose={() => setPolicyUrl(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontWeight: '700',
  },
  message: {
    lineHeight: 22,
  },
  buttons: {
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
