import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState, useCallback } from "react";
import ClubChoiceModal from "../components/ClubChoiceModal";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import type { Club } from "../models/Club";
import { ROUTES } from "../constants/routes";

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
  const [userClub, setUserClub] = useState<Club | null>(null);
  const [loadingClub, setLoadingClub] = useState(false);

  // Load user's club when screen is focused
  const loadUserClub = useCallback(async () => {
    if (!user) {
      setUserClub(null);
      return;
    }

    try {
      setLoadingClub(true);
      const clubService = ServiceFactory.getClubService(supabase);
      const clubs = await clubService.getUserClubs(user.id);
      setUserClub(clubs.length > 0 ? clubs[0] : null);
    } catch (error) {
      console.error("Error loading user club:", error);
    } finally {
      setLoadingClub(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUserClub();
    }, [loadUserClub])
  );

  const handleSignOut = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", onPress: () => signOut(), style: "destructive" },
    ]);
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
        style={styles.button}
        onPress={() => navigation.navigate(ROUTES.BOARD as never)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.buttonText}>Nouveau match</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate(ROUTES.MATCH_HISTORY as never)}
      >
        <MaterialCommunityIcons
          name="clipboard-list-outline"
          size={24}
          color="#fff"
        />
        <Text style={styles.buttonText}>Historique des matchs</Text>
      </TouchableOpacity>

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
  secondaryButton: {
    backgroundColor: "#4CAF50",
  },
  clubButton: {
    backgroundColor: "#9C27B0",
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
