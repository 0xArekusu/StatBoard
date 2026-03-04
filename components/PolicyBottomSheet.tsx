import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useResponsive } from '../src/hooks/useResponsive';
import { WebView } from 'react-native-webview';

interface PolicyBottomSheetProps {
  isVisible: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export default function PolicyBottomSheet({
  isVisible,
  url,
  title,
  onClose,
}: PolicyBottomSheetProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: sp.lg,
              borderTopRightRadius: sp.lg,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.handle,
              {
                backgroundColor: colors.text.disabled,
                width: 40,
                height: 4,
                borderRadius: sp.xs,
                marginBottom: sp.md,
              },
            ]}
          />
          <View style={[styles.header, { paddingHorizontal: sp.lg, paddingBottom: sp.md }]}>
            <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xl }]}>
              {title}
            </Text>
          </View>
          <View style={styles.webViewContainer}>
            <WebView
              source={{ uri: url }}
              style={styles.webView}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  webViewContainer: {
    flex: 1,
    marginTop: 12,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
