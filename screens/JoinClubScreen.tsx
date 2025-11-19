/**
 * JoinClubScreen
 *
 * Screen for joining an existing club using a 6-digit code.
 * Users must be authenticated to join a club.
 * All Supabase operations (finding club, joining) are logged for debugging.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import { logInfo, logError, logWarn } from "../utils/logger";
import { useTheme } from "../src/contexts/ThemeContext";
import { CommonStyles } from "../src/theme";

export default function JoinClubScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [clubCode, setClubCode] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Log screen mount when user arrives on the view
   */
  useEffect(() => {
    logInfo(
      "JoinClubScreen",
      "📱 Screen mounted - User arrived on join club view",
      {
        userId: user?.id,
        userEmail: user?.email,
        isAuthenticated: !!user,
      }
    );
  }, []);

  /**
   * Handle joining a club with the provided code
   * Validates code, finds club in Supabase, and adds user as member
   */
  const handleJoinClub = async () => {
    if (!user) {
      logWarn(
        "JoinClubScreen",
        "⚠️ Attempted to join club without authentication"
      );
      Alert.alert("Erreur", "Vous devez être connecté pour rejoindre un club");
      return;
    }

    if (!clubCode.trim() || clubCode.length !== 6) {
      logWarn("JoinClubScreen", "⚠️  Invalid club code format", {
        codeLength: clubCode.length,
        userId: user.id,
      });
      Alert.alert("Erreur", "Veuillez entrer un code à 6 chiffres");
      return;
    }

    setLoading(true);
    logInfo("JoinClubScreen", "🔍 Attempting to join club", {
      clubCode,
      userId: user.id,
      userEmail: user.email,
    });

    try {
      // Find club by code in Supabase
      logInfo("JoinClubScreen", "📡 Searching for club by code in Supabase", {
        clubCode,
      });
      const clubService = ServiceFactory.getClubService(supabase);
      const club = await clubService.getClubByCode(clubCode);

      if (!club) {
        logWarn("JoinClubScreen", "⚠️ No club found with provided code", {
          clubCode,
          userId: user.id,
        });
        Alert.alert("Erreur", "Aucun club trouvé avec ce code");
        setLoading(false);
        return;
      }

      logInfo("JoinClubScreen", "✅ Club found, attempting to join", {
        clubId: club.id,
        clubName: club.name,
        clubCode,
        userId: user.id,
      });

      // Join the club as a member
      const clubMemberService = ServiceFactory.getClubMemberService(supabase);
      const result = await clubMemberService.joinClub(
        club.id,
        user.id,
        user.email!
      );

      if (!result.success) {
        logError("JoinClubScreen", "❌ Failed to join club", {
          clubId: club.id,
          clubName: club.name,
          userId: user.id,
          error: result.error,
        });
        Alert.alert(
          "Erreur",
          result.error || "Impossible de rejoindre le club"
        );
        setLoading(false);
        return;
      }

      logInfo("JoinClubScreen", "✅ Successfully joined club", {
        clubId: club.id,
        clubName: club.name,
        userId: user.id,
        userEmail: user.email,
      });

      Alert.alert("Succès", `Vous avez rejoint le club "${club.name}" !`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      logError("JoinClubScreen", "❌ Error during club join process", {
        clubCode,
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format club code input to only contain numbers
   * Limits to 6 digits max
   * @param text Raw input text
   * @returns Formatted numeric code
   */
  const formatCode = (text: string) => {
    const numbers = text.replace(/[^0-9]/g, "");
    return numbers.slice(0, 6);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          CommonStyles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={[CommonStyles.headerTitle, { color: colors.text.primary }]}
        >
          Rejoindre un club
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="enter" size={80} color={colors.button.secondary} />
        </View>

        <Text style={[styles.title, { color: colors.text.primary }]}>Entrez le code du club</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Demandez le code à 6 chiffres à l'administrateur du club
        </Text>

        <TextInput
          style={[styles.codeInput, {
            borderColor: colors.button.secondary,
            color: colors.text.primary,
            backgroundColor: colors.surface
          }]}
          placeholder="000000"
          placeholderTextColor={colors.text.tertiary}
          value={clubCode}
          onChangeText={(text) => setClubCode(formatCode(text))}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity
          style={[
            styles.joinButton,
            { backgroundColor: colors.button.secondary },
            loading && [styles.joinButtonDisabled, { backgroundColor: colors.text.disabled }]
          ]}
          onPress={handleJoinClub}
          disabled={loading}
        >
          <Text style={styles.joinButtonText}>
            {loading ? "Vérification..." : "Rejoindre le club"}
          </Text>
        </TouchableOpacity>

        {/* <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.scanButton}>
          <Ionicons name="qr-code-outline" size={24} color="#666" />
          <Text style={styles.scanButtonText}>Scanner un QR code</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: "100%",
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 10,
    borderWidth: 2,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  joinButton: {
    width: "100%",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  joinButtonDisabled: {
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#999",
    fontSize: 14,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 10,
  },
  scanButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
});
