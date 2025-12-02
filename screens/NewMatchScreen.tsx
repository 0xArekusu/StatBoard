import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
  UI_COLORS,
  STATUS_COLORS,
} from "../src/theme/clubDefaults";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { Club } from "../models/Club";
import { Team, TeamStatus } from "../models/Team";
import { Player } from "../models/Player";

interface NewMatchScreenProps {
  navigation: any;
  route: any;
}

type Step = 1 | 2;

export default function NewMatchScreen({
  navigation,
  route,
}: NewMatchScreenProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // Get defaultTeamId from route params
  const defaultTeamId = route.params?.teamId || null;

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);

  // STEP 1: General Info
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState<"HOME" | "AWAY">("HOME");
  const [trackOpponentStats, setTrackOpponentStats] = useState(false);

  // Match Format Settings
  const [periodCount, setPeriodCount] = useState(4); // Default 4 Quarters
  const [periodDuration, setPeriodDuration] = useState(10); // Default 10 Minutes

  // STEP 2: Rosters
  const [rosterTab, setRosterTab] = useState<"HOME" | "AWAY">("HOME");
  const toggleAnimation = useRef(new Animated.Value(0)).current;

  // My Team Management
  const [availableHomePlayers, setAvailableHomePlayers] = useState<Player[]>(
    []
  );
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Player[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [tempHomePlayerName, setTempHomePlayerName] = useState("");
  const [tempHomePlayerNumber, setTempHomePlayerNumber] = useState("");

  // Opponent Management
  const [opponentRoster, setOpponentRoster] = useState<Player[]>([]);
  const [newOppPlayerName, setNewOppPlayerName] = useState("");
  const [newOppPlayerNumber, setNewOppPlayerNumber] = useState("");

  // Initialize Logic
  useEffect(() => {
    loadClubData();
  }, []);

  useEffect(() => {
    if (club && defaultTeamId) {
      setSelectedTeamId(defaultTeamId);
    } else if (club && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [club, teams, defaultTeamId]);

  // Load roster when team changes
  useEffect(() => {
    if (club && selectedTeamId && teams.length > 0) {
      const team = teams.find((t) => t.id === selectedTeamId);
      if (team) {
        loadTeamRoster(team.id);
      }
    }
  }, [selectedTeamId, club, teams]);

  const loadClubData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clubService = ServiceFactory.getClubService(supabase);
      const clubs = await clubService.getUserMemberClubs(user.id);
      const firstClub = clubs.length > 0 ? clubs[0] : null;
      setClub(firstClub);

      if (firstClub) {
        const teamService = ServiceFactory.getTeamService(supabase);
        const clubTeams = await teamService.getClubTeams(firstClub.id);
        // Filter to only show approved teams where user is the owner
        const myApprovedTeams = clubTeams.filter(
          (team) =>
            team.ownerId === user.id && team.status === TeamStatus.APPROVED
        );
        setTeams(myApprovedTeams);
      }
    } catch (error) {
      console.error("Error loading club data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRoster = async (teamId: string) => {
    try {
      const playerService = ServiceFactory.getPlayerService(supabase);
      const roster = await playerService.getTeamPlayers(teamId);
      setAvailableHomePlayers(roster);
      setSelectedHomePlayers(roster); // Select all by default
      // Auto-select first 5 as starters if available
      setStarters(roster.slice(0, 5).map((p) => p.id));
    } catch (error) {
      console.error("Error loading team roster:", error);
    }
  };

  // --- HANDLERS: STEP 1 ---

  const handleNextStep = () => {
    if (!opponent) {
      Alert.alert("Erreur", "Veuillez saisir le nom de l'adversaire.");
      return;
    }
    if (!selectedTeamId) {
      Alert.alert("Erreur", "Veuillez sélectionner une équipe.");
      return;
    }
    setStep(2);
  };

  // --- HANDLERS: STEP 2 (HOME) ---

  const handleToggleRoster = () => {
    const newTab = rosterTab === "HOME" ? "AWAY" : "HOME";
    const toValue = newTab === "HOME" ? 0 : 1;

    Animated.spring(toggleAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    setRosterTab(newTab);
  };

  const isInRoster = (player: Player, list: Player[]) =>
    list.some((p) => p.id === player.id);

  const toggleHomePlayer = (player: Player) => {
    if (isInRoster(player, selectedHomePlayers)) {
      // Remove from roster AND starters
      setSelectedHomePlayers(
        selectedHomePlayers.filter((p) => p.id !== player.id)
      );
      setStarters(starters.filter((id) => id !== player.id));
    } else {
      setSelectedHomePlayers([...selectedHomePlayers, player]);
    }
  };

  const toggleStarter = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter((id) => id !== playerId));
    } else {
      if (starters.length >= 5) {
        Alert.alert(
          "5 majeur complet",
          "Le 5 majeur est complet. Retirez un joueur avant d'en ajouter un."
        );
        return;
      }
      setStarters([...starters, playerId]);
    }
  };

  const addTempHomePlayer = () => {
    if (!tempHomePlayerName || !tempHomePlayerNumber) return;
    const newPlayer: Player = {
      id: `temp-${Date.now()}`,
      name: tempHomePlayerName,
      jerseyNumber: parseInt(tempHomePlayerNumber, 10),
      teamId: selectedTeamId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Add to both lists so it appears as selectable and selected
    setAvailableHomePlayers([...availableHomePlayers, newPlayer]);
    setSelectedHomePlayers([...selectedHomePlayers, newPlayer]);
    // Auto add to starter if space
    if (starters.length < 5) {
      setStarters([...starters, newPlayer.id]);
    }
    setTempHomePlayerName("");
    setTempHomePlayerNumber("");
  };

  // --- HANDLERS: STEP 2 (AWAY) ---

  const addOpponentPlayer = () => {
    if (!newOppPlayerNumber) return;
    const newPlayer: Player = {
      id: `opp-${Date.now()}`,
      name: newOppPlayerName || `Joueur ${newOppPlayerNumber}`,
      jerseyNumber: parseInt(newOppPlayerNumber, 10),
      teamId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setOpponentRoster([...opponentRoster, newPlayer]);
    setNewOppPlayerName("");
    setNewOppPlayerNumber("");
  };

  const generateOpponentRoster = (count: number) => {
    const generated: Player[] = Array.from({ length: count }).map((_, i) => ({
      id: `opp-gen-${Date.now()}-${i}`,
      name: `Joueur ${i + 4}`,
      jerseyNumber: i + 4,
      teamId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setOpponentRoster([...opponentRoster, ...generated]);
  };

  const removeOpponentPlayer = (id: string) => {
    setOpponentRoster(opponentRoster.filter((p) => p.id !== id));
  };

  // --- START MATCH ---

  const handleStart = () => {
    if (selectedHomePlayers.length < 1) {
      Alert.alert("Erreur", "Il faut au moins 1 joueur dans votre équipe.");
      return;
    }

    const requiredStarters = Math.min(5, selectedHomePlayers.length);
    if (starters.length !== requiredStarters) {
      Alert.alert(
        "Erreur",
        `Veuillez sélectionner ${requiredStarters} joueurs pour le 5 de départ.`
      );
      return;
    }

    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    // Create match object
    const matchData = {
      id: Date.now().toString(),
      clubId: club?.id || "",
      teamId: team.id,
      opponent,
      location,
      trackOpponentStats,
      periodCount,
      periodDuration,
      homePlayers: selectedHomePlayers,
      starters,
      awayPlayers: trackOpponentStats ? opponentRoster : [],
      teamName: team.name,
      teamLogo: team.logo,
      createdAt: new Date(),
    };

    // Navigate to LiveMatch screen
    navigation.navigate("LiveMatch", { matchData });
  };

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <TouchableOpacity
          onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name={step === 2 ? "arrow-left" : "close"}
            size={24}
            color={textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {step === 1 ? "Configuration du match" : "Feuille de match"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressContainer,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor: step >= 1 ? BRAND_COLORS[500] : borderColor,
              },
            ]}
          />
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor: step >= 2 ? BRAND_COLORS[500] : borderColor,
              },
            ]}
          />
        </View>
      </View>

      {/* --- STEP 1: INFO --- */}
      {step === 1 && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Team Selection */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: textSecondary }]}>
              MON ÉQUIPE
            </Text>
            {teams.length > 0 ? (
              <View
                style={[
                  styles.formInput,
                  { backgroundColor: surfaceColor, borderColor },
                ]}
              >
                <Text style={[styles.formInputText, { color: textPrimary }]}>
                  {teams.find((t) => t.id === selectedTeamId)?.name ||
                    "Équipe non trouvée"}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.alertBox,
                  { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color="#ef4444"
                />
                <Text style={[styles.alertText, { color: "#dc2626" }]}>
                  Pas d'équipe créée
                </Text>
              </View>
            )}
          </View>

          {/* Opponent */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: textSecondary }]}>
              ADVERSAIRE{" "}
              <Text style={{ color: STATUS_COLORS.required }}>*</Text>
            </Text>
            <TextInput
              value={opponent}
              onChangeText={setOpponent}
              placeholder="Nom de l'équipe adverse"
              placeholderTextColor={textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: surfaceColor,
                  borderColor,
                  color: textPrimary,
                },
              ]}
            />
          </View>

          {/* Format Settings */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: textSecondary }]}>
              FORMAT DU MATCH
            </Text>

            <View style={styles.formatButtons}>
              <TouchableOpacity
                onPress={() => {
                  setPeriodCount(4);
                  setPeriodDuration(10);
                }}
                style={[
                  styles.formatButton,
                  {
                    backgroundColor:
                      periodCount === 4
                        ? `${BRAND_COLORS[500]}20`
                        : surfaceColor,
                    borderColor:
                      periodCount === 4 ? BRAND_COLORS[500] : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.formatButtonText,
                    {
                      color:
                        periodCount === 4 ? BRAND_COLORS[600] : textSecondary,
                    },
                  ]}
                >
                  4 Quarts-temps
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPeriodCount(2);
                  setPeriodDuration(20);
                }}
                style={[
                  styles.formatButton,
                  {
                    backgroundColor:
                      periodCount === 2
                        ? `${BRAND_COLORS[500]}20`
                        : surfaceColor,
                    borderColor:
                      periodCount === 2 ? BRAND_COLORS[500] : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.formatButtonText,
                    {
                      color:
                        periodCount === 2 ? BRAND_COLORS[600] : textSecondary,
                    },
                  ]}
                >
                  2 Mi-temps
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.durationRow}>
              <View style={styles.durationControl}>
                <Text style={[styles.durationLabel, { color: textSecondary }]}>
                  PÉRIODES
                </Text>
                <View style={styles.durationAdjuster}>
                  <TouchableOpacity
                    onPress={() => setPeriodCount(Math.max(1, periodCount - 1))}
                    style={[
                      styles.adjustButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={18}
                      color={textSecondary}
                    />
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.durationInput,
                      { backgroundColor: surfaceColor, borderColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="timeline"
                      size={16}
                      color={textSecondary}
                    />
                    <Text
                      style={[styles.durationValue, { color: textPrimary }]}
                    >
                      {periodCount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPeriodCount(Math.min(8, periodCount + 1))}
                    style={[
                      styles.adjustButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color={textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.durationControl}>
                <Text style={[styles.durationLabel, { color: textSecondary }]}>
                  MINUTES / PÉRIODE
                </Text>
                <View style={styles.durationAdjuster}>
                  <TouchableOpacity
                    onPress={() =>
                      setPeriodDuration(Math.max(1, periodDuration - 1))
                    }
                    style={[
                      styles.adjustButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={18}
                      color={textSecondary}
                    />
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.durationInput,
                      { backgroundColor: surfaceColor, borderColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={16}
                      color={textSecondary}
                    />
                    <Text
                      style={[styles.durationValue, { color: textPrimary }]}
                    >
                      {periodDuration}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setPeriodDuration(Math.min(60, periodDuration + 1))
                    }
                    style={[
                      styles.adjustButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color={textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: textSecondary }]}>
              LIEU
            </Text>
            <View style={styles.locationButtons}>
              <TouchableOpacity
                onPress={() => setLocation("HOME")}
                style={[
                  styles.locationButton,
                  {
                    backgroundColor:
                      location === "HOME" ? BRAND_COLORS[600] : surfaceColor,
                    borderColor:
                      location === "HOME" ? BRAND_COLORS[500] : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === "HOME"
                          ? COMMON_COLORS.white
                          : textSecondary,
                    },
                  ]}
                >
                  Domicile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLocation("AWAY")}
                style={[
                  styles.locationButton,
                  {
                    backgroundColor:
                      location === "AWAY" ? BRAND_COLORS[600] : surfaceColor,
                    borderColor:
                      location === "AWAY" ? BRAND_COLORS[500] : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === "AWAY"
                          ? COMMON_COLORS.white
                          : textSecondary,
                    },
                  ]}
                >
                  Extérieur
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Options */}
          <TouchableOpacity
            onPress={() => setTrackOpponentStats(!trackOpponentStats)}
            style={[
              styles.optionCard,
              {
                backgroundColor: surfaceColor,
                borderColor: trackOpponentStats
                  ? BRAND_COLORS[500]
                  : borderColor,
              },
            ]}
          >
            <View style={styles.optionCardLeft}>
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor: trackOpponentStats
                      ? `${BRAND_COLORS[500]}20`
                      : isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[200],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={20}
                  color={trackOpponentStats ? BRAND_COLORS[600] : textSecondary}
                />
              </View>
              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    styles.optionTitle,
                    {
                      color: trackOpponentStats ? textPrimary : textSecondary,
                    },
                  ]}
                >
                  Stats Adversaires
                </Text>
                <Text style={[styles.optionSubtitle, { color: textSecondary }]}>
                  Saisir aussi les tirs/fautes adverses
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: trackOpponentStats
                    ? BRAND_COLORS[500]
                    : borderColor,
                  backgroundColor: trackOpponentStats
                    ? BRAND_COLORS[500]
                    : "transparent",
                },
              ]}
            >
              {trackOpponentStats && (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={COMMON_COLORS.white}
                />
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* --- STEP 2: ROSTERS --- */}
      {step === 2 && (
        <View style={styles.rosterContainer}>
          {/* Tabs */}
          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: surfaceColor, borderBottomColor: borderColor },
            ]}
          >
            <TouchableOpacity
              onPress={handleToggleRoster}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                  borderColor,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.toggleSlider,
                  {
                    backgroundColor: BRAND_COLORS[600],
                    transform: [
                      {
                        translateX: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 120],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.toggleOption}>
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        rosterTab === "HOME"
                          ? COMMON_COLORS.white
                          : textSecondary,
                      fontWeight: rosterTab === "HOME" ? "bold" : "normal",
                    },
                  ]}
                >
                  NOUS ({selectedHomePlayers.length})
                </Text>
              </View>
              <View style={styles.toggleOption}>
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        rosterTab === "AWAY"
                          ? COMMON_COLORS.white
                          : textSecondary,
                      fontWeight: rosterTab === "AWAY" ? "bold" : "normal",
                    },
                  ]}
                >
                  EUX ({opponentRoster.length})
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.rosterContent}
            contentContainerStyle={styles.rosterScrollContent}
          >
            {/* HOME TEAM ROSTER */}
            {rosterTab === "HOME" && (
              <View style={styles.rosterSection}>
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: isDark
                        ? `${BRAND_COLORS[500]}10`
                        : `${BRAND_COLORS[500]}10`,
                      borderColor: isDark
                        ? `${BRAND_COLORS[500]}30`
                        : `${BRAND_COLORS[500]}30`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="information"
                    size={16}
                    color={BRAND_COLORS[600]}
                  />
                  <Text
                    style={[styles.infoBoxText, { color: BRAND_COLORS[600] }]}
                  >
                    Sélectionnez les présents et{" "}
                    <Text style={{ fontWeight: "bold" }}>le 5 de départ</Text>{" "}
                    (étoile à droite).
                  </Text>
                  <View
                    style={[
                      styles.starterBadge,
                      {
                        backgroundColor:
                          starters.length === 5 ? "#dcfce7" : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.starterBadgeText,
                        {
                          color:
                            starters.length === 5 ? "#16a34a" : textSecondary,
                        },
                      ]}
                    >
                      {starters.length} / 5
                    </Text>
                  </View>
                </View>

                <View style={styles.playersList}>
                  {availableHomePlayers.map((player) => {
                    const isSelected = isInRoster(player, selectedHomePlayers);
                    const isStarter = starters.includes(player.id);

                    return (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => toggleHomePlayer(player)}
                        style={[
                          styles.playerCard,
                          {
                            backgroundColor: isSelected
                              ? surfaceColor
                              : isDark
                              ? `${SLATE_COLORS[900]}80`
                              : SLATE_COLORS[50],
                            borderColor: isSelected
                              ? isDark
                                ? `${BRAND_COLORS[500]}50`
                                : `${BRAND_COLORS[500]}30`
                              : borderColor,
                            opacity: isSelected ? 1 : 0.6,
                          },
                        ]}
                      >
                        <View style={styles.playerCardLeft}>
                          <View
                            style={[
                              styles.playerCheckbox,
                              {
                                borderColor: isSelected
                                  ? BRAND_COLORS[500]
                                  : borderColor,
                                backgroundColor: isSelected
                                  ? BRAND_COLORS[500]
                                  : "transparent",
                              },
                            ]}
                          >
                            {isSelected && (
                              <MaterialCommunityIcons
                                name="check"
                                size={16}
                                color={COMMON_COLORS.white}
                              />
                            )}
                          </View>
                          <View
                            style={[
                              styles.playerNumber,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? SLATE_COLORS[800]
                                    : SLATE_COLORS[100]
                                  : isDark
                                  ? SLATE_COLORS[800]
                                  : SLATE_COLORS[200],
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.playerNumberText,
                                {
                                  color: isSelected
                                    ? textPrimary
                                    : textSecondary,
                                },
                              ]}
                            >
                              {player.jerseyNumber}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.playerName,
                              {
                                color: isSelected ? textPrimary : textSecondary,
                              },
                            ]}
                          >
                            {player.name}
                          </Text>
                        </View>

                        {isSelected && (
                          <TouchableOpacity
                            onPress={() => toggleStarter(player.id)}
                            style={[
                              styles.starButton,
                              {
                                backgroundColor: isStarter
                                  ? UI_COLORS.starBackground
                                  : "transparent",
                                borderWidth: isStarter ? 2 : 0,
                                borderColor: isStarter
                                  ? UI_COLORS.star
                                  : "transparent",
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={isStarter ? "star" : "star-outline"}
                              size={20}
                              color={isStarter ? UI_COLORS.star : textSecondary}
                            />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add Temp Player */}
                <View
                  style={[
                    styles.addPlayerSection,
                    { borderTopColor: borderColor },
                  ]}
                >
                  <Text style={[styles.addPlayerTitle, { color: textPrimary }]}>
                    Ajouter un renfort
                  </Text>
                  <View style={styles.addPlayerForm}>
                    <TextInput
                      placeholder="Nom"
                      placeholderTextColor={textSecondary}
                      value={tempHomePlayerName}
                      onChangeText={setTempHomePlayerName}
                      style={[
                        styles.addPlayerInput,
                        styles.addPlayerInputName,
                        {
                          backgroundColor: surfaceColor,
                          borderColor,
                          color: textPrimary,
                        },
                      ]}
                    />
                    <TextInput
                      placeholder="#"
                      placeholderTextColor={textSecondary}
                      value={tempHomePlayerNumber}
                      onChangeText={setTempHomePlayerNumber}
                      keyboardType="number-pad"
                      style={[
                        styles.addPlayerInput,
                        styles.addPlayerInputNumber,
                        {
                          backgroundColor: surfaceColor,
                          borderColor,
                          color: textPrimary,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={addTempHomePlayer}
                      disabled={!tempHomePlayerName || !tempHomePlayerNumber}
                      style={[
                        styles.addPlayerButton,
                        {
                          backgroundColor: isDark
                            ? SLATE_COLORS[700]
                            : SLATE_COLORS[900],
                          opacity:
                            !tempHomePlayerName || !tempHomePlayerNumber
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* OPPONENT ROSTER */}
            {rosterTab === "AWAY" && (
              <View style={styles.rosterSection}>
                {!trackOpponentStats ? (
                  <View
                    style={[
                      styles.disabledOpponentBox,
                      {
                        backgroundColor: isDark
                          ? `${SLATE_COLORS[900]}80`
                          : SLATE_COLORS[100],
                        borderColor,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chart-bar"
                      size={32}
                      color={textSecondary}
                      style={{ opacity: 0.5 }}
                    />
                    <Text
                      style={[
                        styles.disabledOpponentTitle,
                        { color: textPrimary },
                      ]}
                    >
                      Statistiques adverses désactivées
                    </Text>
                    <Text
                      style={[
                        styles.disabledOpponentText,
                        { color: textSecondary },
                      ]}
                    >
                      Activez l'option à l'étape précédente pour saisir
                      l'effectif adverse.
                    </Text>
                    <TouchableOpacity onPress={() => setStep(1)}>
                      <Text
                        style={[
                          styles.disabledOpponentLink,
                          { color: BRAND_COLORS[600] },
                        ]}
                      >
                        Modifier les options
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.quickAddButtons}>
                      <TouchableOpacity
                        onPress={() => generateOpponentRoster(5)}
                        style={[
                          styles.quickAddButton,
                          {
                            backgroundColor: isDark
                              ? SLATE_COLORS[800]
                              : SLATE_COLORS[100],
                            borderColor,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="lightning-bolt"
                          size={12}
                          color={textSecondary}
                        />
                        <Text
                          style={[
                            styles.quickAddButtonText,
                            { color: textSecondary },
                          ]}
                        >
                          +5 Joueurs
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => generateOpponentRoster(8)}
                        style={[
                          styles.quickAddButton,
                          {
                            backgroundColor: isDark
                              ? SLATE_COLORS[800]
                              : SLATE_COLORS[100],
                            borderColor,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="lightning-bolt"
                          size={12}
                          color={textSecondary}
                        />
                        <Text
                          style={[
                            styles.quickAddButtonText,
                            { color: textSecondary },
                          ]}
                        >
                          +8 Joueurs
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.addOpponentForm}>
                      <TextInput
                        placeholder="Nom (Optionnel)"
                        placeholderTextColor={textSecondary}
                        value={newOppPlayerName}
                        onChangeText={setNewOppPlayerName}
                        style={[
                          styles.addOpponentInput,
                          styles.addOpponentInputName,
                          {
                            backgroundColor: surfaceColor,
                            borderColor,
                            color: textPrimary,
                          },
                        ]}
                      />
                      <TextInput
                        placeholder="#"
                        placeholderTextColor={textSecondary}
                        value={newOppPlayerNumber}
                        onChangeText={setNewOppPlayerNumber}
                        keyboardType="number-pad"
                        style={[
                          styles.addOpponentInput,
                          styles.addOpponentInputNumber,
                          {
                            backgroundColor: surfaceColor,
                            borderColor,
                            color: textPrimary,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        onPress={addOpponentPlayer}
                        disabled={!newOppPlayerNumber}
                        style={[
                          styles.addOpponentButton,
                          {
                            backgroundColor: BRAND_COLORS[600],
                            opacity: !newOppPlayerNumber ? 0.5 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.addOpponentButtonText,
                            { color: COMMON_COLORS.white },
                          ]}
                        >
                          OK
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.opponentList}>
                      {opponentRoster.length > 0 ? (
                        opponentRoster.map((p) => (
                          <View
                            key={p.id}
                            style={[
                              styles.opponentCard,
                              { backgroundColor: surfaceColor, borderColor },
                            ]}
                          >
                            <View style={styles.opponentCardLeft}>
                              <View
                                style={[
                                  styles.opponentNumber,
                                  {
                                    backgroundColor: isDark
                                      ? SLATE_COLORS[800]
                                      : SLATE_COLORS[100],
                                    borderColor,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.opponentNumberText,
                                    { color: textPrimary },
                                  ]}
                                >
                                  {p.jerseyNumber}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.opponentName,
                                  { color: textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {p.name}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => removeOpponentPlayer(p.id)}
                            >
                              <MaterialCommunityIcons
                                name="delete"
                                size={16}
                                color="#ef4444"
                              />
                            </TouchableOpacity>
                          </View>
                        ))
                      ) : (
                        <View style={styles.emptyOpponentList}>
                          <Text
                            style={[
                              styles.emptyOpponentText,
                              { color: textSecondary },
                            ]}
                          >
                            Aucun joueur adverse ajouté.
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* --- FOOTER ACTION --- */}
      <View
        style={[
          styles.footer,
          { backgroundColor: surfaceColor, borderTopColor: borderColor },
        ]}
      >
        {step === 1 ? (
          <TouchableOpacity
            onPress={handleNextStep}
            disabled={!opponent || !selectedTeamId}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  opponent && selectedTeamId
                    ? BRAND_COLORS[600]
                    : isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[300],
                opacity: opponent && selectedTeamId ? 1 : 0.6,
              },
            ]}
          >
            <Text
              style={[styles.primaryButtonText, { color: COMMON_COLORS.white }]}
            >
              Configurer les effectifs
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={COMMON_COLORS.white}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStart}
            disabled={
              selectedHomePlayers.length < 1 ||
              starters.length !== Math.min(5, selectedHomePlayers.length)
            }
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  selectedHomePlayers.length >= 1 &&
                  starters.length === Math.min(5, selectedHomePlayers.length)
                    ? BRAND_COLORS[600]
                    : isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[300],
                opacity:
                  selectedHomePlayers.length >= 1 &&
                  starters.length === Math.min(5, selectedHomePlayers.length)
                    ? 1
                    : 0.6,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="play-circle"
              size={24}
              color={COMMON_COLORS.white}
            />
            <Text
              style={[styles.primaryButtonText, { color: COMMON_COLORS.white }]}
            >
              Coup d'envoi
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "bold",
  },
  formInputText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 14,
  },
  formatButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  durationRow: {
    flexDirection: "row",
    gap: 16,
  },
  durationControl: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  durationAdjuster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  durationInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  locationButtons: {
    flexDirection: "row",
    gap: 16,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rosterContainer: {
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  toggleButton: {
    flexDirection: "row",
    width: 240,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
  },
  toggleSlider: {
    position: "absolute",
    width: 112,
    height: 44,
    borderRadius: 10,
    left: 0,
    top: 0,
    zIndex: 1,
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  toggleText: {
    fontSize: 12,
  },
  rosterContent: {
    flex: 1,
  },
  rosterScrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  rosterSection: {
    gap: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 12,
    flex: 1,
  },
  starterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  starterBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playersList: {
    gap: 8,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  playerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  playerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
  addPlayerSection: {
    paddingTop: 24,
    marginTop: 24,
    borderTopWidth: 1,
  },
  addPlayerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  addPlayerForm: {
    flexDirection: "row",
    gap: 8,
  },
  addPlayerInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addPlayerInputName: {
    flex: 1,
  },
  addPlayerInputNumber: {
    width: 64,
    textAlign: "center",
  },
  addPlayerButton: {
    width: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledOpponentBox: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  disabledOpponentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  disabledOpponentText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  disabledOpponentLink: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
  },
  quickAddButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickAddButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  addOpponentForm: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  addOpponentInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addOpponentInputName: {
    flex: 1,
  },
  addOpponentInputNumber: {
    width: 64,
    textAlign: "center",
  },
  addOpponentButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addOpponentButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  opponentList: {
    gap: 8,
  },
  opponentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  opponentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  opponentNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  opponentNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  opponentName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  emptyOpponentList: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyOpponentText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
