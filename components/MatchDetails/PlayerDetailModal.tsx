/**
 * PlayerDetailModal Component
 *
 * Modal displaying detailed statistics for a single player.
 * Extracted from MatchDetailsScreen for better modularity.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { PlayerStats } from "../../constants/matchDetailsConstants";
import { ShootingBar, StatBox } from "./SharedComponents";
import { Team } from "../../src/models/types";
import { Club } from "../../models/Club";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { getActionColor } from "../../src/models/ActionTypes";
import { COACH_ASSISTANT_LOGO_NO_BG, COACH_ASSISTANT_LOGO_WHITE_NO_BG } from "../../src/utils/logoHelper";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
} from "../../constants";
import PlayerAvatar from "../PlayerAvatar";

interface PlayerDetailModalProps {
  player: PlayerStats | null;
  onClose: () => void;
  myTeamName?: string;
  opponentName?: string;
  actions?: any[];
  club?: Club | null;
}

export default function PlayerDetailModal({
  player,
  onClose,
  myTeamName = "Notre équipe",
  opponentName = "Adversaire",
  actions = [],
  club = null,
}: PlayerDetailModalProps) {
  if (!player) return null;

  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;
  const logo = isDark ? COACH_ASSISTANT_LOGO_WHITE_NO_BG : COACH_ASSISTANT_LOGO_NO_BG;

  // Filter actions for this specific player
  const playerActions = useMemo(() => {
    if (!actions || actions.length === 0) return [];

    return actions.filter((action) => {
      const playerNum = action.player_number || action.player;
      return action.team === player.team && playerNum === player.playerNumber;
    });
  }, [actions, player]);

  // Create markers for court visualization
  const courtMarkers = useMemo(() => {
    return playerActions
      .filter((action: any) => action.semanticPosition) // Only actions with position
      .map((action: any, index: number) => {
        // BasketballCourtSVG expects portrait coordinates (0-COURT_SVG_WIDTH_PORTRAIT x 0-COURT_SVG_HEIGHT_PORTRAIT)
        // semanticPosition contains normalized portrait coords (xNormalized, yNormalized)
        const svgX = action.semanticPosition.xNormalized * COURT_SVG_WIDTH_PORTRAIT;
        const svgY = action.semanticPosition.yNormalized * COURT_SVG_HEIGHT_PORTRAIT;

        // Get marker color from action config
        const actionType = action.action_type || action.type || "";
        const specification = action.specification || "";
        const points = action.points;

        const markerColor = getActionColor(actionType, specification, points);

        return {
          id: `${action.team}-${action.player || action.player_number}-${action.timestamp || index}-${index}`,
          svgX,
          svgY,
          color: markerColor,
          actionType: actionType,
          specification: specification,
        };
      });
  }, [playerActions]);

  // Court colors
  const courtBackgroundColor = club?.courtBackgroundColor || colors.court.background;
  const courtLineColor = club?.courtLineColor || colors.court.line;

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalHeaderBg,
                { backgroundColor: colors.surfaceVariant },
              ]}
            />
            <Image
              source={logo}
              style={styles.modalLogo}
            />
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.modalPlayerAvatar}>
              <PlayerAvatar
                playerName={player.name}
                playerNumber={player.playerNumber}
                photoUrl={player.photoUrl}
                size={80}
                borderColor={colors.surface}
                backgroundColor={colors.surfaceVariant}
                textColor={colors.text.secondary}
                borderWidth={4}
              />
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalPlayerInfo}>
              <View style={styles.modalPlayerNameRow}>
                <Text style={[styles.modalPlayerName, { color: textPrimary }]}>
                  {player.name}
                </Text>
                <Text style={[styles.modalPlayerNumber, { color: textSecondary }]}>
                  - #{player.playerNumber}
                </Text>
              </View>
              <Text style={[styles.modalPlayerTeam, { color: textSecondary }]}>
                {player.team === Team.MY_TEAM ? myTeamName : opponentName}
              </Text>
            </View>

            {/* Main Stats Grid */}
            <View style={styles.mainStatsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.statCardValue, { color: textPrimary }]}>
                  {player.min}
                </Text>
                <Text style={[styles.statCardLabel, { color: textSecondary }]}>
                  Temps
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.statCardValue, { color: textPrimary }]}>
                  {player.pts}
                </Text>
                <Text style={[styles.statCardLabel, { color: textSecondary }]}>
                  Points
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderWidth: 2,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.statCardValue, { color: colors.primary }]}>
                  {player.eff}
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.primary }]}>
                  Éval
                </Text>
              </View>
            </View>

            {/* Shooting Stats */}
            <View style={styles.shootingSection}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Performance aux tirs
              </Text>
              <View
                style={[
                  styles.shootingCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
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
                    { borderTopColor: colors.border },
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
            </View>

            {/* Detailed Stats Grid */}
            <View style={styles.detailedStatsSection}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Détails
              </Text>
              <View style={styles.detailedStatsGrid}>
                <StatBox label="REB OFF/DEF" value={`${player.reb_off}/${player.reb_def}`} sub={`Total: ${player.reb}`} />
                <StatBox label="AST" value={player.ast} sub="Passes décisives" />
                <StatBox label="INT" value={player.stl} sub="Interceptions" />
                <StatBox label="CTR" value={player.blk} sub="Contres" />
                <StatBox label="BP" value={player.to} sub="Balles perdues" />
                <StatBox label="FTE" value={player.pf} sub="Fautes" />
              </View>
            </View>

            {/* Court View */}
            {courtMarkers.length > 0 && (
              <View style={styles.courtSection}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Carte des actions
                </Text>
                <View
                  style={[
                    styles.courtContainer,
                    { backgroundColor: courtBackgroundColor },
                  ]}
                >
                  <BasketballCourtSVG
                    width={600}
                    height={350}
                    backgroundColor={courtBackgroundColor}
                    lineColor={courtLineColor}
                    markers={courtMarkers}
                    logoUri={club?.logoUrl || null}
                  />
                </View>
              </View>
            )}
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
    height: "95%",
    overflow: "hidden",
  },
  modalHeader: {
    position: "relative",
    paddingTop: 28,
    paddingBottom: 10,
    alignItems: "center",
  },
  modalHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  modalLogo: {
    position: "absolute",
    top: -20,
    left: 60,
    width: 150,
    height: 150,
    zIndex: 10,
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
    marginTop: 0,
    marginBottom: 10,
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
    flexGrow: 1,
  },
  modalPlayerInfo: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalPlayerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  modalPlayerName: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  modalPlayerNumber: {
    fontSize: 18,
    marginTop: 5,
    fontWeight: "700",
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
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  shootingCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
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
  courtSection: {
    paddingHorizontal: 30,
    marginBottom: 32,
    height: 380,
  },
  courtContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
});
