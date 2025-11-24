import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
}

interface PDFPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  matchDate?: Date;
  periodScoresA: number[];
  periodScoresB: number[];
  cumulativeScoresA: number[];
  cumulativeScoresB: number[];
  statsTeamA: any[];
  statsTeamB: any[];
  periodLabel: string;
  teamMode: "A" | "B" | "BOTH";
  scoreManuallyAdjusted?: boolean;
}

export default function PDFPreviewModal({
  visible,
  onClose,
  teamA,
  teamB,
  scoreA,
  scoreB,
  matchDate = new Date(),
  periodScoresA,
  periodScoresB,
  cumulativeScoresA,
  cumulativeScoresB,
  statsTeamA,
  statsTeamB,
  periodLabel,
  teamMode,
  scoreManuallyAdjusted = false,
}: PDFPreviewModalProps) {
  const { colors, isDark } = useTheme();
  const dateStr = matchDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalPeriods = periodScoresA.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Aperçu PDF</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Preview Badge */}
        <View style={[styles.previewBadge, { backgroundColor: STATUS_COLORS.warning + "20", borderColor: STATUS_COLORS.warning }]}>
          <Ionicons name="eye-outline" size={20} color={STATUS_COLORS.warning} />
          <Text style={[styles.previewText, { color: STATUS_COLORS.warning }]}>APERÇU - Passez à Premium pour l'export PDF</Text>
        </View>

        {/* PDF Content */}
        <ScrollView style={styles.content}>
          {/* Match Header */}
          <View style={[styles.pdfHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pdfTitle, { color: colors.text.primary }]}>🏀 Feuille de Match - Basketball</Text>
            <Text style={[styles.pdfDate, { color: colors.text.secondary }]}>{dateStr}</Text>
          </View>

          {/* Score Summary */}
          <View style={[styles.scoreSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.matchInfo, { color: colors.text.primary }]}>
              {teamA} vs {teamB}
            </Text>
            <View style={[styles.finalScore, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Text style={[styles.finalScoreText, { color: colors.text.primary }]}>
                {scoreA} - {scoreB}
              </Text>
            </View>
            {scoreManuallyAdjusted && (
              <View style={[styles.warningBanner, { backgroundColor: STATUS_COLORS.warning + "20", borderColor: STATUS_COLORS.warning }]}>
                <Text style={[styles.warningText, { color: STATUS_COLORS.warning }]}>
                  ⚠️ Score ajusté manuellement - Les statistiques peuvent ne pas correspondre au score affiché
                </Text>
              </View>
            )}
          </View>

          {/* Period Scores */}
          <View style={[styles.tableSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>Scores par période</Text>
            <View style={[styles.table, { borderColor: colors.border }]}>
              {/* Header */}
              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableCell, styles.tableHeader, { color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>Équipe</Text>
                {periodScoresA.map((_, idx) => (
                  <Text key={idx} style={[styles.tableCell, styles.tableHeader, { color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>
                    {periodLabel}{idx + 1}
                  </Text>
                ))}
                <Text style={[styles.tableCell, styles.tableHeader, { color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>Total</Text>
              </View>

              {/* Team A */}
              {(teamMode === "A" || teamMode === "BOTH") && (
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableCell, styles.teamCell, { color: colors.text.primary }]}>{teamA}</Text>
                  {periodScoresA.map((score, idx) => (
                    <Text key={idx} style={[styles.tableCell, { color: colors.text.secondary }]}>
                      {score}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, styles.totalCell, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>{scoreA}</Text>
                </View>
              )}

              {/* Team B */}
              {(teamMode === "B" || teamMode === "BOTH") && (
                <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableCell, styles.teamCell, { color: colors.text.primary }]}>{teamB}</Text>
                  {periodScoresB.map((score, idx) => (
                    <Text key={idx} style={[styles.tableCell, { color: colors.text.secondary }]}>
                      {score}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, styles.totalCell, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>{scoreB}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Score Evolution Chart */}
          <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>Évolution du score</Text>
            <View style={styles.chartContainer}>
              <LineChart
              data={{
                labels: [
                  "Début",
                  ...Array.from({ length: totalPeriods }).map((_, i) =>
                    periodLabel === "MT" ? `MT${i + 1}` : `Q${i + 1}`
                  ),
                ],
                datasets: [
                  ...(teamMode === "A" || teamMode === "BOTH"
                    ? [
                        {
                          data: [0, ...cumulativeScoresA],
                          color: () => "#FF6B35",
                          strokeWidth: 3,
                        },
                      ]
                    : []),
                  ...(teamMode === "B" || teamMode === "BOTH"
                    ? [
                        {
                          data: [0, ...cumulativeScoresB],
                          color: () => "#004E89",
                          strokeWidth: 3,
                        },
                      ]
                    : []),
                ],
                legend: [
                  ...(teamMode === "A" || teamMode === "BOTH" ? [teamA] : []),
                  ...(teamMode === "B" || teamMode === "BOTH" ? [teamB] : []),
                ],
              }}
              width={Dimensions.get("window").width - 60}
              height={200}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.8})` : `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.7})` : `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                },
              }}
              bezier
              style={styles.chart}
            />
            {/* Watermark on chart */}
            <View style={styles.chartWatermark}>
              <Text style={[styles.chartWatermarkText, { color: colors.text.disabled }]}>PREVIEW</Text>
            </View>
          </View>
        </View>

          {/* Team A Stats */}
          {statsTeamA.length > 0 && (
            <View style={[styles.statsSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>Statistiques - {teamA}</Text>
              <View style={styles.statsContainer}>
                <View style={[styles.statsTable, { borderColor: colors.border }]}>
                  <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 35, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>#</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 100, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>Joueur</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>PTS</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>2PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>3PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>LFM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RO</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RD</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RT</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>F</Text>
                  </View>
                  {statsTeamA.map((player) => {
                    const foulDisplay = player.stats.tf > 0
                      ? `${player.stats.pf + player.stats.tf} (${player.stats.tf}T)`
                      : `${player.stats.pf}`;
                    return (
                      <View key={player.id} style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.statsCell, { width: 35, color: colors.text.secondary }]}>{player.num}</Text>
                        <Text style={[styles.statsCell, { width: 100, textAlign: "left", color: colors.text.primary }]}>{player.name}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.points}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.twopm}/{player.stats.twopa}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.threepm}/{player.stats.threepa}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.ftm}/{player.stats.fta}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.orb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.drb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.trb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{foulDisplay}</Text>
                      </View>
                    );
                  })}
                  {/* Totals row */}
                  <View style={[styles.statsRow, styles.totalsRow, { backgroundColor: STATUS_COLORS.info + "30" }]}>
                    <Text style={[styles.statsCell, { width: 35, color: colors.text.primary }]}></Text>
                    <Text style={[styles.statsCell, { width: 100, fontWeight: "bold", textAlign: "left", color: colors.text.primary }]}>TOTAL</Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.points, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.twopm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.twopa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.threepm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.threepa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.ftm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.fta, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.orb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.drb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.trb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.pf + p.stats.tf, 0)}
                    </Text>
                  </View>
                </View>
                {/* Watermark on stats table */}
                <View style={styles.statsWatermark}>
                  <Text style={[styles.statsWatermarkText, { color: colors.text.disabled }]}>PREVIEW</Text>
                </View>
              </View>
              <Text style={[styles.legend, { color: colors.text.tertiary }]}>
                PTS: Points | 2PM: 2 points | 3PM: 3 points | LFM: Lancers francs{"\n"}
                RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | F: Fautes
              </Text>
            </View>
          )}

          {/* Team B Stats */}
          {statsTeamB.length > 0 && (
            <View style={[styles.statsSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary, backgroundColor: colors.surfaceVariant }]}>Statistiques - {teamB}</Text>
              <View style={styles.statsContainer}>
                <View style={[styles.statsTable, { borderColor: colors.border }]}>
                  <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 35, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>#</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 100, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>Joueur</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>PTS</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>2PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>3PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>LFM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RO</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RD</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>RT</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40, color: COMMON_COLORS.white, backgroundColor: STATUS_COLORS.info }]}>F</Text>
                  </View>
                  {statsTeamB.map((player) => {
                    const foulDisplay = player.stats.tf > 0
                      ? `${player.stats.pf + player.stats.tf} (${player.stats.tf}T)`
                      : `${player.stats.pf}`;
                    return (
                      <View key={player.id} style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.statsCell, { width: 35, color: colors.text.secondary }]}>{player.num}</Text>
                        <Text style={[styles.statsCell, { width: 100, textAlign: "left", color: colors.text.primary }]}>{player.name}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.points}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.twopm}/{player.stats.twopa}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.threepm}/{player.stats.threepa}</Text>
                        <Text style={[styles.statsCell, { width: 50, color: colors.text.secondary }]}>{player.stats.ftm}/{player.stats.fta}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.orb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.drb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{player.stats.trb}</Text>
                        <Text style={[styles.statsCell, { width: 40, color: colors.text.secondary }]}>{foulDisplay}</Text>
                      </View>
                    );
                  })}
                  {/* Totals row */}
                  <View style={[styles.statsRow, styles.totalsRow, { backgroundColor: STATUS_COLORS.info + "30" }]}>
                    <Text style={[styles.statsCell, { width: 35, color: colors.text.primary }]}></Text>
                    <Text style={[styles.statsCell, { width: 100, fontWeight: "bold", textAlign: "left", color: colors.text.primary }]}>TOTAL</Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.points, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.twopm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.twopa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.threepm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.threepa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.ftm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.fta, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.orb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.drb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.trb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold", color: colors.text.primary }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.pf + p.stats.tf, 0)}
                    </Text>
                  </View>
                </View>
                {/* Watermark on stats table */}
                <View style={styles.statsWatermark}>
                  <Text style={[styles.statsWatermarkText, { color: colors.text.disabled }]}>PREVIEW</Text>
                </View>
              </View>
              <Text style={[styles.legend, { color: colors.text.tertiary }]}>
                PTS: Points | 2PM: 2 points | 3PM: 3 points | LFM: Lancers francs{"\n"}
                RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | F: Fautes
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B35",
  },
  previewText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pdfHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  pdfTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  pdfDate: {
    fontSize: 14,
    color: "#666",
  },
  scoreSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  matchInfo: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  finalScore: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  finalScoreText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  tableSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
  },
  table: {
    borderWidth: 1,
    borderColor: "#333",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tableCell: {
    flex: 1,
    padding: 10,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  teamCell: {
    fontWeight: "bold",
    textAlign: "left",
  },
  totalCell: {
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
  },
  statsSection: {
    marginVertical: 20,
  },
  statsTable: {
    borderWidth: 1,
    borderColor: "#333",
  },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  statsCell: {
    flex: 1,
    padding: 8,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#333",
    fontSize: 12,
  },
  statsHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  totalsRow: {
    backgroundColor: "#f9f9f9",
  },
  legend: {
    fontSize: 10,
    color: "#666",
    marginTop: 8,
    paddingHorizontal: 10,
  },
  statsContainer: {
    position: "relative",
    overflow: "hidden",
  },
  statsWatermark: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
    pointerEvents: "none",
    zIndex: 1,
  },
  statsWatermarkText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "rgba(255, 107, 53, 0.2)",
  },
  chartSection: {
    marginVertical: 20,
  },
  chartContainer: {
    position: "relative",
    alignItems: "center",
    overflow: "hidden",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartWatermark: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
    pointerEvents: "none",
    zIndex: 1,
  },
  chartWatermarkText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "rgba(255, 107, 53, 0.2)",
  },
  warningBanner: {
    backgroundColor: "#FFF3E0",
    borderWidth: 2,
    borderColor: "#FF9800",
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  warningText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
});
