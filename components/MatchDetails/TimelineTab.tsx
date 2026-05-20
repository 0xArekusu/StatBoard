import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  ActionType,
  ShotSpecification,
  SubstitutionSpecification,
  getActionColor,
} from "../../src/models/ActionTypes";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";

// ─── Constants ────────────────────────────────────────────────────────────────

const CENTER_COL_W = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodLabel(n: number, total: number): string {
  if (n > total) return `OT${n - total}`;
  if (total === 4) return `Q${n}`;
  if (total === 2) return `MT${n}`;
  return `P${n}`;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function getTeamAbbr(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

function getActionDesc(action: any): string {
  const type = (action.action_type || action.type || "").toLowerCase();
  const spec = (action.specification || "").toLowerCase();
  const pts = action.points;
  switch (type) {
    case ActionType.SHOT:
      if (spec === ShotSpecification.MADE) return pts ? `Tir ${pts}pts ✓` : "Tir ✓";
      return pts ? `Tir ${pts}pts ✗` : "Tir ✗";
    case ActionType.REBOUND:
      if (spec === "offensive") return "Rebond offensif";
      if (spec === "defensive") return "Rebond défensif";
      return "Rebond équipe";
    case ActionType.FOUL:
      if (spec === "personal") return "Faute personnelle";
      if (spec === "technical") return "Faute technique";
      if (spec === "penality") return "Antisportive";
      if (spec === "disqualificiation") return "Disqualifiante";
      return "Faute";
    case ActionType.FOUL_DRAWN:
      return "Faute provoquée";
    case ActionType.ASSIST:
      return "Passe décisive";
    case ActionType.STEAL:
      return "Interception";
    case ActionType.BLOCK:
      return "Contre";
    case ActionType.TURNOVER:
      return "Balle perdue";
    case ActionType.SUBSTITUTION:
      return spec === SubstitutionSpecification.IN ? "↑ Entrée" : "↓ Sortie";
    default:
      return type;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Score {
  myTeam: number;
  opponent: number;
}

interface TimelineTabProps {
  actions: any[];
  match: any;
  playerNamesMap: Map<string, string>;
}

interface ActionRowData {
  rowType: "action";
  action: any;
  playerNum: number;
  periodLabel: string;
  timeStr: string;
  description: string;
  playerName: string;
  isMyTeam: boolean;
  isScoring: boolean;
  actionColor: string;
  score: Score;
}

interface PeriodEndData {
  rowType: "period_end";
  periodNumber: number;
  periodLabel: string;
  score: Score;
}

type RowData = ActionRowData | PeriodEndData;

// ─── PlayerBadge ─────────────────────────────────────────────────────────────

function PlayerBadge({ num, teamAbbr, textColor, borderColor: bc }: {
  num: number;
  teamAbbr: string;
  textColor: string;
  borderColor: string;
}) {
  const label = (num === -1 || num === 9999) ? teamAbbr.slice(0, 1).toUpperCase() : String(num);
  return (
    <View style={[styles.playerBadge, { borderColor: bc }]}>
      <Text style={[styles.playerBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelineTab({ actions, match, playerNamesMap }: TimelineTabProps) {
  const { colors, isDark } = useTheme();
  const { sp, font } = useResponsive();

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  const totalPeriods: number = match.total_periods || 4;

  const myTeamColor: string = (colors as any).chart?.myTeam ?? "#FF6B35";
  const opponentColor: string = (colors as any).chart?.opponent ?? "#004E89";
  const bgColor: string = colors.background;
  const surfaceColor: string = colors.surface;
  const borderColor: string = colors.border;
  const textPrimary: string = colors.text.primary;
  const textSecondary: string = colors.text.secondary;
  const textTertiary: string = colors.text.tertiary;
  const lineColor: string = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
  const periodEndBg: string = isDark ? "#1e293b" : "#0f172a";

  const myTeamAbbr = getTeamAbbr(match.my_team_name);
  const opponentAbbr = getTeamAbbr(match.opponent_name);

  // Single pass: sort chronologically then annotate each action with its running score.
  // Sort key: period_number → time_in_period → action_order (all three as tiebreakers so
  // actions with missing action_order still sort correctly by game clock).
  const sortedWithScores = useMemo(() => {
    const sorted = [...actions].sort((a, b) => {
      const dp = (a.period_number ?? 0) - (b.period_number ?? 0);
      if (dp !== 0) return dp;
      const dt = (a.time_in_period ?? 0) - (b.time_in_period ?? 0);
      if (dt !== 0) return dt;
      return (a.action_order ?? 0) - (b.action_order ?? 0);
    });

    let myTeam = 0, opponent = 0;
    return sorted.map((action) => {
      const type = (action.action_type || action.type || "").toLowerCase();
      const spec = (action.specification || "").toLowerCase();
      if (type === ActionType.SHOT && spec === ShotSpecification.MADE) {
        const pts = action.points || 2;
        if (action.team === "MyTeam") myTeam += pts;
        else opponent += pts;
      }
      return { action, score: { myTeam, opponent } as Score };
    });
  }, [actions]);

  const availablePeriods = useMemo(() => {
    const seen = new Set<number>();
    sortedWithScores.forEach(({ action: a }) => { if (a.period_number) seen.add(a.period_number); });
    return Array.from(seen).sort((a, b) => a - b);
  }, [sortedWithScores]);

  // Build flat array of rows (actions + period end banners).
  // Uses sortedWithScores directly — score is already the running total at each action's
  // position in chronological order, so no Map lookup by action_order needed.
  const rows = useMemo<RowData[]>(() => {
    const filtered = selectedPeriod
      ? sortedWithScores.filter(({ action: a }) => a.period_number === selectedPeriod)
      : sortedWithScores;

    const groups = new Map<number, Array<{ action: any; score: Score }>>();
    filtered.forEach((item) => {
      const p = item.action.period_number || 0;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p)!.push(item);
    });

    const result: RowData[] = [];

    Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([periodNumber, items]) => {
        items.forEach(({ action, score }) => {
          const type = (action.action_type || action.type || "").toLowerCase();
          const spec = (action.specification || "").toLowerCase();
          const isScoring = type === ActionType.SHOT && spec === ShotSpecification.MADE;
          const num = action.player_number ?? action.player ?? 9999;
          const playerName =
            num === -1
              ? "Équipe"
              : num === 9999
              ? (match.opponent_name || "Adv.")
              : playerNamesMap.get(`${action.team}-${num}`) || `#${num}`;

          result.push({
            rowType: "action",
            action,
            playerNum: num,
            periodLabel: getPeriodLabel(periodNumber, totalPeriods),
            timeStr: formatTime(action.time_in_period ?? 0),
            description: getActionDesc(action),
            playerName,
            isMyTeam: action.team === "MyTeam",
            isScoring,
            actionColor: getActionColor(type, spec, action.points),
            score,
          });
        });

        // Period end score = score of the last action in this period
        const endScore = items[items.length - 1]?.score ?? { myTeam: 0, opponent: 0 };
        result.push({
          rowType: "period_end",
          periodNumber,
          periodLabel: getPeriodLabel(periodNumber, totalPeriods),
          score: endScore,
        });
      });

    return result;
  }, [sortedWithScores, selectedPeriod, totalPeriods, playerNamesMap, match]);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Sticky header ── */}
      <View style={[styles.stickyHeader, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        {/* Period filter chips */}
        <View style={styles.chipsRow}>
          {[null, ...availablePeriods].map((p) => {
            const active = selectedPeriod === p;
            const label = p === null ? "Tout" : getPeriodLabel(p, totalPeriods);
            return (
              <TouchableOpacity
                key={p ?? "all"}
                activeOpacity={0.7}
                onPress={() => setSelectedPeriod(p)}
                style={[styles.chip, {
                  backgroundColor: active ? colors.primary : surfaceColor,
                  borderColor,
                  paddingHorizontal: sp.sm,
                  paddingVertical: sp.xs,
                  borderRadius: sp.sm,
                }]}
              >
                <Text style={{ color: active ? colors.text.primary : textSecondary, fontSize: font.xs, fontWeight: "600" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Team names */}
        <View style={[styles.columnHeaders, { paddingHorizontal: sp.md }]}>
          <Text style={{ color: myTeamColor, flex: 1, textAlign: "right", fontSize: font.xs, fontWeight: "700" }} numberOfLines={1}>
            {match.my_team_name || "Mon équipe"}
          </Text>
          <View style={{ width: CENTER_COL_W }} />
          <Text style={{ color: opponentColor, flex: 1, textAlign: "left", fontSize: font.xs, fontWeight: "700" }} numberOfLines={1}>
            {match.opponent_name || "Adversaire"}
          </Text>
        </View>
      </View>

      {/* ── Scrollable timeline ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: sp.md, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty state */}
        {rows.length === 0 && (
          <Text style={{ color: textTertiary, textAlign: "center", marginTop: sp.xl, fontSize: font.sm }}>
            Aucune action enregistrée
          </Text>
        )}

        {rows.map((row, idx) => {
          // ── Period end banner ──
          if (row.rowType === "period_end") {
            return (
              <View key={`end_${row.periodNumber}`} style={{ marginVertical: 2 }}>
                <View style={styles.lineStub}>
                  <View style={{ flex: 1 }} />
                  <View style={{ width: CENTER_COL_W, alignItems: "center" }}>
                    <View style={{ width: 1, height: 8, backgroundColor: lineColor }} />
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
                <View style={styles.periodEndRow}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: borderColor }} />
                  <View style={[styles.periodEndBanner, { backgroundColor: periodEndBg }]}>
                    <Text style={styles.periodEndLabel}>FIN {row.periodLabel}</Text>
                    <View style={[styles.periodEndSep, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
                    <Text style={styles.periodEndScore}>{row.score.myTeam} – {row.score.opponent}</Text>
                  </View>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: borderColor }} />
                </View>
                <View style={styles.lineStub}>
                  <View style={{ flex: 1 }} />
                  <View style={{ width: CENTER_COL_W, alignItems: "center" }}>
                    <View style={{ width: 1, height: 8, backgroundColor: lineColor }} />
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
              </View>
            );
          }

          // ── Action row ──
          const { isMyTeam, isScoring, score, description, playerName, playerNum, periodLabel, timeStr, actionColor } = row;
          return (
            <View key={row.action.id || `r_${idx}`} style={styles.actionRow}>
              {/* ── Left (MyTeam) — card near center, connector toward outer edge ── */}
              <View style={[styles.teamSide, { justifyContent: "flex-end" }]}>
                {isMyTeam && (
                  <>
                    <View style={[styles.leftCard, { borderColor, borderLeftColor: myTeamColor }]}>
                      <PlayerBadge num={playerNum} teamAbbr={myTeamAbbr} textColor={textPrimary} borderColor={textTertiary} />
                      <View style={styles.cardTextRight}>
                        <Text style={[styles.playerName, { color: textPrimary, textAlign: "right" }]} numberOfLines={1}>
                          {playerName}
                        </Text>
                        <Text style={[styles.actionText, { color: actionColor, textAlign: "right" }]} numberOfLines={1}>
                          {description}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.connector, { backgroundColor: borderColor }]} />
                  </>
                )}
              </View>

              {/* ── Center: vertical line + time/score badge ── */}
              <View style={styles.centerCol}>
                <View style={[styles.verticalLine, { backgroundColor: lineColor }]} />
                <View style={[styles.timeBadge, { backgroundColor: bgColor, borderColor }]}>
                  <Text style={[styles.periodText, { color: textTertiary }]}>{periodLabel}</Text>
                  <Text style={[styles.timeText, { color: textSecondary }]}>{timeStr}</Text>
                  {isScoring && (
                    <Text style={[styles.scoreBadge, { color: textPrimary }]}>
                      {score.myTeam}–{score.opponent}
                    </Text>
                  )}
                </View>
              </View>

              {/* ── Right (Opponent) — card near center, connector toward outer edge ── */}
              <View style={[styles.teamSide, { justifyContent: "flex-start" }]}>
                {!isMyTeam && (
                  <>
                    <View style={[styles.connector, { backgroundColor: borderColor }]} />
                    <View style={[styles.rightCard, { borderColor, borderRightColor: opponentColor }]}>
                      <View style={styles.cardText}>
                        <Text style={[styles.playerName, { color: textPrimary }]} numberOfLines={1}>
                          {playerName}
                        </Text>
                        <Text style={[styles.actionText, { color: actionColor }]} numberOfLines={1}>
                          {description}
                        </Text>
                      </View>
                      <PlayerBadge num={playerNum} teamAbbr={opponentAbbr} textColor={textPrimary} borderColor={textTertiary} />
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Sticky header ──
  stickyHeader: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  chip: {
    borderWidth: 1,
  },
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
  },
  // ── Action row ──
  actionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 52,
    paddingVertical: 3,
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  leftCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 6,
  },
  rightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderRightWidth: 3,
    borderRadius: 6,
  },
  cardText: {
    flexShrink: 1,
    minWidth: 0,
  },
  cardTextRight: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
  },
  connector: {
    width: 25,
    height: 1,
  },
  playerName: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionText: {
    fontSize: 11,
  },
  // ── Center column ──
  centerCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    height: 80,
  },
  timeBadge: {
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  periodText: {
    fontSize: 9,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreBadge: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 1,
  },
  // ── Player badge ──
  playerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  playerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // ── Period end banner ──
  lineStub: {
    flexDirection: "row",
  },
  periodEndRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodEndBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 5,
    gap: 10,
  },
  periodEndLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  periodEndSep: {
    width: 1,
    height: 14,
  },
  periodEndScore: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
});
