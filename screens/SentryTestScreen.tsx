import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

interface SentryTestScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SentryTestScreen({
  navigation,
}: SentryTestScreenProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  const testCrash = () => {
    Alert.alert(
      "Test Crash",
      "Ceci va causer un crash de l'app pour tester Sentry. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Crash",
          style: "destructive",
          onPress: () => {
            throw new Error("Test crash depuis SentryTestScreen");
          },
        },
      ],
    );
  };

  const testError = () => {
    try {
      console.log("🧪 [SENTRY TEST] Début test erreur capturée");
      console.log(
        "🔍 [SENTRY TEST] DSN configuré:",
        process.env.EXPO_PUBLIC_SENTRY_DSN?.substring(0, 30) + "...",
      );
      console.log(
        "🔍 [SENTRY TEST] Environnement:",
        __DEV__ ? "development" : "production",
      );

      throw new Error("Test erreur capturée manuellement");
    } catch (error) {
      console.log("📤 [SENTRY TEST] Envoi de l'erreur à Sentry...");
      const eventId = Sentry.captureException(error);
      console.log("✅ [SENTRY TEST] Event ID retourné:", eventId);

      Alert.alert(
        "Erreur envoyée",
        `L'erreur a été envoyée à Sentry !\n\nEvent ID: ${eventId}\n\nVérifiez la console pour les détails.`,
      );
    }
  };

  const testMessage = () => {
    console.log("🧪 [SENTRY TEST] Début test message");
    console.log(
      "🔍 [SENTRY TEST] DSN configuré:",
      process.env.EXPO_PUBLIC_SENTRY_DSN?.substring(0, 30) + "...",
    );
    console.log("🔍 [SENTRY TEST] Variables d'environnement Sentry:");
    console.log(
      "  - EXPO_PUBLIC_SENTRY_DSN:",
      process.env.EXPO_PUBLIC_SENTRY_DSN ? "✓ Défini" : "✗ Non défini",
    );
    console.log(
      "  - EXPO_PUBLIC_SENTRY_ORG:",
      process.env.EXPO_PUBLIC_SENTRY_ORG || "Non défini",
    );
    console.log(
      "  - EXPO_PUBLIC_SENTRY_PROJECT:",
      process.env.EXPO_PUBLIC_SENTRY_PROJECT || "Non défini",
    );

    const eventId = Sentry.captureMessage(
      "Test message depuis SentryTestScreen",
      "info",
    );
    console.log("✅ [SENTRY TEST] Message envoyé, Event ID:", eventId);

    Alert.alert(
      "Message envoyé",
      `Le message a été envoyé à Sentry !\n\nEvent ID: ${eventId}\n\nVérifiez la console pour les détails.`,
    );
  };

  const testBreadcrumb = () => {
    Sentry.addBreadcrumb({
      category: "test",
      message: "Test breadcrumb ajouté",
      level: "info",
    });
    Alert.alert(
      "Breadcrumb ajouté",
      "Un breadcrumb a été ajouté pour le contexte des erreurs futures",
    );
  };

  const showSentryConfig = () => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    const org = process.env.EXPO_PUBLIC_SENTRY_ORG;
    const project = process.env.EXPO_PUBLIC_SENTRY_PROJECT;
    const env = __DEV__ ? "development" : "production";

    console.log("📋 [SENTRY CONFIG] Configuration complète:");
    console.log("  - DSN:", dsn || "❌ NON DÉFINI");
    console.log("  - Organisation:", org || "❌ NON DÉFINI");
    console.log("  - Projet:", project || "❌ NON DÉFINI");
    console.log("  - Environnement:", env);
    console.log("  - Mode Debug:", __DEV__ ? "OUI" : "NON");

    Alert.alert(
      "Configuration Sentry",
      `DSN: ${dsn ? "✓ Défini" : "✗ NON DÉFINI"}\n` +
        `Org: ${org || "Non défini"}\n` +
        `Projet: ${project || "Non défini"}\n` +
        `Env: ${env}\n` +
        `Debug: ${__DEV__ ? "OUI" : "NON"}\n\n` +
        `${!dsn ? "⚠️ ATTENTION: Le DSN n'est pas configuré!\nLes events ne seront pas envoyés." : "✅ Configuration OK"}\n\n` +
        `Voir la console pour plus de détails.`,
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: sp.lg,
              paddingBottom: sp.md,
              paddingHorizontal: sp.lg,
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={sizes.iconMd}
              color={colors.text.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text
              style={[
                styles.headerTitle,
                { fontSize: font.xxl, color: colors.text.primary },
              ]}
            >
              Test Sentry
            </Text>
          </View>

          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: STATUS_COLORS.error + "20",
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="bug"
              size={sizes.iconSm}
              color={STATUS_COLORS.error}
            />
          </View>
        </View>
        {/* Description Section */}
        <View
          style={[
            styles.section,
            {
              padding: sp.lg,
              backgroundColor: colors.surface,
              marginBottom: sp.md,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text.primary,
                fontSize: font.xl,
                marginBottom: sp.sm,
              },
            ]}
          >
            Tester l'intégration Sentry
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: colors.text.secondary,
                fontSize: font.md,
                lineHeight: font.md * 1.5,
              },
            ]}
          >
            Utilisez ces boutons pour vérifier que Sentry capture correctement
            les erreurs et événements.
          </Text>
        </View>

        {/* Buttons Section */}
        <View
          style={[
            styles.buttonContainer,
            { paddingHorizontal: sp.lg, gap: sp.md, marginBottom: sp.xl },
          ]}
        >
          {/* Config Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: STATUS_COLORS.success,
                padding: sp.lg,
                borderRadius: sp.md,
              },
            ]}
            onPress={showSentryConfig}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="settings"
                size={sizes.iconMd}
                color={COMMON_COLORS.white}
              />
              <View style={styles.buttonTextContainer}>
                <Text
                  style={[
                    styles.buttonText,
                    { fontSize: font.lg, color: COMMON_COLORS.white },
                  ]}
                >
                  Configuration Sentry
                </Text>
                <Text
                  style={[
                    styles.buttonSubtext,
                    { fontSize: font.sm, color: COMMON_COLORS.white },
                  ]}
                >
                  Afficher la configuration
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Crash Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: STATUS_COLORS.error,
                padding: sp.lg,
                borderRadius: sp.md,
              },
            ]}
            onPress={testCrash}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="flame"
                size={sizes.iconMd}
                color={COMMON_COLORS.white}
              />
              <View style={styles.buttonTextContainer}>
                <Text
                  style={[
                    styles.buttonText,
                    { fontSize: font.lg, color: COMMON_COLORS.white },
                  ]}
                >
                  Crash l'app
                </Text>
                <Text
                  style={[
                    styles.buttonSubtext,
                    { fontSize: font.sm, color: COMMON_COLORS.white },
                  ]}
                >
                  Force un crash complet
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Error Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: STATUS_COLORS.warning,
                padding: sp.lg,
                borderRadius: sp.md,
              },
            ]}
            onPress={testError}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="warning"
                size={sizes.iconMd}
                color={COMMON_COLORS.white}
              />
              <View style={styles.buttonTextContainer}>
                <Text
                  style={[
                    styles.buttonText,
                    { fontSize: font.lg, color: COMMON_COLORS.white },
                  ]}
                >
                  Erreur capturée
                </Text>
                <Text
                  style={[
                    styles.buttonSubtext,
                    { fontSize: font.sm, color: COMMON_COLORS.white },
                  ]}
                >
                  Capture une exception
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: STATUS_COLORS.info,
                padding: sp.lg,
                borderRadius: sp.md,
              },
            ]}
            onPress={testMessage}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="chatbox"
                size={sizes.iconMd}
                color={COMMON_COLORS.white}
              />
              <View style={styles.buttonTextContainer}>
                <Text
                  style={[
                    styles.buttonText,
                    { fontSize: font.lg, color: COMMON_COLORS.white },
                  ]}
                >
                  Message
                </Text>
                <Text
                  style={[
                    styles.buttonSubtext,
                    { fontSize: font.sm, color: COMMON_COLORS.white },
                  ]}
                >
                  Envoie un message d'info
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Breadcrumb Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.surfaceVariant,
                padding: sp.lg,
                borderRadius: sp.md,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={testBreadcrumb}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="trail-sign"
                size={sizes.iconMd}
                color={colors.text.primary}
              />
              <View style={styles.buttonTextContainer}>
                <Text
                  style={[
                    styles.buttonText,
                    { fontSize: font.lg, color: colors.text.primary },
                  ]}
                >
                  Breadcrumb
                </Text>
                <Text
                  style={[
                    styles.buttonSubtext,
                    { fontSize: font.sm, color: colors.text.secondary },
                  ]}
                >
                  Ajoute du contexte
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            {
              marginHorizontal: sp.lg,
              marginBottom: sp.xxl,
              padding: sp.lg,
              backgroundColor: STATUS_COLORS.info + "10",
              borderRadius: sp.md,
              borderLeftWidth: 4,
              borderLeftColor: STATUS_COLORS.info,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: sp.sm,
              marginBottom: sp.md,
            }}
          >
            <Ionicons
              name="information-circle"
              size={sizes.iconMd}
              color={STATUS_COLORS.info}
            />
            <Text
              style={[
                styles.infoTitle,
                {
                  color: colors.text.primary,
                  fontSize: font.lg,
                  fontWeight: "600",
                },
              ]}
            >
              Comment vérifier ?
            </Text>
          </View>
          <Text
            style={[
              styles.infoText,
              {
                color: colors.text.secondary,
                fontSize: font.md,
                lineHeight: font.md * 1.6,
              },
            ]}
          >
            1. Cliquez sur un bouton de test{"\n"}
            2. Allez sur https://sentry.io{"\n"}
            3. Vérifiez que l'erreur/message apparaît dans Issues ou Performance
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {},
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  section: {},
  sectionTitle: {
    fontWeight: "bold",
  },
  description: {},
  buttonContainer: {},
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonSubtext: {
    opacity: 0.9,
  },
  infoBox: {},
  infoTitle: {},
  infoText: {},
});
