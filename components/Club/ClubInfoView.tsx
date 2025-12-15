import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../../src/theme";
import { Club } from "../../models/Club";
import { Team } from "../../models/Team";
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from "../../models/Subscription";
import { ClubSubTab, CLUB_SUB_TAB } from "../../constants";
import TeamCard from "./TeamCard";

interface ClubInfoViewProps {
  club: Club;
  teams: Team[];
  isOwner: boolean;
  onEditClub: () => void;
  onToggleSubTab: () => void;
  subTab: ClubSubTab;
  navigation: any;
  onApproveTeam: (teamId: string) => void;
  onRejectTeam: (teamId: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onAddTeam: () => void;
  visibleTeams: Team[];
  currentTeamCount: number;
  maxTeams: number;
  isLimitReached: boolean;
  currentTier: SubscriptionTier;
}

export default function ClubInfoView({
  club,
  teams,
  isOwner,
  onEditClub,
  onToggleSubTab,
  subTab,
  navigation,
  onApproveTeam,
  onRejectTeam,
  onDeleteTeam,
  onAddTeam,
  visibleTeams,
  currentTeamCount,
  maxTeams,
  isLimitReached,
  currentTier,
}: ClubInfoViewProps) {
  const { isDark } = useTheme();

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>Mon Club</Text>
          {isOwner && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={onEditClub}
                style={[
                  styles.editButton,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="palette"
                  size={16}
                  color={BRAND_COLORS[500]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onToggleSubTab}
                style={[
                  styles.headerButton,
                  {
                    backgroundColor:
                      subTab === CLUB_SUB_TAB.SUBSCRIPTION
                        ? BRAND_COLORS[600]
                        : surfaceColor,
                    borderColor:
                      subTab === CLUB_SUB_TAB.SUBSCRIPTION
                        ? BRAND_COLORS[500]
                        : borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={currentTier === "ultimate" ? "crown" : "star"}
                  size={12}
                  color={
                    subTab === CLUB_SUB_TAB.SUBSCRIPTION
                      ? COMMON_COLORS.white
                      : BRAND_COLORS[500]
                  }
                />
                <Text
                  style={[
                    styles.headerButtonText,
                    {
                      color:
                        subTab === CLUB_SUB_TAB.SUBSCRIPTION
                          ? COMMON_COLORS.white
                          : textSecondary,
                    },
                  ]}
                >
                  {subTab === CLUB_SUB_TAB.SUBSCRIPTION ? "Fermer" : "Offre"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Club Info Content - Only show when not in subscription view */}
        {subTab !== CLUB_SUB_TAB.SUBSCRIPTION && (
          <>
            {/* Club Info Card */}
            <View
              style={[
                styles.clubCard,
                { backgroundColor: surfaceColor, borderColor },
              ]}
            >
              <View
                style={[
                  styles.clubLogo,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[700]
                      : SLATE_COLORS[100],
                  },
                ]}
              >
                {club.logoUrl ? (
                  <Image
                    source={{ uri: club.logoUrl }}
                    style={styles.clubLogoImage}
                  />
                ) : (
                  <Image
                    source={require("../../components/icons/coachassistant-logo-margin.png")}
                    style={styles.clubLogoImage}
                  />
                )}
              </View>

              <Text style={[styles.clubName, { color: textPrimary }]}>
                {club.name}
              </Text>

              {isOwner && (
                <View
                  style={[
                    styles.clubCodeCard,
                    {
                      backgroundColor: isDark
                        ? SLATE_COLORS[900]
                        : SLATE_COLORS[50],
                      borderColor: isDark
                        ? SLATE_COLORS[700]
                        : SLATE_COLORS[100],
                    },
                  ]}
                >
                  <Text
                    style={[styles.clubCodeLabel, { color: textSecondary }]}
                  >
                    CODE CLUB
                  </Text>
                  <View style={styles.clubCodeRow}>
                    <Text
                      style={[styles.clubCodeValue, { color: textPrimary }]}
                    >
                      {club.code}
                    </Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert("Copié", club.code)}
                    >
                      <MaterialCommunityIcons
                        name="content-copy"
                        size={14}
                        color={BRAND_COLORS[500]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Team Usage Bar */}
              <View style={styles.usageBar}>
                <View style={styles.usageBarHeader}>
                  <Text
                    style={[styles.usageBarLabel, { color: textSecondary }]}
                  >
                    Abonnement {currentTier}
                  </Text>
                  <Text
                    style={[
                      styles.usageBarValue,
                      {
                        color: isLimitReached ? "#ef4444" : BRAND_COLORS[600],
                      },
                    ]}
                  >
                    {currentTeamCount} / {maxTeams > 100 ? "∞" : maxTeams}{" "}
                    Équipes
                  </Text>
                </View>
                <View
                  style={[
                    styles.usageBarTrack,
                    {
                      backgroundColor: isDark
                        ? SLATE_COLORS[700]
                        : SLATE_COLORS[100],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.usageBarFill,
                      {
                        backgroundColor: isLimitReached
                          ? "#ef4444"
                          : BRAND_COLORS[500],
                        width: `${Math.min(
                          100,
                          (currentTeamCount /
                            (maxTeams > 100 ? 20 : maxTeams)) *
                            100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
                {isLimitReached && isOwner && (
                  <TouchableOpacity onPress={onToggleSubTab}>
                    <Text
                      style={[
                        styles.upgradeLink,
                        { color: BRAND_COLORS[600] },
                      ]}
                    >
                      Augmenter la limite
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Teams Section */}
            <View style={styles.teamsSection}>
              <View style={styles.teamsSectionHeader}>
                <Text
                  style={[styles.teamsSectionTitle, { color: textPrimary }]}
                >
                  Nos Équipes
                </Text>
                <TouchableOpacity
                  onPress={onAddTeam}
                  style={[
                    styles.addTeamButton,
                    {
                      backgroundColor: isLimitReached
                        ? SLATE_COLORS[400]
                        : BRAND_COLORS[600],
                    },
                  ]}
                  disabled={!isOwner && isLimitReached}
                >
                  <MaterialCommunityIcons
                    name={isLimitReached ? "lock" : "plus"}
                    size={20}
                    color={COMMON_COLORS.white}
                  />
                </TouchableOpacity>
              </View>

              {visibleTeams.length > 0 ? (
                visibleTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    navigation={navigation}
                    clubId={club?.id}
                    isOwner={isOwner}
                    onApprove={() => onApproveTeam(team.id)}
                    onReject={() => onRejectTeam(team.id)}
                    onDelete={() => onDeleteTeam(team.id)}
                  />
                ))
              ) : (
                <View
                  style={[
                    styles.emptyTeams,
                    {
                      backgroundColor: isDark
                        ? `${SLATE_COLORS[900]}80`
                        : SLATE_COLORS[100],
                      borderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={24}
                    color={textSecondary}
                    style={{ opacity: 0.5 }}
                  />
                  <Text
                    style={[styles.emptyTeamsText, { color: textSecondary }]}
                  >
                    {isOwner
                      ? "Aucune équipe créée."
                      : "Aucune équipe assignée."}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  clubCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 24,
  },
  clubLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  clubLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  clubName: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  clubCodeCard: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  clubCodeLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  clubCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clubCodeValue: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  usageBar: {
    width: "100%",
  },
  usageBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  usageBarLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  usageBarValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  usageBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  upgradeLink: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  teamsSection: {
    gap: 16,
  },
  teamsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamsSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addTeamButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTeams: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyTeamsText: {
    fontSize: 14,
    marginTop: 8,
  },
});
