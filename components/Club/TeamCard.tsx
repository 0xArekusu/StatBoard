import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { Team, TeamStatus, TEAM_GENDER_LABELS } from "../../models/Team";
import { ROUTES } from "../../constants/routes";
import JerseyIconSimple from "../icons/JerseySimpleIcon";

interface TeamCardProps {
  team: Team;
  navigation: any;
  clubId?: string;
  isOwner: boolean;
  currentUserId?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
}

export default function TeamCard({
  team,
  navigation,
  clubId,
  isOwner,
  currentUserId,
  onApprove,
  onReject,
  onDelete,
}: TeamCardProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const isClickable = team.status === TeamStatus.APPROVED && team.isActive;
  const canEdit = team.ownerId === currentUserId;

  return (
    <TouchableOpacity
      style={[
        styles.teamCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity:
            team.status === TeamStatus.APPROVED && team.isActive ? 1 : 0.6,
          padding: sp.md,
        },
      ]}
      onPress={() => {
        if (isClickable) {
          if (!canEdit) {
            Alert.alert(
              "Accès refusé",
              "Seul le propriétaire du club ou le coach de l'équipe peut la modifier.",
              [{ text: "OK" }],
            );
            return;
          }
          navigation.navigate(ROUTES.TEAM_INFO, { teamId: team.id, clubId });
        }
      }}
      disabled={!isClickable}
    >
      {/* Status Badge */}
      {team.status === TeamStatus.PENDING && (
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Ionicons name="time-outline" size={10} color={colors.text.primary} />
          <Text style={styles.statusBadgeText}>EN ATTENTE</Text>
        </View>
      )}
      {team.status === TeamStatus.REJECTED && (
        <View style={[styles.statusBadge, styles.statusRejected]}>
          <Ionicons name="close-circle" size={10} color={colors.text.primary} />
          <Text style={styles.statusBadgeText}>REFUSÉ</Text>
        </View>
      )}
      {team.status === TeamStatus.APPROVED && !team.isActive && (
        <View style={[styles.statusBadge, styles.statusSuspended]}>
          <Ionicons name="pause-circle" size={10} color="#fff" />
          <Text style={styles.statusBadgeText}>SUSPENDUE</Text>
        </View>
      )}

      <View style={[styles.teamCardLeft, { gap: sp.md }]}>
        <View
          style={[
            styles.teamIcon,
            {
              backgroundColor: colors.surfaceVariant,
              width: sizes.avatarMd,
              height: sizes.avatarMd,
            },
          ]}
        >
          <JerseyIconSimple />
        </View>
        <View style={styles.teamInfo}>
          <Text
            style={[
              styles.teamName,
              {
                color:
                  team.status === TeamStatus.REJECTED
                    ? colors.text.secondary
                    : colors.text.primary,
                textDecorationLine:
                  team.status === TeamStatus.REJECTED ? "line-through" : "none",
                fontSize: font.lg,
              },
            ]}
          >
            {team.name}
          </Text>
          <Text
            style={[
              styles.teamCategory,
              {
                color: colors.text.secondary,
                fontSize: font.sm,
                marginTop: sp.xs,
              },
            ]}
          >
            {team.gender ? TEAM_GENDER_LABELS[team.gender] : "N/A"} •{" "}
            {team.playerCount ?? 0} Joueur
            {(team.playerCount ?? 0) > 1 ? "s" : ""}
          </Text>
          {team.coachName && (
            <Text
              style={[
                styles.teamCoach,
                {
                  color: colors.text.secondary,
                  fontSize: font.xs,
                  marginTop: sp.xs,
                },
              ]}
            >
              {team.coachName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.teamCardRight}>
        <View style={styles.actionButtons}>
          {team.status === TeamStatus.PENDING && isOwner ? (
            <>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onReject?.();
                }}
                style={[styles.actionButton, styles.rejectButton]}
              >
                <Ionicons name="close-circle" size={20} color="#dc2626" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onApprove?.();
                }}
                style={[styles.actionButton, styles.approveButton]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {isOwner && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              )}
              {team.status === TeamStatus.APPROVED && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.text.secondary}
                />
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  statusBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  statusPending: {
    backgroundColor: "#fbbf24",
  },
  statusRejected: {
    backgroundColor: "#ef4444",
  },
  statusSuspended: {
    backgroundColor: "#64748b",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  teamCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  teamCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  teamCoach: {
    fontSize: 10,
    marginTop: 2,
  },
  teamCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 999,
  },
  approveButton: {
    backgroundColor: "#dcfce7",
  },
  rejectButton: {
    backgroundColor: "#fee2e2",
  },
  deleteButton: {
    padding: 4,
  },
});
