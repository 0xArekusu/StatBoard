/**
 * PlayerDetailModal Component
 *
 * Modal displaying detailed statistics for a single player.
 * Extracted from MatchDetailsScreen for better modularity.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { PlayerStats } from "../../constants/matchDetailsConstants";
import { ShootingBar, StatBox } from "./SharedComponents";
import { Team } from "../../src/models/types";

interface PlayerDetailModalProps {
  player: PlayerStats | null;
  onClose: () => void;
  myTeamName?: string;
  opponentName?: string;
}

export default function PlayerDetailModal({
  player,
  onClose,
  myTeamName = "Notre équipe",
  opponentName = "Adversaire",
}: PlayerDetailModalProps) {
  const { colors, isDark } = useTheme();
  const bgColor = isDark ? colors.background : colors.surface;
  const surfaceColor = isDark ? colors.surface : colors.background;
  const borderColor = isDark ? colors.surfaceVariant : colors.border;
  const textPrimary = isDark ? colors.text.primary : colors.text.primary;
  const textSecondary = isDark ? colors.text.secondary : colors.text.secondary;
  const textTertiary = isDark ? colors.text.tertiary : colors.text.secondary;

  if (!player) return null;

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: surfaceColor }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalHeaderBg,
                { backgroundColor: colors.primary },
              ]}
            />
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.modalPlayerAvatar}>
              <View
                style={[
                  styles.playerAvatarCircle,
                  {
                    borderColor: surfaceColor,
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerAvatarNumber,
                    { color: colors.text.secondary },
                  ]}
                >
                  {player.playerNumber}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalPlayerInfo}>
              <Text style={[styles.modalPlayerName, { color: textPrimary }]}>
                {player.name}
              </Text>
              <Text style={[styles.modalPlayerTeam, { color: textSecondary }]}>
                {player.team === Team.MY_TEAM ? myTeamName : opponentName}
              </Text>
            </View>

            {/* Main Stats Grid */}
            <View style={styles.mainStatsGrid}>
              <View style={[styles.statCard, { backgroundColor: bgColor }]}>
                <Text style={[styles.statCardValue, { color: textPrimary }]}>
                  {player.min}'
                </Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>
                  Temps
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.statCardValue, { color: colors.primary }]}
                >
                  {player.pts}
                </Text>
                <Text
                  style={[styles.statCardLabel, { color: colors.primary }]}
                >
                  Points
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: bgColor }]}>
                <Text style={[styles.statCardValue, { color: textPrimary }]}>
                  {player.eff}
                </Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>
                  Éval
                </Text>
              </View>
            </View>

            {/* Shooting Stats */}
            <View
              style={[
                styles.shootingSection,
                {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                🎯 Performance aux tirs
              </Text>
              <ShootingBar
                label="3 Points"
                made={player.fg3m}
                attempted={player.fg3a}
                color="#6366f1"
              />
              <ShootingBar
                label="2 Points"
                made={player.fg2m}
                attempted={player.fg2a}
                color="#3b82f6"
              />
              <ShootingBar
                label="Lancers"
                made={player.ftm}
                attempted={player.fta}
                color="#06b6d4"
              />

              <View
                style={[
                  styles.shootingSummary,
                  { borderTopColor: borderColor },
                ]}
              >
                <View style={styles.shootingSummaryItem}>
                  <Text
                    style={[
                      styles.shootingSummaryValue,
                      { color: textPrimary },
                    ]}
                  >
                    {player.fgm}/{player.fga}
                  </Text>
                  <Text
                    style={[
                      styles.shootingSummaryLabel,
                      { color: textTertiary },
                    ]}
                  >
                    TOTAL TIRS
                  </Text>
                </View>
                <View style={styles.shootingSummaryItem}>
                  <Text
                    style={[
                      styles.shootingSummaryValue,
                      { color: textPrimary },
                    ]}
                  >
                    {player.fga > 0
                      ? Math.round((player.fgm / player.fga) * 100)
                      : 0}
                    %
                  </Text>
                  <Text
                    style={[
                      styles.shootingSummaryLabel,
                      { color: textTertiary },
                    ]}
                  >
                    RÉUSSITE
                  </Text>
                </View>
              </View>
            </View>

            {/* Detailed Stats Grid */}
            <View style={styles.detailedStatsSection}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Détails
              </Text>
              <View style={styles.detailedStatsGrid}>
                <StatBox label="REB OFF/DEF" value={`${player.reb_off}/${player.reb_def}`} sub={`Total: ${player.reb}`} />
                <StatBox label="AST" value={player.ast} sub="Passes" />
                <StatBox label="INT" value={player.stl} sub="Vols" />
                <StatBox label="CTR" value={player.blk} sub="Contres" />
                <StatBox label="BP" value={player.to} sub="Pertes" />
                <StatBox label="FTE" value={player.pf} sub="Fautes" />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    position: "relative",
    paddingTop: 48,
    paddingBottom: 80,
    alignItems: "center",
  },
  modalHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    zIndex: 10,
  },
  modalPlayerAvatar: {
    marginTop: 16,
  },
  playerAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarNumber: {
    fontSize: 32,
    fontWeight: "900",
  },
  modalScroll: {
    flex: 1,
  },
  modalPlayerInfo: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalPlayerName: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
  },
  modalPlayerTeam: {
    fontSize: 14,
    fontWeight: "600",
  },
  mainStatsGrid: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 28,
  },
  statCardLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  shootingSection: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  shootingSummary: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  shootingSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  shootingSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  shootingSummaryLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  detailedStatsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  detailedStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
