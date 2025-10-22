import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import type { TeamCategory, TeamGender } from "../models/Team";

type RootStackParamList = {
  TeamForm: { clubId: string };
};

type TeamFormRouteProp = RouteProp<RootStackParamList, "TeamForm">;

const CATEGORIES: { value: TeamCategory; label: string }[] = [
  { value: "senior", label: "Senior" },
  { value: "u18", label: "U18" },
  { value: "u15", label: "U15" },
  { value: "u13", label: "U13" },
  { value: "u11", label: "U11" },
  { value: "u9", label: "U9" },
  { value: "u7", label: "U7" },
];

const GENDERS: { value: TeamGender; label: string }[] = [
  { value: "male", label: "Masculin" },
  { value: "female", label: "Féminin" },
  { value: "mixed", label: "Mixte" },
];

export default function TeamFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamFormRouteProp>();
  const { user } = useAuth();
  const clubId = route.params.clubId;

  const [teamName, setTeamName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TeamCategory | undefined>(undefined);
  const [selectedGender, setSelectedGender] = useState<TeamGender | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Erreur", "Vous devez être connecté");
      return;
    }

    if (!teamName.trim()) {
      Alert.alert("Erreur", "Le nom de l'équipe est requis");
      return;
    }

    setSaving(true);

    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const result = await teamService.createTeam(
        {
          name: teamName.trim(),
          clubId,
          category: selectedCategory,
          gender: selectedGender,
        },
        user.id
      );

      if (!result.success) {
        Alert.alert("Erreur", result.error || "Impossible de créer l'équipe");
        setSaving(false);
        return;
      }

      Alert.alert(
        "Succès",
        "Votre équipe a été créée et est en attente de validation par le responsable du club.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error creating team:", error);
      Alert.alert("Erreur", "Une erreur est survenue");
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une équipe</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Nom de l'équipe *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Les Lions U15"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Catégorie (optionnel)</Text>
          <View style={styles.optionGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.optionButton,
                  selectedCategory === cat.value && styles.optionButtonSelected,
                ]}
                onPress={() =>
                  setSelectedCategory(selectedCategory === cat.value ? undefined : cat.value)
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedCategory === cat.value && styles.optionTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Genre (optionnel)</Text>
          <View style={styles.optionGrid}>
            {GENDERS.map((gender) => (
              <TouchableOpacity
                key={gender.value}
                style={[
                  styles.optionButton,
                  selectedGender === gender.value && styles.optionButtonSelected,
                ]}
                onPress={() =>
                  setSelectedGender(selectedGender === gender.value ? undefined : gender.value)
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === gender.value && styles.optionTextSelected,
                  ]}
                >
                  {gender.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            Votre équipe sera en attente de validation par le responsable du club avant d'être active.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? "Création..." : "Créer l'équipe"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  optionButtonSelected: {
    borderColor: "#9C27B0",
    backgroundColor: "#9C27B0",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  optionTextSelected: {
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: "#9C27B0",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
