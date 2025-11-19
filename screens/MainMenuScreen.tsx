/**
 * MainMenuScreen
 *
 * Main menu screen of the app where users can:
 * - Start a new match
 * - View match history
 * - Manage their club
 * - Sign in/out
 * All data operations (Supabase and SQLite) are logged for debugging.
 */

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState, useCallback, useRef } from "react";
import { Picker } from "@react-native-picker/picker";
import ClubChoiceModal from "../components/ClubChoiceModal";
import MatchLimitModal from "../components/MatchLimitModal";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import type { Club } from "../models/Club";
import { ROUTES } from "../constants/routes";
import { canUseMultiClub } from "../src/config/devConfig";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { MatchSyncPolicy } from "../src/services/match/MatchSyncPolicy";
import type { SubscriptionTier } from "../models/Subscription";
import { shareLogs, logInfo, logError, logWarn } from "../utils/logger";
import Logo from "../components/icons/Logo";
import { useTheme } from "../src/contexts/ThemeContext";
import ThemeToggleButton from "../components/ThemeToggleButton";

type RootStackParamList = {
  [ROUTES.MAIN_MENU]: undefined;
  [ROUTES.BOARD]: undefined;
  [ROUTES.MATCH_HISTORY]: undefined;
  [ROUTES.LOGIN]: undefined;
  [ROUTES.CLUB_FORM]: { clubId?: string };
  [ROUTES.JOIN_CLUB]: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MainMenu">;

export default function MainMenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [clubModalVisible, setClubModalVisible] = useState(false);
  const [matchLimitModalVisible, setMatchLimitModalVisible] = useState(false);
  const [userClub, setUserClub] = useState<Club | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [loadingClub, setLoadingClub] = useState(false);
  const selectedClubIdRef = useRef<string | null>(null);
  const [isFreeSubscription, setIsFreeSubscription] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [maxMatches, setMaxMatches] = useState(3);

  /**
   * Load user's clubs from Supabase
   * Fetches all clubs where the user is a member (including owned clubs)
   * Restores previously selected club if available
   */
  const loadUserClub = useCallback(async () => {
    if (!user) {
      logInfo("MainMenuScreen", "👤 No user logged in, clearing club data");
      setUserClub(null);
      setUserClubs([]);
      selectedClubIdRef.current = null;
      return;
    }

    try {
      setLoadingClub(true);
      logInfo("MainMenuScreen", "📡 Fetching user clubs from Supabase", {
        userId: user.id,
      });

      const clubService = ServiceFactory.getClubService(supabase);
      // Get clubs where user is member (includes owned clubs via trigger)
      const clubs = await clubService.getUserMemberClubs(user.id);

      logInfo("MainMenuScreen", "✅ User clubs fetched successfully", {
        userId: user.id,
        clubCount: clubs.length,
        clubIds: clubs.map((c) => c.id),
        clubNames: clubs.map((c) => c.name),
      });

      setUserClubs(clubs);

      // Restore previously selected club if it still exists
      if (selectedClubIdRef.current) {
        logInfo(
          "MainMenuScreen",
          "🔍 Attempting to restore previously selected club",
          {
            previousClubId: selectedClubIdRef.current,
          }
        );

        const previouslySelected = clubs.find(
          (c) => c.id === selectedClubIdRef.current
        );

        if (previouslySelected) {
          logInfo("MainMenuScreen", "✅ Previously selected club restored", {
            clubId: previouslySelected.id,
            clubName: previouslySelected.name,
            subscriptionTier: previouslySelected.subscriptionTier,
          });
          setUserClub(previouslySelected);
          // Check subscription tier
          setIsFreeSubscription(previouslySelected.subscriptionTier === "free");
          return;
        } else {
          logWarn(
            "MainMenuScreen",
            "⚠️ Previously selected club not found in user clubs"
          );
        }
      }

      // Otherwise, select the first club
      const firstClub = clubs.length > 0 ? clubs[0] : null;

      if (firstClub) {
        logInfo("MainMenuScreen", "✅ Selected first club as default", {
          clubId: firstClub.id,
          clubName: firstClub.name,
          subscriptionTier: firstClub.subscriptionTier,
        });
      } else {
        logInfo("MainMenuScreen", "ℹ️ No clubs found for user");
      }

      setUserClub(firstClub);
      selectedClubIdRef.current = firstClub?.id || null;
      // Check subscription tier
      setIsFreeSubscription(firstClub?.subscriptionTier === "free");
    } catch (error) {
      logError("MainMenuScreen", "❌ Error loading user clubs", {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      setLoadingClub(false);
    }
  }, [user]);

  /**
   * Load match count from SQLite database
   * Retrieves all matches and counts only completed ones for subscription limit check
   */
  const loadMatchCount = useCallback(async () => {
    try {
      logInfo("MainMenuScreen", "💾 Fetching match count from SQLite");

      const matchRepo = new MatchRepository();
      const allMatches = await matchRepo.getAllMatches();

      logInfo("MainMenuScreen", "✅ Matches fetched from SQLite", {
        totalMatches: allMatches.length,
        matchIds: allMatches.map((m) => m.id),
      });

      // Count only completed matches for the limit
      const completedMatches = allMatches.filter(
        (match) => match.status === "completed"
      );

      logInfo("MainMenuScreen", "✅ Match count calculated", {
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        pendingMatches: allMatches.length - completedMatches.length,
      });

      setMatchCount(completedMatches.length);
    } catch (error) {
      logError("MainMenuScreen", "❌ Error loading match count from SQLite", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }, []);

  /**
   * Update maximum allowed matches based on user subscription tier
   * Runs when user or userClub changes
   */
  React.useEffect(() => {
    const syncPolicy = new MatchSyncPolicy();
    const tier: SubscriptionTier =
      userClub?.subscriptionTier || (user ? "free" : "free");
    const limits = syncPolicy.getLimits(!!user, tier);

    logInfo("MainMenuScreen", "📊 Updated match limits", {
      isLoggedIn: !!user,
      subscriptionTier: tier,
      maxLocalMatches: limits.maxLocalMatches,
    });

    setMaxMatches(limits.maxLocalMatches);
  }, [user, userClub]);

  /**
   * Reload user club and match count when screen comes into focus
   * Ensures data is fresh when user navigates back to main menu
   */
  useFocusEffect(
    useCallback(() => {
      logInfo("MainMenuScreen", "🔄 Screen focused, reloading data");
      loadUserClub();
      loadMatchCount();
    }, [loadUserClub, loadMatchCount])
  );

  /**
   * Handle sign out button press
   * Shows confirmation dialog before signing out
   */
  const handleSignOut = () => {
    logInfo("MainMenuScreen", "🚪 User initiated sign out");
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        onPress: () => {
          logInfo("MainMenuScreen", "✅ Sign out confirmed by user");
          signOut();
        },
        style: "destructive",
      },
    ]);
  };

  /**
   * Handle new match creation
   * Checks subscription limits before allowing navigation to board
   */
  const handleNewMatch = async () => {
    logInfo("MainMenuScreen", "➕ User attempting to create new match", {
      currentMatchCount: matchCount,
      maxMatches: maxMatches,
      hasUser: !!user,
      clubId: userClub?.id,
    });

    // Check match limit based on subscription tier
    const syncPolicy = new MatchSyncPolicy();
    const tier: SubscriptionTier =
      userClub?.subscriptionTier || (user ? "free" : "free");
    const canCreate = syncPolicy.canCreateMatch(matchCount, !!user, tier);

    if (!canCreate.allowed) {
      logWarn("MainMenuScreen", "⚠️ Match creation blocked - limit reached", {
        currentMatchCount: matchCount,
        maxMatches: maxMatches,
        subscriptionTier: tier,
        reason: canCreate.reason,
      });
      setMatchLimitModalVisible(true);
      return;
    }

    logInfo(
      "MainMenuScreen",
      "✅ Match creation allowed, navigating to board",
      {
        clubId: userClub?.id,
        clubName: userClub?.name,
      }
    );

    // Navigate to board with selected club ID
    (navigation as any).navigate(ROUTES.BOARD, { clubId: userClub?.id });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {user ? (
          <>
            <Text style={[styles.userEmail, { color: colors.text.secondary }]}>{user.email}</Text>
            <TouchableOpacity
              onPress={handleSignOut}
              style={[styles.logoutButton, { backgroundColor: colors.surfaceVariant }]}
            >
              <Text style={[styles.logoutText, { color: colors.primary }]}>Déconnexion</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.LOGIN as never)}
            style={[styles.loginButton, { backgroundColor: colors.button.login }]}
          >
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.logoContainer}>
        <Logo width={300} primaryColor={colors.text.primary} secondaryColor={colors.background} />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: !user ? colors.button.free : colors.button.primary }
        ]}
        onPress={handleNewMatch}
      >
        <Ionicons
          name={!user ? "star-outline" : "add-circle-outline"}
          size={24}
          color="#fff"
        />
        <Text style={styles.buttonText}>
          {!user ? "Essayez gratuitement !" : "Nouveau match"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.button.secondary }]}
        onPress={() =>
          (navigation as any).navigate(ROUTES.MATCH_HISTORY, {
            clubId: userClub?.id,
          })
        }
      >
        <MaterialCommunityIcons
          name="clipboard-list-outline"
          size={24}
          color="#fff"
        />
        <Text style={styles.buttonText}>Historique des matchs</Text>
      </TouchableOpacity>

      {user && (
        <>
          {/* Club selector for admin user with multi-club enabled */}
          {canUseMultiClub(user.id) && userClubs.length > 1 && (
            <View style={styles.clubSelectorContainer}>
              <Text style={[styles.clubSelectorLabel, { color: colors.text.secondary }]}>
                Sélectionner un club:
              </Text>
              <View style={[styles.pickerContainer, {
                borderColor: colors.button.club,
                backgroundColor: colors.surface
              }]}>
                <Picker
                  selectedValue={userClub?.id}
                  onValueChange={(clubId) => {
                    const selectedClub = userClubs.find((c) => c.id === clubId);
                    if (selectedClub) {
                      setUserClub(selectedClub);
                      selectedClubIdRef.current = clubId;
                    }
                  }}
                  style={styles.picker}
                >
                  {userClubs.map((club) => (
                    <Picker.Item
                      key={club.id}
                      label={club.name}
                      value={club.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.button.club }]}
            onPress={() => {
              if (userClub) {
                (navigation as any).navigate(ROUTES.CLUB_FORM, {
                  clubId: userClub.id,
                });
              } else {
                setClubModalVisible(true);
              }
            }}
            disabled={loadingClub}
          >
            {loadingClub ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="people-outline" size={24} color="#fff" />
                <Text style={styles.buttonText}>
                  {userClub ? "Mon club" : "Créer/Rejoindre un club"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Add club button for admin user */}
          {canUseMultiClub(user.id) && (
            <TouchableOpacity
              style={[styles.button, {
                backgroundColor: colors.background,
                borderWidth: 2,
                borderColor: colors.button.club
              }]}
              onPress={() => setClubModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.button.club} />
              <Text style={[styles.buttonText, { color: colors.button.club }]}>
                Créer/Rejoindre un autre club
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {!user && (
        <Text style={[styles.guestNote, { color: colors.text.tertiary }]}>
          Mode invité : vos données sont sauvegardées localement
        </Text>
      )}

      <ClubChoiceModal
        visible={clubModalVisible}
        onClose={() => setClubModalVisible(false)}
        onCreatePress={() => {
          setClubModalVisible(false);
          (navigation as any).navigate(ROUTES.CLUB_FORM);
        }}
        onJoinPress={() => {
          setClubModalVisible(false);
          (navigation as any).navigate(ROUTES.JOIN_CLUB);
        }}
      />

      <MatchLimitModal
        visible={matchLimitModalVisible}
        isConnected={!!user}
        currentCount={matchCount}
        maxCount={maxMatches}
        onClose={() => setMatchLimitModalVisible(false)}
        onUpgrade={() => {
          setMatchLimitModalVisible(false);
          if (!user) {
            navigation.navigate(ROUTES.LOGIN as never);
          } else {
            // TODO: Navigate to subscription screen
            Alert.alert("Abonnements", "Fonctionnalité à venir !");
          }
        }}
        onManageMatches={() => {
          setMatchLimitModalVisible(false);
          (navigation as any).navigate(ROUTES.MATCH_HISTORY, {
            clubId: userClub?.id,
          });
        }}
      />

      {/* Theme toggle button */}
      <ThemeToggleButton position="left" />

      {/* Debug button to share logs */}
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: colors.surfaceVariant }]}
        onPress={() => {
          Alert.alert(
            "Partager les logs",
            "Voulez-vous partager le fichier de logs ?",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Partager",
                onPress: async () => {
                  try {
                    await shareLogs();
                  } catch (error) {
                    Alert.alert("Erreur", "Impossible de partager les logs");
                  }
                },
              },
            ]
          );
        }}
      >
        <Ionicons name="bug-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 40,
    right: 20,
    alignItems: "flex-end",
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 5,
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  clubSelectorContainer: {
    width: "80%",
    marginVertical: 10,
  },
  clubSelectorLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
  },
  picker: {
    height: 50,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  guestNote: {
    marginTop: 30,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  debugButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
