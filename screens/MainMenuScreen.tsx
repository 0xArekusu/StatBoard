import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState, useCallback, useRef } from "react";
import { Picker } from "@react-native-picker/picker";
import ClubChoiceModal from "../components/ClubChoiceModal";
import MatchLimitModal from "../components/MatchLimitModal";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import type { Club } from "../models/Club";
import { ROUTES } from "../constants/routes";
import { canUseMultiClub } from "../src/config/devConfig";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { DatabaseService } from "../src/services/database/DatabaseService";
import { MatchSyncPolicy } from "../src/services/match/MatchSyncPolicy";
import type { SubscriptionTier } from "../models/Subscription";

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
  const [clubModalVisible, setClubModalVisible] = useState(false);
  const [matchLimitModalVisible, setMatchLimitModalVisible] = useState(false);
  const [userClub, setUserClub] = useState<Club | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [loadingClub, setLoadingClub] = useState(false);
  const selectedClubIdRef = useRef<string | null>(null);
  const [isFreeSubscription, setIsFreeSubscription] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [maxMatches, setMaxMatches] = useState(3);

  // Load user's club when screen is focused
  const loadUserClub = useCallback(async () => {
    if (!user) {
      setUserClub(null);
      setUserClubs([]);
      selectedClubIdRef.current = null;
      return;
    }

    try {
      setLoadingClub(true);
      const clubService = ServiceFactory.getClubService(supabase);
      // Get clubs where user is member (includes owned clubs via trigger)
      const clubs = await clubService.getUserMemberClubs(user.id);
      setUserClubs(clubs);

      // Restore previously selected club if it still exists
      if (selectedClubIdRef.current) {
        const previouslySelected = clubs.find(c => c.id === selectedClubIdRef.current);
        if (previouslySelected) {
          setUserClub(previouslySelected);
          // Check subscription tier
          setIsFreeSubscription(previouslySelected.subscriptionTier === 'free');
          return;
        }
      }

      // Otherwise, select the first club
      const firstClub = clubs.length > 0 ? clubs[0] : null;
      setUserClub(firstClub);
      selectedClubIdRef.current = firstClub?.id || null;
      // Check subscription tier
      setIsFreeSubscription(firstClub?.subscriptionTier === 'free');
    } catch (error) {
      console.error("Error loading user club:", error);
    } finally {
      setLoadingClub(false);
    }
  }, [user]);

  // Load match count
  const loadMatchCount = useCallback(async () => {
    try {
      const matchRepo = new MatchRepository();
      const allMatches = await matchRepo.getAllMatches();

      // Count only completed matches for the limit
      const completedMatches = allMatches.filter(match => match.status === 'completed');
      setMatchCount(completedMatches.length);

      // Get limits based on user status
      const syncPolicy = new MatchSyncPolicy();
      const tier: SubscriptionTier | undefined = isFreeSubscription || !user ? 'free' : undefined;
      const limits = syncPolicy.getLimits(!!user, tier);
      setMaxMatches(limits.maxLocalMatches);
    } catch (error) {
      console.error("Error loading match count:", error);
    }
  }, [user, isFreeSubscription]);

  useFocusEffect(
    useCallback(() => {
      loadUserClub();
      loadMatchCount();
    }, [loadUserClub, loadMatchCount])
  );

  const handleSignOut = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", onPress: () => signOut(), style: "destructive" },
    ]);
  };

  const handleNewMatch = async () => {
    // Check match limit
    const syncPolicy = new MatchSyncPolicy();
    const tier: SubscriptionTier | undefined = isFreeSubscription || !user ? 'free' : undefined;
    const canCreate = syncPolicy.canCreateMatch(matchCount, !!user, tier);

    if (!canCreate.allowed) {
      setMatchLimitModalVisible(true);
      return;
    }

    // Navigate to board with selected club ID
    (navigation as any).navigate(ROUTES.BOARD, { clubId: userClub?.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user ? (
          <>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.LOGIN as never)}
            style={styles.loginButton}
          >
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>🏀 StatBoard</Text>

      <TouchableOpacity
        style={[styles.button, (!user || isFreeSubscription) && styles.freeButton]}
        onPress={handleNewMatch}
      >
        <Ionicons name={(!user || isFreeSubscription) ? "star-outline" : "add-circle-outline"} size={24} color="#fff" />
        <Text style={styles.buttonText}>{(!user || isFreeSubscription) ? "Essayez gratuitement !" : "Nouveau match"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => (navigation as any).navigate(ROUTES.MATCH_HISTORY, { clubId: userClub?.id })}
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
              <Text style={styles.clubSelectorLabel}>Sélectionner un club:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={userClub?.id}
                  onValueChange={(clubId) => {
                    const selectedClub = userClubs.find(c => c.id === clubId);
                    if (selectedClub) {
                      setUserClub(selectedClub);
                      selectedClubIdRef.current = clubId;
                    }
                  }}
                  style={styles.picker}
                >
                  {userClubs.map(club => (
                    <Picker.Item key={club.id} label={club.name} value={club.id} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.clubButton]}
            onPress={() => {
              if (userClub) {
                (navigation as any).navigate(ROUTES.CLUB_FORM, { clubId: userClub.id });
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
              style={[styles.button, styles.addClubButton]}
              onPress={() => setClubModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#9C27B0" />
              <Text style={[styles.buttonText, styles.addClubButtonText]}>
                Créer/Rejoindre un autre club
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {!user && (
        <Text style={styles.guestNote}>
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
          (navigation as any).navigate(ROUTES.MATCH_HISTORY, { clubId: userClub?.id });
        }}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    color: "#666",
    marginBottom: 5,
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  logoutText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#FF6B35",
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
  freeButton: {
    backgroundColor: "#FFD700",
  },
  secondaryButton: {
    backgroundColor: "#4CAF50",
  },
  clubButton: {
    backgroundColor: "#9C27B0",
  },
  addClubButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#9C27B0",
  },
  addClubButtonText: {
    color: "#9C27B0",
  },
  clubSelectorContainer: {
    width: "80%",
    marginVertical: 10,
  },
  clubSelectorLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#9C27B0",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
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
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
