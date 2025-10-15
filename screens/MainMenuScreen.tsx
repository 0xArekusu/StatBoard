import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../src/contexts/AuthContext";

type RootStackParamList = {
  MainMenu: undefined;
  Board: undefined;
  MatchHistory: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MainMenu">;

export default function MainMenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut, user } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnexion", onPress: () => signOut(), style: "destructive" },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>🏀 StatBoard</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Board")}
      >
        <Text style={styles.buttonText}>🎯 Nouveau match</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate("MatchHistory")}
      >
        <Text style={styles.buttonText}>📊 Historique des matchs</Text>
      </TouchableOpacity>

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
  },
  secondaryButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
