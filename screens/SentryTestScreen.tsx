import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";

interface SentryTestScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SentryTestScreen({ navigation }: SentryTestScreenProps) {
  const { colors } = useTheme();
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
      ]
    );
  };

  const testError = () => {
    try {
      console.log("🧪 [SENTRY TEST] Début test erreur capturée");
      console.log("🔍 [SENTRY TEST] DSN configuré:", process.env.EXPO_PUBLIC_SENTRY_DSN?.substring(0, 30) + "...");
      console.log("🔍 [SENTRY TEST] Environnement:", __DEV__ ? "development" : "production");

      throw new Error("Test erreur capturée manuellement");
    } catch (error) {
      console.log("📤 [SENTRY TEST] Envoi de l'erreur à Sentry...");
      const eventId = Sentry.captureException(error);
      console.log("✅ [SENTRY TEST] Event ID retourné:", eventId);

      Alert.alert(
        "Erreur envoyée",
        `L'erreur a été envoyée à Sentry !\n\nEvent ID: ${eventId}\n\nVérifiez la console pour les détails.`
      );
    }
  };

  const testMessage = () => {
    console.log("🧪 [SENTRY TEST] Début test message");
    console.log("🔍 [SENTRY TEST] DSN configuré:", process.env.EXPO_PUBLIC_SENTRY_DSN?.substring(0, 30) + "...");
    console.log("🔍 [SENTRY TEST] Variables d'environnement Sentry:");
    console.log("  - EXPO_PUBLIC_SENTRY_DSN:", process.env.EXPO_PUBLIC_SENTRY_DSN ? "✓ Défini" : "✗ Non défini");
    console.log("  - EXPO_PUBLIC_SENTRY_ORG:", process.env.EXPO_PUBLIC_SENTRY_ORG || "Non défini");
    console.log("  - EXPO_PUBLIC_SENTRY_PROJECT:", process.env.EXPO_PUBLIC_SENTRY_PROJECT || "Non défini");

    const eventId = Sentry.captureMessage("Test message depuis SentryTestScreen", "info");
    console.log("✅ [SENTRY TEST] Message envoyé, Event ID:", eventId);

    Alert.alert(
      "Message envoyé",
      `Le message a été envoyé à Sentry !\n\nEvent ID: ${eventId}\n\nVérifiez la console pour les détails.`
    );
  };

  const testBreadcrumb = () => {
    Sentry.addBreadcrumb({
      category: "test",
      message: "Test breadcrumb ajouté",
      level: "info",
    });
    Alert.alert("Breadcrumb ajouté", "Un breadcrumb a été ajouté pour le contexte des erreurs futures");
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
      `Voir la console pour plus de détails.`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, padding: sp.lg, paddingTop: sp.xxl * 1.5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { marginBottom: sp.sm }]}>
          <Text style={[styles.backButtonText, { fontSize: font.md }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: font.xxl }]}>Test Sentry</Text>
      </View>

      <ScrollView style={[styles.content, { padding: sp.lg }]}>
        <View style={[styles.section, { marginBottom: sp.xl }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: font.xl, marginBottom: sp.sm }]}>Tester l'intégration Sentry</Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: font.md }]}>
            Utilisez ces boutons pour vérifier que Sentry capture correctement les erreurs et événements.
          </Text>
        </View>

        <View style={[styles.buttonContainer, { gap: sp.md }]}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2ECC71", padding: sp.md, borderRadius: sp.md }]}
            onPress={showSentryConfig}
          >
            <Text style={[styles.buttonText, { fontSize: font.lg, marginBottom: sp.xs }]}>📋 Config Sentry</Text>
            <Text style={[styles.buttonSubtext, { fontSize: font.sm }]}>Afficher la configuration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#E74C3C", padding: sp.md, borderRadius: sp.md }]}
            onPress={testCrash}
          >
            <Text style={[styles.buttonText, { fontSize: font.lg, marginBottom: sp.xs }]}>🔥 Crash l'app</Text>
            <Text style={[styles.buttonSubtext, { fontSize: font.sm }]}>Force un crash complet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#E67E22" }]}
            onPress={testError}
          >
            <Text style={styles.buttonText}>⚠️ Erreur capturée</Text>
            <Text style={styles.buttonSubtext}>Capture une exception</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#3498DB" }]}
            onPress={testMessage}
          >
            <Text style={styles.buttonText}>💬 Message</Text>
            <Text style={styles.buttonSubtext}>Envoie un message d'info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#9B59B6" }]}
            onPress={testBreadcrumb}
          >
            <Text style={styles.buttonText}>🍞 Breadcrumb</Text>
            <Text style={styles.buttonSubtext}>Ajoute du contexte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Comment vérifier ?</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  buttonSubtext: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
  },
  infoBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3498DB",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
