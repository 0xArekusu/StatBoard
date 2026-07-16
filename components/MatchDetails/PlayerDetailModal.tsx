/**
 * PlayerDetailModal Component
 *
 * Modal displaying detailed statistics for a single player.
 * Extracted from MatchDetailsScreen for better modularity.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { PlayerStats } from "../../constants/matchDetailsConstants";
import { ShootingBar, StatBox, MarkerType } from "./SharedComponents";
import { Team } from "../../src/models/types";
import { Club } from "../../models/Club";
import BasketballCourtSVG from "../BasketballCourtSVG";
import {
  getActionColor,
  ActionType,
  ReboundSpecification,
  FoulSpecification,
} from "../../src/models/ActionTypes";
import {
  COACH_ASSISTANT_LOGO_NO_BG,
  COACH_ASSISTANT_LOGO_WHITE_NO_BG,
  isColorDark,
} from "../../src/utils/logoHelper";
import { MatchSponsor, getSponsorUris } from "../../src/services/SponsorService";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
  COURT_SVG_WIDTH_LANDSCAPE,
  COURT_SVG_HEIGHT_LANDSCAPE,
} from "../../constants";
import PlayerAvatar from "../PlayerAvatar";
import { PDFExportService } from "../../src/services/export/PDFExportService";

interface PlayerDetailModalProps {
  player: PlayerStats | null;
  onClose: () => void;
  myTeamName?: string;
  opponentName?: string;
  actions?: any[];
  club?: Club | null;
  matchDate?: Date;
  matchSponsors?: MatchSponsor[];
}

export default function PlayerDetailModal({
  player,
  onClose,
  myTeamName = "Notre équipe",
  opponentName = "Adversaire",
  actions = [],
  club = null,
  matchDate,
  matchSponsors = [],
}: PlayerDetailModalProps) {
  const { colors, isDark } = useTheme();
  const { isCompact, sp, font, sizes } = useResponsive();
  const [isExporting, setIsExporting] = useState(false);
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;
  const logo = isDark
    ? COACH_ASSISTANT_LOGO_WHITE_NO_BG
    : COACH_ASSISTANT_LOGO_NO_BG;

  // Filter actions for this specific player
  const playerActions = useMemo(() => {
    if (!actions || actions.length === 0 || !player) return [];
    return actions.filter((action) => {
      const playerNum = action.player_number || action.player;
      return action.team === player.team && playerNum === player.playerNumber;
    });
  }, [actions, player]);

  // Breakdown of fouls by type (personal/technical/antisportive/disqualifying)
  const foulBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      [FoulSpecification.PERSONAL]: 0,
      [FoulSpecification.TECHNICAL]: 0,
      [FoulSpecification.PENALITY]: 0,
      [FoulSpecification.DISQUALIFICATION]: 0,
    };
    playerActions.forEach((action: any) => {
      const actionType = (action.action_type || action.type || "").toUpperCase();
      if (actionType !== ActionType.FOUL.toUpperCase()) return;
      const spec = (action.specification || "").toLowerCase();
      if (spec in counts) counts[spec] += 1;
    });
    return counts;
  }, [playerActions]);

  // Create markers for court visualization
  const courtMarkers = useMemo(() => {
    return playerActions
      .filter((action: any) => action.semanticPosition) // Only actions with position
      .map((action: any, index: number) => {
        // BasketballCourtSVG expects portrait coordinates (0-COURT_SVG_WIDTH_PORTRAIT x 0-COURT_SVG_HEIGHT_PORTRAIT)
        // semanticPosition contains normalized portrait coords (xNormalized, yNormalized)
        const svgX =
          action.semanticPosition.xNormalized * COURT_SVG_WIDTH_PORTRAIT;
        const svgY =
          action.semanticPosition.yNormalized * COURT_SVG_HEIGHT_PORTRAIT;

        // Get marker color from action config
        const actionType = action.action_type || action.type || "";
        const specification = action.specification || "";
        const points = action.points;

        const markerColor = getActionColor(actionType, specification, points);

        return {
          id: `${action.team}-${action.player || action.player_number}-${
            action.timestamp || index
          }-${index}`,
          svgX,
          svgY,
          color: markerColor,
          actionType: actionType,
          specification: specification,
        };
      });
  }, [playerActions]);

  // Court colors and logo
  const courtBackgroundColor =
    club?.courtBackgroundColor || colors.court.background;
  const courtLineColor = club?.courtLineColor || colors.court.line;
  const clubLogoUri = useSignedUrl(club?.logoUrl);

  // Sponsors 5/6 (side banners) sit right next to the court in this modal,
  // so their dark/light variant must follow the court background, not the app theme.
  const isCourtDark = isColorDark(courtBackgroundColor);
  const sponsorUris = useMemo(
    () => getSponsorUris(matchSponsors, courtBackgroundColor, isCourtDark),
    [matchSponsors, courtBackgroundColor, isCourtDark],
  );

  const handleExportPDF = async () => {
    if (!player || isExporting) return;
    setIsExporting(true);
    try {
      await PDFExportService.generatePlayerPDF({
        player,
        actions,
        myTeamName,
        opponentName,
        clubLogoUrl: clubLogoUri ?? undefined,
        courtBackgroundColor: club?.courtBackgroundColor,
        courtLineColor: club?.courtLineColor,
        matchDate,
        matchSponsors,
      });
    } catch (e) {
      console.error("[PlayerDetailModal] Export PDF error:", e);
    } finally {
      setIsExporting(false);
    }
  };

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
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: isCompact ? sp.md : sp.lg,
                paddingBottom: isCompact ? sp.xs : sp.sm,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeaderBg,
                {
                  backgroundColor: colors.surfaceVariant,
                  height: isCompact
                    ? sizes.avatarMd + sp.lg
                    : sizes.avatarLg + sp.xl,
                },
              ]}
            />
            <Image
              source={logo}
              style={[
                styles.modalLogo,
                {
                  width: sizes.logoMd,
                  height: sizes.logoMd,
                  top: -sp.md,
                  left: isCompact ? 40 : 60,
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleExportPDF}
              style={[
                styles.pdfButton,
                {
                  top: 16,
                  right: 64,
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                },
              ]}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name="document-text-outline"
                    size={sizes.iconSm}
                    color={colors.primary}
                  />
                  <Text style={[styles.pdfButtonText, { color: colors.primary, fontSize: font.xs }]}>
                    PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons
                name="close"
                size={sizes.iconMd}
                color={colors.text.primary}
              />
            </TouchableOpacity>

            <View style={styles.modalPlayerAvatar}>
              <PlayerAvatar
                playerName={player.name}
                playerNumber={player.playerNumber}
                photoUrl={player.photoUrl}
                size={sizes.avatarMd}
                borderColor={colors.surface}
                backgroundColor={colors.surfaceVariant}
                textColor={colors.text.secondary}
                borderWidth={isCompact ? 2 : 4}
              />
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.modalPlayerInfo,
                { paddingHorizontal: sp.lg, marginBottom: sp.lg },
              ]}
            >
              <View style={[
                    styles.modalPlayerNameRow,
                    { marginTop: sp.lg },
                  ]}>
                <Text
                  style={[
                    styles.modalPlayerName,
                    { color: textPrimary, fontSize: font.xxl },
                  ]}
                >
                  {player.name}
                </Text>
                <Text
                  style={[
                    styles.modalPlayerNumber,
                    { color: textSecondary, fontSize: font.xl },
                  ]}
                >
                  - #{player.playerNumber}
                </Text>
              </View>
              <Text
                style={[
                  styles.modalPlayerTeam,
                  { color: textSecondary, fontSize: font.md },
                ]}
              >
                {player.team === Team.MY_TEAM ? myTeamName : opponentName}
              </Text>
            </View>

            {/* Main Stats Grid */}
            <View
              style={[
                styles.mainStatsGrid,
                { paddingHorizontal: sp.lg, gap: sp.md, marginBottom: sp.lg },
              ]}
            >
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surfaceVariant, padding: sp.md },
                ]}
              >
                <Text
                  style={[
                    styles.statCardValue,
                    { color: textPrimary, fontSize: isCompact ? font.xl : 28 },
                  ]}
                >
                  {player.min}
                </Text>
                <Text style={[styles.statCardLabel, { color: textSecondary }]}>
                  Temps
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surfaceVariant, padding: sp.md },
                ]}
              >
                <Text
                  style={[
                    styles.statCardValue,
                    { color: textPrimary, fontSize: isCompact ? font.xl : 28 },
                  ]}
                >
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
                    padding: sp.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statCardValue,
                    {
                      color: player.pm === null ? textSecondary : player.pm > 0 ? "#4CAF50" : player.pm < 0 ? "#F44336" : textPrimary,
                      fontSize: isCompact ? font.xl : 28,
                    },
                  ]}
                >
                  {player.pm === null ? "—" : player.pm > 0 ? `+${player.pm}` : player.pm}
                </Text>
                <Text style={[styles.statCardLabel, { color: textSecondary }]}>
                  +/-
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    padding: sp.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statCardValue,
                    {
                      color: colors.primary,
                      fontSize: isCompact ? font.xl : 28,
                    },
                  ]}
                >
                  {player.eff}
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.primary }]}>
                  Éval
                </Text>
              </View>
            </View>

            {/* Shooting Stats */}
            <View
              style={[
                styles.shootingSection,
                { paddingHorizontal: sp.lg, marginBottom: sp.xl },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: textPrimary, marginBottom: sp.md },
                ]}
              >
                Performance aux tirs
              </Text>
              <View
                style={[
                  styles.shootingCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    padding: sp.lg,
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
            <View
              style={[
                styles.detailedStatsSection,
                { paddingHorizontal: sp.lg, marginBottom: sp.xl },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: textPrimary, marginBottom: sp.md },
                ]}
              >
                Détails
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailedStatsScrollView} contentContainerStyle={[styles.detailedStatsGrid, styles.detailedStatsGridCentered]}>
                <StatBox
                  label="REB"
                  sub={`Rebonds: ${player.reb}`}
                  quad={[
                    {
                      label: "OFF",
                      value: player.reb_off,
                      color: getActionColor(ActionType.REBOUND, ReboundSpecification.OFFENSIVE, 0),
                      markerType: MarkerType.TRIANGLE,
                    },
                    {
                      label: "DEF",
                      value: player.reb_def,
                      color: getActionColor(ActionType.REBOUND, ReboundSpecification.DEFENSIVE, 0),
                      markerType: MarkerType.TRIANGLE,
                    },
                  ]}
                />
                <StatBox
                  label="AST"
                  value={player.ast}
                  sub="Passes décisives"
                  markerType={MarkerType.CIRCLE}
                  markerColor={getActionColor(ActionType.ASSIST, "", 0)}
                />
                <StatBox
                  label="INT"
                  value={player.stl}
                  sub="Interceptions"
                  markerType={MarkerType.CIRCLE}
                  markerColor={getActionColor(ActionType.STEAL, "", 0)}
                />
                <StatBox
                  label="CTR"
                  value={player.blk}
                  sub="Contres"
                  markerType={MarkerType.CIRCLE}
                  markerColor={getActionColor(ActionType.BLOCK, "", 0)}
                />
                <StatBox
                  label="BP"
                  value={player.to}
                  sub="Balles perdues"
                  markerType={MarkerType.CIRCLE}
                  markerColor={getActionColor(ActionType.TURNOVER, "", 0)}
                />
                <StatBox
                  label="FTE"
                  sub={`Fautes: ${player.pf}`}
                  quad={[
                    {
                      label: "PERS",
                      value: foulBreakdown[FoulSpecification.PERSONAL],
                      color: getActionColor(ActionType.FOUL, FoulSpecification.PERSONAL, 0),
                    },
                    {
                      label: "TECH",
                      value: foulBreakdown[FoulSpecification.TECHNICAL],
                      color: getActionColor(ActionType.FOUL, FoulSpecification.TECHNICAL, 0),
                    },
                    {
                      label: "ANT",
                      value: foulBreakdown[FoulSpecification.PENALITY],
                      color: getActionColor(ActionType.FOUL, FoulSpecification.PENALITY, 0),
                    },
                    {
                      label: "DISQ",
                      value: foulBreakdown[FoulSpecification.DISQUALIFICATION],
                      color: getActionColor(ActionType.FOUL, FoulSpecification.DISQUALIFICATION, 0),
                    },
                  ]}
                />
                <StatBox
                  label="FP"
                  value={player.fd}
                  sub="Fautes provoquées"
                  markerType={MarkerType.DIAMOND}
                  markerColor={getActionColor(ActionType.FOUL_DRAWN, "", 0)}
                />
              </ScrollView>
            </View>

            {/* Court View */}
            {courtMarkers.length > 0 && (
              <View
                style={[
                  styles.courtSection,
                  {
                    paddingHorizontal: sp.lg,
                    marginBottom: sp.xl,
                    height: isCompact ? 210 : 380,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: textPrimary, marginBottom: sp.md },
                  ]}
                >
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
                    logoUri={clubLogoUri}
                    courtSponsorTopUri={sponsorUris.top}
                    courtSponsorBottomUri={sponsorUris.bottom}
                    courtSponsorThirdUri={sponsorUris.third}
                    courtSponsorFourthUri={sponsorUris.fourth}
                  />
                  {sponsorUris.sideLeft ? (
                    <View style={[styles.sideBanner, { left: 0 }]}>
                      <Image
                        source={{ uri: sponsorUris.sideLeft }}
                        style={[styles.sideBannerImage, { transform: [{ rotate: '-90deg' }] }]}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                  {sponsorUris.sideRight ? (
                    <View style={[styles.sideBanner, { right: 0 }]}>
                      <Image
                        source={{ uri: sponsorUris.sideRight }}
                        style={[styles.sideBannerImage, { transform: [{ rotate: '90deg' }] }]}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
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
    alignItems: "center",
  },
  modalHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  modalLogo: {
    position: "absolute",
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
  pdfButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  pdfButtonText: {
    fontWeight: "700",
    letterSpacing: 0.5,
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
  },
  modalPlayerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  modalPlayerName: {
    fontWeight: "900",
    textAlign: "center",
  },
  modalPlayerNumber: {
    marginTop: 5,
    fontWeight: "700",
  },
  modalPlayerTeam: {
    fontWeight: "600",
  },
  mainStatsGrid: {
    flexDirection: "row",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
  },
  statCardValue: {
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
  shootingSection: {},
  shootingCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  shootingSummary: {
    flexDirection: "row",
    marginTop: 0,
    paddingTop: 5,
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
  detailedStatsSection: {},
  detailedStatsScrollView: {
    width: "100%",
  },
  detailedStatsGrid: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    flexGrow: 1,
    justifyContent: "center",
  },
  detailedStatsGridCentered: {
    minWidth: "100%",
    justifyContent: "center",
  },
  courtSection: {},
  courtLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    justifyContent: "center",
  },
  courtLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courtLegendLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  legendCircleOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  legendCircleFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendCross: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
  legendShape: {
    fontSize: 10,
    lineHeight: 13,
  },
  courtContainer: {
    flex: 1,
    alignSelf: "center",
    aspectRatio: COURT_SVG_WIDTH_LANDSCAPE / COURT_SVG_HEIGHT_LANDSCAPE,
    borderRadius: 16,
    overflow: "hidden",
    padding: 20,
  },
  sideBanner: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideBannerImage: {
    width: 150,
    height: 60,
  },
});
