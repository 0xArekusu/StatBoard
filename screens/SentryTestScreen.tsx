import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useTheme } from "../src/contexts/ThemeContext";

interface SentryTestScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SentryTestScreen({ navigation }: SentryTestScreenProps) {
  const { colors } = useTheme();

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
      throw new Error("Test erreur capturée manuellement");
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert("Erreur envoyée", "L'erreur a été envoyée à Sentry !");
    }
  };

  const testMessage = () => {
    Sentry.captureMessage("Test message depuis SentryTestScreen", "info");
    Alert.alert("Message envoyé", "Le message a été envoyé à Sentry !");
  };

  const testBreadcrumb = () => {
    Sentry.addBreadcrumb({
      category: "test",
      message: "Test breadcrumb ajouté",
      level: "info",
    });
    Alert.alert("Breadcrumb ajouté", "Un breadcrumb a été ajouté pour le contexte des erreurs futures");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Sentry</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text }]}>Tester l'intégration Sentry</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Utilisez ces boutons pour vérifier que Sentry capture correctement les erreurs et événements.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#E74C3C" }]}
            onPress={testCrash}
          >
            <Text style={styles.buttonText}>🔥 Crash l'app</Text>
            <Text style={styles.buttonSubtext}>Force un crash complet</Text>
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
