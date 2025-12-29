import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { CommonStyles } from "../../src/theme";
import { ROUTES } from "../../constants/routes";
import { TeamGender, TEAM_GENDER_LABELS } from "../../models/Team";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import { RootStackParamList, RootNavigationProp } from "../../types/navigation";

type TeamInfoRouteProp = RouteProp<RootStackParamList, "TeamInfo">;

export default function TeamInfoScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<TeamInfoRouteProp>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { clubId, teamId, teamData } = route.params;

  const [name, setName] = useState(teamData?.name || "");
  const [category, setCategory] = useState(teamData?.category || "");
  const [gender, setGender] = useState<TeamGender>(teamData?.gender || TeamGender.MALE);

  const GENDERS: { value: TeamGender; label: string; color: string }[] = [
    { value: TeamGender.MALE, label: TEAM_GENDER_LABELS[TeamGender.MALE], color: colors.primary },
    { value: TeamGender.FEMALE, label: TEAM_GENDER_LABELS[TeamGender.FEMALE], color: colors.primary },
    { value: TeamGender.MIXED, label: TEAM_GENDER_LABELS[TeamGender.MIXED], color: colors.primary },
  ];

  const bgColor = colors.background;
  const surfaceColor = colors.surface;

  // Load team data if editing
  useEffect(() => {
    if (teamId && !teamData) {
      loadTeamData();
    }
  }, [teamId]);

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

  const loadTeamData = async () => {
    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const team = await teamService.getTeamById(teamId!);

      if (team) {
        setName(team.name || "");
        setCategory(team.category || "");
        setGender(team.gender || TeamGender.MALE);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    }
  };

  const handleNext = () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom de l'équipe est obligatoire");
      return;
    }

    navigation.navigate(ROUTES.TEAM_ROSTER, {
      clubId,
      teamId,
      teamData: {
        name: name.trim(),
        category: category.trim(),
        gender,
      },
    });
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !user) return;

    Alert.alert(
      "Supprimer l'équipe",
      "Êtes-vous sûr de vouloir supprimer définitivement cette équipe ?\n\n⚠️ Attention : Cette action archivera l'équipe et toutes ses données associées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.deleteTeam(teamId, user.id);
              Alert.alert("Succès", "Équipe supprimée", [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.goBack();
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error) {
              console.error("Error deleting team:", error);
              Alert.alert("Erreur", "Impossible de supprimer l'équipe");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          CommonStyles.header,
          {
            backgroundColor: surfaceColor,
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
          {teamId ? "Modification d'équipe" : "Création d'équipe"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: colors.border }]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Informations de base
        </Text>

        {/* Team Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            Nom de l'équipe <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
                color: colors.text.primary,
              },
            ]}
            placeholder="Ex: U15 Région"
            placeholderTextColor={colors.text.tertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            Catégorie / Niveau
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
                color: colors.text.primary,
              },
            ]}
            placeholder="Ex: Départemental 1"
            placeholderTextColor={colors.text.tertiary}
            value={category}
            onChangeText={setCategory}
            maxLength={50}
          />
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            Genre
          </Text>
          <View style={styles.genderGrid}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                onPress={() => setGender(g.value)}
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      gender === g.value ? `${g.color}15` : surfaceColor,
                    borderColor: gender === g.value ? g.color : colors.border,
                    borderWidth: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.genderText,
                    {
                      color:
                        gender === g.value ? g.color : colors.text.secondary,
                      fontWeight: gender === g.value ? "bold" : "600",
                    },
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: surfaceColor,
            borderTopColor: colors.border,
          },
        ]}
      >
        {teamId && (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.error,
              },
            ]}
            onPress={handleDeleteTeam}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>Supprimer l'équipe</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: name.trim()
                ? colors.primary
                : colors.text.disabled,
            },
          ]}
          onPress={handleNext}
          disabled={!name.trim()}
        >
          <Text style={styles.nextButtonText}>Suivant</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  genderGrid: {
    flexDirection: "row",
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  genderText: {
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
