import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, COMMON_COLORS, STATUS_COLORS, Spacing, Typography } from "../src/theme";
import { Player } from "../models/Player";
import { MatchActionGrid, ActionData } from "./MatchActionGrid";
import {
  MatchEvent,
  TeamId,
  FilterMode,
  TeamFilterMode,
} from "../constants/liveMatchConstants";
import { BREAKPOINTS } from "../constants/breakpoints";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
} from "../src/models/ActionTypes";

// History Modal
interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  events: MatchEvent[];
  onDeleteEvent: (id: string) => void;
  match: any;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  events,
  onDeleteEvent,
  match,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any | null>(null);

  // Helper function to format game time
  const formatGameTime = (periodNumber?: number, timeInPeriod?: number) => {
    if (periodNumber === undefined || timeInPeriod === undefined) {
      return "";
    }

    const minutes = Math.floor(timeInPeriod / 60);
    const seconds = timeInPeriod % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Determine period label
    const maxPeriods = match.periodCount || 4;
    let periodLabel = "";
    if (periodNumber <= maxPeriods) {
      periodLabel = maxPeriods === 2 ? `MT${periodNumber}` : `Q${periodNumber}`;
    } else {
      periodLabel = `OT${periodNumber - maxPeriods}`;
    }

    return `${periodLabel} ${timeStr}`;
  };

  // Handle delete action - show confirmation modal
  const handleDeleteAction = (event: any) => {
    setEventToDelete(event);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete action
  const confirmDeleteAction = () => {
    if (eventToDelete) {
      onDeleteEvent(eventToDelete.id);
    }
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  };

  // Cancel delete action
  const cancelDeleteAction = () => {
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  };

  // Get formatted event description for delete modal
  const getEventDescription = () => {
    if (!eventToDelete) return "";
    const timeStr = formatGameTime(
      eventToDelete.period_number,
      eventToDelete.time_in_period,
    );
    const teamStr =
      eventToDelete.teamId === TeamId.HOME
        ? match.myTeamName || "Nous"
        : match.opponent || "Adversaire";
    return `${eventToDelete.description}\n${timeStr} • ${teamStr}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.filterModalOverlay}>
        {/* Backdrop transparent */}
        <TouchableOpacity
          style={styles.filterBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet */}
        <View
          style={[
            styles.filterBottomSheet,
            {
              backgroundColor: surfaceColor,
              borderTopLeftRadius: sp.lg,
              borderTopRightRadius: sp.lg,
              padding: sp.md,
            },
          ]}
        >
          {/* Handle */}
          <View
            style={[
              styles.sheetHandle,
              {
                backgroundColor: colors.border,
                width: sizes.avatarSm,
                height: sp.xs,
                borderRadius: sp.xs,
                marginBottom: sp.md,
              },
            ]}
          />

          {/* Header */}
          <View style={[styles.filterSheetHeader, { marginBottom: sp.md }]}>
            <View style={[styles.filterHeaderLeft, { gap: sp.sm }]}>
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={sizes.iconMd}
                color={BRAND_COLORS[500]}
              />
              <Text
                style={[
                  styles.filterSheetTitle,
                  { color: textPrimary, fontSize: font.xl },
                ]}
              >
                Historique du match
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.filterCloseButton,
                {
                  backgroundColor: colors.surfaceVariant,
                  width: sizes.avatarSm,
                  height: sizes.avatarSm,
                  borderRadius: sizes.avatarSm / 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close"
                size={sizes.iconSm}
                color={textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.historyScroll}
            contentContainerStyle={styles.historyContent}
          >
            {events && events.length > 0 ? (
              events.map((evt) => (
                <View
                  key={evt.id}
                  style={[
                    styles.historyItem,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                      padding: sp.md,
                      borderRadius: sp.sm,
                      marginBottom: sp.sm,
                    },
                  ]}
                >
                  <View style={styles.historyItemLeft}>
                    <Text
                      style={[
                        styles.historyItemDescription,
                        { color: textPrimary, fontSize: font.md },
                      ]}
                    >
                      {evt.description}
                    </Text>
                    <Text
                      style={[styles.historyItemMeta, { color: textSecondary }]}
                    >
                      {formatGameTime(evt.period_number, evt.time_in_period)} •{" "}
                      {evt.teamId === TeamId.HOME
                        ? match.myTeamName || "Nous"
                        : match.opponent || "Adversaire"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteAction(evt)}
                    style={styles.historyDeleteButton}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={18}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.historyEmpty}>
                <Text
                  style={[styles.historyEmptyText, { color: textSecondary }]}
                >
                  Aucun événement enregistré.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Delete Confirmation Modal - Using DeleteActionModal for consistency */}
      <DeleteActionModal
        visible={showDeleteConfirmation}
        onClose={cancelDeleteAction}
        onConfirm={confirmDeleteAction}
        eventDescription={getEventDescription()}
      />
    </Modal>
  );
};

// Filter Modal
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  // Optional props for player filtering
  homeRoster?: Player[];
  opponentRoster?: Player[];
  trackOpponentStats?: boolean;
  selectedPlayers?: string[];
  onPlayerSelectionChange?: (playerIds: string[]) => void;
  // Period filtering
  matchFormat?: "2_halves" | "4_quarters";
  actions?: ActionData[];
  selectedPeriods?: number[];
  onPeriodSelectionChange?: (periods: number[]) => void;
  // Match location for team filtering
  isHome?: boolean;
  // Team names for filter labels
  myTeamName?: string;
  opponentName?: string;
  // Team filter
  selectedTeamFilter?: TeamFilterMode;
  onTeamFilterChange?: (filter: TeamFilterMode) => void;
}

interface FilteredSummary {
  pts: number;
  reb: number;
  rebOff: number;
  rebDef: number;
  ast: number;
  stl: number;
  blk: number;
  pf: number;
  fd: number; // Fouls drawn
  to: number;
  fgm: number;
  fga: number;
  fgPct: number;
  // Free throws
  ftm: number;
  fta: number;
  ftPct: number;
  // Two-pointers
  twoM: number;
  twoA: number;
  twoPct: number;
  // Three-pointers
  threeM: number;
  threeA: number;
  threePct: number;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filterMode,
  setFilterMode,
  homeRoster = [],
  opponentRoster = [],
  trackOpponentStats = false,
  selectedPlayers = [],
  onPlayerSelectionChange,
  matchFormat = "4_quarters",
  actions = [],
  selectedPeriods = [],
  onPeriodSelectionChange,
  isHome = true,
  myTeamName,
  opponentName,
  selectedTeamFilter = TeamFilterMode.ALL,
  onTeamFilterChange,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;
  const bgColor = colors.surfaceVariant;

  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;

  // Use controlled team filter from parent
  const teamFilter = selectedTeamFilter;

  // Clear player selection when team filter changes
  React.useEffect(() => {
    if (!onPlayerSelectionChange) return;

    // Get IDs of home and opponent players
    const homePlayerIds = homeRoster.map((p) => p.id);
    const opponentPlayerIds = opponentRoster.map((p) => p.id);

    // Filter out players based on team selection
    if (teamFilter === TeamFilterMode.US) {
      // Remove opponent players from selection
      const filteredSelection = selectedPlayers.filter((id) =>
        homePlayerIds.includes(id),
      );
      if (filteredSelection.length !== selectedPlayers.length) {
        onPlayerSelectionChange(filteredSelection);
      }
    } else if (teamFilter === TeamFilterMode.THEM) {
      // Remove home players from selection
      const filteredSelection = selectedPlayers.filter((id) =>
        opponentPlayerIds.includes(id),
      );
      if (filteredSelection.length !== selectedPlayers.length) {
        onPlayerSelectionChange(filteredSelection);
      }
    }
    // If TeamFilterMode.ALL, keep all selections
  }, [
    teamFilter,
    homeRoster,
    opponentRoster,
    selectedPlayers,
    onPlayerSelectionChange,
  ]);

  // Find all periods including regular periods and any overtime periods that have been played
  const availablePeriods = React.useMemo(() => {
    // Start with regular periods (always show them)
    const regularPeriods = Array.from(
      { length: totalPeriods },
      (_, i) => i + 1,
    );

    // Find any overtime periods in actions
    const overtimePeriods: number[] = [];
    if (actions && actions.length > 0) {
      actions.forEach((action: any) => {
        if (action.period_number && action.period_number > totalPeriods) {
          if (!overtimePeriods.includes(action.period_number)) {
            overtimePeriods.push(action.period_number);
          }
        }
      });
    }

    return [...regularPeriods, ...overtimePeriods.sort((a, b) => a - b)];
  }, [actions, totalPeriods]);

  // Generate period labels
  const getPeriodLabel = (periodNumber: number) => {
    if (periodNumber > totalPeriods) {
      const otNumber = periodNumber - totalPeriods;
      return `OT${otNumber}`;
    }
    if (matchFormat === "2_halves") {
      return `MT${periodNumber}`;
    } else {
      return `QT${periodNumber}`;
    }
  };

  const togglePlayer = (playerId: string) => {
    if (!onPlayerSelectionChange) return;

    const newSelection = selectedPlayers.includes(playerId)
      ? selectedPlayers.filter((id) => id !== playerId)
      : [...selectedPlayers, playerId];

    onPlayerSelectionChange(newSelection);
  };

  const clearPlayerSelection = () => {
    if (onPlayerSelectionChange) {
      onPlayerSelectionChange([]);
    }
  };

  const togglePeriod = (period: number) => {
    if (!onPeriodSelectionChange) return;

    const newSelection = selectedPeriods.includes(period)
      ? selectedPeriods.filter((p) => p !== period)
      : [...selectedPeriods, period];

    onPeriodSelectionChange(newSelection);
  };

  const selectAllPeriods = () => {
    if (onPeriodSelectionChange) {
      onPeriodSelectionChange(availablePeriods);
    }
  };

  const clearPeriodSelection = () => {
    if (onPeriodSelectionChange) {
      onPeriodSelectionChange([]);
    }
  };

  // Calculate filtered summary
  const calculateFilteredSummary = (): FilteredSummary | null => {
    if (!actions || actions.length === 0) return null;

    // Always show summary (no need to check for active filters)
    // Filter actions based on current filter settings
    const filteredActions = actions.filter((action: any) => {
      // Filter by team
      if (trackOpponentStats) {
        // If tracking opponent stats, filter by selected team
        if (teamFilter === TeamFilterMode.US) {
          // Show only our team's actions
          // Our team has teamId matching match location (HOME if isHome, AWAY if not)
          const ourTeamId = isHome ? TeamId.HOME : TeamId.AWAY;
          if (action.teamId !== ourTeamId) return false;
        } else if (teamFilter === TeamFilterMode.THEM) {
          // Show only opponent's actions
          const theirTeamId = isHome ? TeamId.AWAY : TeamId.HOME;
          if (action.teamId !== theirTeamId) return false;
        }
        // If TeamFilterMode.ALL, show both teams
      } else {
        // If NOT tracking opponent stats, only show our team's actions
        const ourTeamId = isHome ? TeamId.HOME : TeamId.AWAY;
        if (action.teamId !== ourTeamId) return false;
      }

      // Filter by action type (filterMode)
      if (filterMode !== FilterMode.ALL) {
        switch (filterMode) {
          case FilterMode.SHOOTING:
            if (action.action_type !== ActionType.SHOT) return false;
            break;
          case FilterMode.REBOUNDS:
            if (action.action_type !== ActionType.REBOUND) return false;
            break;
          case FilterMode.ASSISTS:
            if (action.action_type !== ActionType.ASSIST) return false;
            break;
          case FilterMode.FOULS:
            if (action.action_type !== ActionType.FOUL) return false;
            break;
          case FilterMode.FOULS_DRAWN:
            if (action.action_type !== ActionType.FOUL_DRAWN) return false;
            break;
          case FilterMode.TURNOVERS:
            if (action.action_type !== ActionType.TURNOVER) return false;
            break;
          case FilterMode.BLOCKS:
            if (action.action_type !== ActionType.BLOCK) return false;
            break;
          case FilterMode.STEALS:
            if (action.action_type !== ActionType.STEAL) return false;
            break;
        }
      }

      // Filter by player
      if (selectedPlayers && selectedPlayers.length > 0) {
        if (!action.playerId || !selectedPlayers.includes(action.playerId)) {
          return false;
        }
      }

      // Filter by period
      if (selectedPeriods && selectedPeriods.length > 0) {
        if (
          !action.period_number ||
          !selectedPeriods.includes(action.period_number)
        ) {
          return false;
        }
      }

      return true;
    });

    // Calculate stats from filtered actions
    const summary: FilteredSummary = {
      pts: 0,
      reb: 0,
      rebOff: 0,
      rebDef: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      pf: 0,
      fd: 0,
      to: 0,
      fgm: 0,
      fga: 0,
      fgPct: 0,
      ftm: 0,
      fta: 0,
      ftPct: 0,
      twoM: 0,
      twoA: 0,
      twoPct: 0,
      threeM: 0,
      threeA: 0,
      threePct: 0,
    };

    filteredActions.forEach((action: any) => {
      switch (action.action_type) {
        case ActionType.SHOT:
          summary.fga += 1;
          const isMade = action.specification === ShotSpecification.MADE;
          const points = action.points || 0;

          // Track by shot type
          if (points === 1) {
            // Free throw
            summary.fta += 1;
            if (isMade) {
              summary.ftm += 1;
              summary.pts += 1;
            }
          } else if (points === 2) {
            // Two-pointer
            summary.twoA += 1;
            if (isMade) {
              summary.twoM += 1;
              summary.pts += 2;
              summary.fgm += 1;
            }
          } else if (points === 3) {
            // Three-pointer
            summary.threeA += 1;
            if (isMade) {
              summary.threeM += 1;
              summary.pts += 3;
              summary.fgm += 1;
            }
          }
          break;
        case ActionType.REBOUND:
          summary.reb += 1;
          if (action.specification === ReboundSpecification.OFFENSIVE) {
            summary.rebOff += 1;
          } else if (action.specification === ReboundSpecification.DEFENSIVE) {
            summary.rebDef += 1;
          }
          break;
        case ActionType.ASSIST:
          summary.ast += 1;
          break;
        case ActionType.STEAL:
          summary.stl += 1;
          break;
        case ActionType.BLOCK:
          summary.blk += 1;
          break;
        case ActionType.FOUL:
          summary.pf += 1;
          break;
        case ActionType.FOUL_DRAWN:
          summary.fd += 1;
          break;
        case ActionType.TURNOVER:
          summary.to += 1;
          break;
      }
    });

    // Calculate field goal percentage (excluding free throws)
    const fieldGoalAttempts = summary.twoA + summary.threeA;
    summary.fga = fieldGoalAttempts;
    summary.fgPct =
      fieldGoalAttempts > 0
        ? Math.round((summary.fgm / fieldGoalAttempts) * 100)
        : 0;

    // Calculate free throw percentage
    summary.ftPct =
      summary.fta > 0 ? Math.round((summary.ftm / summary.fta) * 100) : 0;

    // Calculate two-point percentage
    summary.twoPct =
      summary.twoA > 0 ? Math.round((summary.twoM / summary.twoA) * 100) : 0;

    // Calculate three-point percentage
    summary.threePct =
      summary.threeA > 0
        ? Math.round((summary.threeM / summary.threeA) * 100)
        : 0;

    return summary;
  };

  const filteredSummary = calculateFilteredSummary();

  const renderPlayerButton = (player: Player) => {
    const isSelected = selectedPlayers.includes(player.id);
    return (
      <TouchableOpacity
        key={player.id}
        onPress={() => togglePlayer(player.id)}
        style={[
          styles.playerFilterButton,
          {
            backgroundColor: isSelected
              ? colors.primary
              : colors.surfaceVariant,
            borderColor: isSelected ? colors.borderFocus : borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.playerFilterBadge,
            {
              backgroundColor: isSelected ? colors.onPrimary : colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.playerFilterBadgeText,
              {
                color: isSelected ? colors.primary : textSecondary,
                fontSize: font.sm,
              },
            ]}
          >
            {player.jerseyNumber}
          </Text>
        </View>
        <Text
          style={[
            styles.playerFilterName,
            {
              color: isSelected ? colors.onPrimary : textPrimary,
              fontSize: font.xs,
            },
          ]}
          numberOfLines={1}
        >
          {player.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.filterModalOverlay}>
        {/* Backdrop transparent */}
        <TouchableOpacity
          style={styles.filterBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet */}
        <View
          style={[
            styles.filterBottomSheet,
            {
              backgroundColor: surfaceColor,
              borderTopLeftRadius: sp.lg,
              borderTopRightRadius: sp.lg,
              padding: sp.md,
            },
          ]}
        >
          {/* Handle */}
          <View
            style={[
              styles.sheetHandle,
              {
                backgroundColor: colors.border,
                width: sizes.avatarSm,
                height: sp.xs,
                borderRadius: sp.xs,
                marginBottom: sp.md,
              },
            ]}
          />

          {/* Header */}
          <View style={styles.filterSheetHeader}>
            <View style={styles.filterHeaderLeft}>
              <MaterialCommunityIcons
                name="filter"
                size={24}
                color={BRAND_COLORS[500]}
              />
              <Text style={[styles.filterSheetTitle, { color: textPrimary }]}>
                Filtres
              </Text>
            </View>
            <View style={styles.filterHeaderRight}>
              <TouchableOpacity
                onPress={() => {
                  setFilterMode(FilterMode.ALL);
                  if (onTeamFilterChange) {
                    onTeamFilterChange(TeamFilterMode.ALL);
                  }
                  if (onPlayerSelectionChange) {
                    onPlayerSelectionChange([]);
                  }
                  if (onPeriodSelectionChange) {
                    onPeriodSelectionChange([]);
                  }
                }}
                style={styles.resetButton}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={14}
                  color={BRAND_COLORS[500]}
                />
                <Text
                  style={[styles.resetButtonText, { color: BRAND_COLORS[500] }]}
                >
                  Réinitialiser
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.filterCloseButton,
                  {
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Options */}
          <ScrollView
            style={styles.filterSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Type d'action */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Text
                  style={[styles.filterSectionLabel, { color: textSecondary }]}
                >
                  TYPE D'ACTION
                </Text>
              </View>

              <View style={styles.filterButtonsGrid}>
                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.ALL)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.ALL
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.ALL
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.ALL
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Tout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.SHOOTING)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.SHOOTING
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.SHOOTING
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.SHOOTING
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Tirs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.REBOUNDS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.REBOUNDS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.REBOUNDS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.REBOUNDS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Rebonds
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.ASSISTS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.ASSISTS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.ASSISTS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.ASSISTS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Passes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.FOULS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.FOULS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.FOULS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.FOULS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Fautes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.FOULS_DRAWN)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.FOULS_DRAWN
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.FOULS_DRAWN
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.FOULS_DRAWN
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Fautes provoquées
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.TURNOVERS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.TURNOVERS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.TURNOVERS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.TURNOVERS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Pertes de balle
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.BLOCKS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.BLOCKS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.BLOCKS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.BLOCKS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Contres
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode(FilterMode.STEALS)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === FilterMode.STEALS
                          ? colors.primary
                          : colors.surfaceVariant,
                      borderColor:
                        filterMode === FilterMode.STEALS
                          ? colors.borderFocus
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === FilterMode.STEALS
                            ? colors.onPrimary
                            : textPrimary,
                      },
                    ]}
                  >
                    Interceptions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Team filter section - only show if tracking opponent stats */}
            {trackOpponentStats && (
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text
                    style={[
                      styles.filterSectionLabel,
                      { color: textSecondary },
                    ]}
                  >
                    ÉQUIPE
                  </Text>
                </View>

                <View style={styles.filterButtonsGrid}>
                  <TouchableOpacity
                    onPress={() =>
                      onTeamFilterChange &&
                      onTeamFilterChange(TeamFilterMode.ALL)
                    }
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          teamFilter === TeamFilterMode.ALL
                            ? colors.primary
                            : colors.surfaceVariant,
                        borderColor:
                          teamFilter === TeamFilterMode.ALL
                            ? colors.borderFocus
                            : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            teamFilter === TeamFilterMode.ALL
                              ? colors.onPrimary
                              : textPrimary,
                        },
                      ]}
                    >
                      Tout
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      onTeamFilterChange &&
                      onTeamFilterChange(TeamFilterMode.US)
                    }
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          teamFilter === TeamFilterMode.US
                            ? colors.primary
                            : colors.surfaceVariant,
                        borderColor:
                          teamFilter === TeamFilterMode.US
                            ? colors.borderFocus
                            : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            teamFilter === TeamFilterMode.US
                              ? colors.onPrimary
                              : textPrimary,
                        },
                      ]}
                    >
                      {myTeamName || "Nous"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      onTeamFilterChange &&
                      onTeamFilterChange(TeamFilterMode.THEM)
                    }
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          teamFilter === TeamFilterMode.THEM
                            ? colors.primary
                            : colors.surfaceVariant,
                        borderColor:
                          teamFilter === TeamFilterMode.THEM
                            ? colors.borderFocus
                            : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            teamFilter === TeamFilterMode.THEM
                              ? colors.onPrimary
                              : textPrimary,
                        },
                      ]}
                    >
                      {opponentName || "Eux"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Period filter section */}
            {onPeriodSelectionChange && availablePeriods.length > 0 && (
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text
                    style={[
                      styles.filterSectionLabel,
                      { color: textSecondary },
                    ]}
                  >
                    PÉRIODE
                  </Text>
                </View>

                <View style={styles.filterButtonsGrid}>
                  <TouchableOpacity
                    onPress={clearPeriodSelection}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          selectedPeriods.length === 0
                            ? colors.primary
                            : colors.surfaceVariant,
                        borderColor:
                          selectedPeriods.length === 0
                            ? colors.borderFocus
                            : borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            selectedPeriods.length === 0
                              ? colors.onPrimary
                              : textPrimary,
                        },
                      ]}
                    >
                      Tout
                    </Text>
                  </TouchableOpacity>

                  {availablePeriods.map((period) => {
                    const isSelected = selectedPeriods.includes(period);
                    return (
                      <TouchableOpacity
                        key={period}
                        onPress={() => togglePeriod(period)}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surfaceVariant,
                            borderColor: isSelected
                              ? colors.borderFocus
                              : borderColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              color: isSelected
                                ? COMMON_COLORS.white
                                : textPrimary,
                            },
                          ]}
                        >
                          {getPeriodLabel(period)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Player filter section */}
            {onPlayerSelectionChange && homeRoster.length > 0 && (
              <>
                {/* Home Team - only show if teamFilter is ALL or US */}
                {(teamFilter === TeamFilterMode.ALL ||
                  teamFilter === TeamFilterMode.US) && (
                  <View style={styles.filterSection}>
                    <View style={styles.filterSectionHeader}>
                      <Text
                        style={[
                          styles.filterSectionLabel,
                          { color: textSecondary },
                        ]}
                      >
                        JOUEURS
                      </Text>
                    </View>

                    <View style={styles.playerFilterGrid}>
                      {homeRoster.map(renderPlayerButton)}
                    </View>
                  </View>
                )}

                {/* Opponent Team - only show if trackOpponentStats and teamFilter is ALL or THEM */}
                {trackOpponentStats &&
                  opponentRoster.length > 0 &&
                  (teamFilter === TeamFilterMode.ALL ||
                    teamFilter === TeamFilterMode.THEM) && (
                    <View style={styles.filterSection}>
                      <Text
                        style={[
                          styles.filterSectionLabel,
                          { color: textSecondary },
                        ]}
                      >
                        ADVERSAIRE
                      </Text>

                      <View style={styles.playerFilterGrid}>
                        {opponentRoster.map(renderPlayerButton)}
                      </View>
                    </View>
                  )}
              </>
            )}

            {/* Filtered Summary */}
            {filteredSummary && (
              <View
                style={[
                  styles.filterSummary,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.filterSummaryHeader}>
                  <MaterialCommunityIcons
                    name="trending-up"
                    size={14}
                    color={BRAND_COLORS[500]}
                  />
                  <Text
                    style={[
                      styles.filterSummaryTitle,
                      { color: textSecondary },
                    ]}
                  >
                    RÉSUMÉ DE LA SÉLECTION
                  </Text>
                </View>

                {/* Row 1: Points and Shooting */}
                <View style={styles.filterSummaryRow}>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.pts}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Points
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <View style={styles.filterSummaryValueRow}>
                      <Text
                        style={[
                          styles.filterSummaryValue,
                          { color: textPrimary },
                        ]}
                      >
                        {filteredSummary.ftm}/{filteredSummary.fta}
                      </Text>
                      <Text
                        style={[
                          styles.filterSummaryPercentage,
                          { color: textSecondary },
                        ]}
                      >
                        {filteredSummary.ftPct}%
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      LF
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <View style={styles.filterSummaryValueRow}>
                      <Text
                        style={[
                          styles.filterSummaryValue,
                          { color: textPrimary },
                        ]}
                      >
                        {filteredSummary.twoM}/{filteredSummary.twoA}
                      </Text>
                      <Text
                        style={[
                          styles.filterSummaryPercentage,
                          { color: textSecondary },
                        ]}
                      >
                        {filteredSummary.twoPct}%
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      2pts
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <View style={styles.filterSummaryValueRow}>
                      <Text
                        style={[
                          styles.filterSummaryValue,
                          { color: textPrimary },
                        ]}
                      >
                        {filteredSummary.threeM}/{filteredSummary.threeA}
                      </Text>
                      <Text
                        style={[
                          styles.filterSummaryPercentage,
                          { color: textSecondary },
                        ]}
                      >
                        {filteredSummary.threePct}%
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      3pts
                    </Text>
                  </View>
                </View>

                {/* Row 2: Rebounds and Assists */}
                <View style={[styles.filterSummaryRow, { marginTop: 12 }]}>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.reb}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Rebonds
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.rebOff}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Reb. Off.
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.rebDef}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Reb. Def.
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.ast}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Passes
                    </Text>
                  </View>
                </View>

                {/* Row 3: Other stats */}
                <View style={[styles.filterSummaryRow, { marginTop: 12 }]}>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.stl}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Interceptions
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.blk}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Contres
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.pf}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Fautes
                    </Text>
                  </View>
                  <View style={styles.filterSummaryItemFlex}>
                    <Text
                      style={[
                        styles.filterSummaryValue,
                        { color: textPrimary },
                      ]}
                    >
                      {filteredSummary.to}
                    </Text>
                    <Text
                      style={[
                        styles.filterSummaryLabel,
                        { color: textSecondary },
                      ]}
                    >
                      Pertes
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Player Selection Modal
interface PlayerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onPlayerSelect: (playerId: string) => void;
  pendingEvent: any;
  match: any;
  playersOnCourt: Player[];
  opponentPlayersOnCourt: Player[];
  playerSelectionTab: TeamId;
  setPlayerSelectionTab: (tab: TeamId) => void;
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  visible,
  onClose,
  onPlayerSelect,
  pendingEvent,
  match,
  playersOnCourt,
  opponentPlayersOnCourt,
  playerSelectionTab,
  setPlayerSelectionTab,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.playerModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <View style={styles.playerModalHeader}>
            <View>
              <Text style={[styles.playerModalTitle, { color: textPrimary }]}>
                QUI ?
              </Text>
              <Text
                style={[styles.playerModalSubtitle, { color: colors.primary }]}
              >
                {pendingEvent?.type
                  ? `Validation : ${pendingEvent.type.replace("_", " ")}`
                  : "Sélectionnez le joueur"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.playerModalClose,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={textSecondary}
              />
            </TouchableOpacity>
          </View>

          {match.trackOpponentStats && (
            <View
              style={[
                styles.playerTabs,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setPlayerSelectionTab(TeamId.HOME)}
                style={[
                  styles.playerTab,
                  {
                    backgroundColor:
                      playerSelectionTab === TeamId.HOME
                        ? colors.primary
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerTabText,
                    {
                      color:
                        playerSelectionTab === TeamId.HOME
                          ? colors.onPrimary
                          : textSecondary,
                    },
                  ]}
                >
                  {String(match?.myTeamName || "NOUS").toUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPlayerSelectionTab(TeamId.AWAY)}
                style={[
                  styles.playerTab,
                  {
                    backgroundColor:
                      playerSelectionTab === TeamId.AWAY
                        ? "#ef4444"
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerTabText,
                    {
                      color:
                        playerSelectionTab === TeamId.AWAY
                          ? colors.onPrimary
                          : textSecondary,
                    },
                  ]}
                >
                  {String(match?.opponent || "EUX").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.playerGrid}>
            {(match.trackOpponentStats && playerSelectionTab === TeamId.AWAY
              ? opponentPlayersOnCourt
              : playersOnCourt
            )
              .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
              .map((player: Player) => (
                <TouchableOpacity
                  key={player.id}
                  onPress={() => onPlayerSelect(player.id)}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                      width: isCompact ? "25%" : "30%",
                      padding: isCompact ? sp.sm : sp.md,
                      borderRadius: isCompact ? sp.sm : sp.md,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.playerCardNumber,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          match.trackOpponentStats &&
                          playerSelectionTab === TeamId.AWAY
                            ? "#ef4444"
                            : colors.text.primary,
                        width: isCompact ? sizes.avatarSm : sizes.avatarSm,
                        height: isCompact ? sizes.avatarSm : sizes.avatarSm,
                        borderRadius: isCompact
                          ? sizes.avatarSm / 2
                          : sizes.avatarMd / 2,
                        marginBottom: sp.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.playerCardNumberText,
                        {
                          color:
                            match.trackOpponentStats &&
                            playerSelectionTab === TeamId.AWAY
                              ? "#ef4444"
                              : colors.text.primary,
                          fontSize: isCompact ? font.md : font.lg,
                        },
                      ]}
                    >
                      {String(player.jerseyNumber)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.playerCardName,
                      {
                        color: colors.text.primary,
                        fontSize: isCompact ? font.xs : font.sm,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {player.name || ""}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Court Action Modal
interface CourtActionModalProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (actionData: ActionData) => void;
}

export const CourtActionModal: React.FC<CourtActionModalProps> = ({
  visible,
  onClose,
  onActionSelect,
}) => {
  const { colors } = useTheme();
  const { sp: spResponsive, font: fontResponsive, sizes, isPortrait, width } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  // Detect mobile landscape mode (not tablet)
  const isMobileLandscape = !isPortrait && width < BREAKPOINTS.mobileLandscapeMaxWidth;

  // Use normal (non-compact) values for tablets, compact values for mobile landscape
  const sp = isMobileLandscape ? spResponsive : {
    xs: Spacing.xs,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
    xl: Spacing.xl,
    xxl: Spacing.xxl,
  };

  const font = isMobileLandscape ? fontResponsive : {
    xxs: Typography.fontSize.xs,
    xs: Typography.fontSize.xs,
    sm: Typography.fontSize.sm,
    md: Typography.fontSize.md,
    lg: Typography.fontSize.lg,
    xl: Typography.fontSize.xl,
    xxl: Typography.fontSize.xxl,
    xxxl: Typography.fontSize.xxxl,
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.courtActionModal,
            {
              backgroundColor: surfaceColor,
              borderColor,
              maxWidth: isMobileLandscape ? 450 : 400,
              maxHeight: isMobileLandscape ? "100%" : "90%",
              padding: isMobileLandscape ? sp.md : sp.md,
              borderRadius: sp.md,
            },
          ]}
        >
          <View
            style={[
              styles.courtActionHeader,
              { marginBottom: isMobileLandscape ? sp.xs : sp.md },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.courtActionTitle,
                  {
                    color: textPrimary,
                    fontSize: isMobileLandscape ? font.lg : font.xl,
                  },
                ]}
              >
                ACTION
              </Text>
              <Text
                style={[
                  styles.courtActionSubtitle,
                  {
                    color: textSecondary,
                    fontSize: isMobileLandscape ? font.xs : font.sm,
                  },
                ]}
              >
                Que s'est-il passé ici ?
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.courtActionClose,
                {
                  backgroundColor: colors.surfaceVariant,
                  width: sizes.avatarSm,
                  height: sizes.avatarSm,
                  borderRadius: sizes.avatarSm / 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={sizes.iconMd}
                color={textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <MatchActionGrid onAction={onActionSelect} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Substitution Modal
interface SubstitutionModalProps {
  visible: boolean;
  onClose: () => void;
  onCommit: () => void;
  subSelection: { out: string[]; in: string[] };
  toggleSubOut: (id: string) => void;
  toggleSubIn: (id: string) => void;
  getSubModalPlayers: () => { onCourt: Player[]; onBench: Player[] };
  match: any;
  subTeamTab: TeamId;
  setSubTeamTab: (tab: TeamId) => void;
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  visible,
  onClose,
  onCommit,
  subSelection,
  toggleSubOut,
  toggleSubIn,
  getSubModalPlayers,
  match,
  subTeamTab,
  setSubTeamTab,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const { onCourt, onBench } = getSubModalPlayers();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.subModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <View style={styles.subHeader}>
            <View style={styles.subHeaderLeft}>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={20}
                color={BRAND_COLORS[500]}
              />
              <View>
                <Text style={[styles.subTitle, { color: textPrimary }]}>
                  Changements
                </Text>
                <Text style={[styles.subSubtitle, { color: textSecondary }]}>
                  Sélectionnez les sortants et les entrants
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.subClose,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={textSecondary}
              />
            </TouchableOpacity>
          </View>

          {match.trackOpponentStats && (
            <View
              style={[
                styles.subTabs,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setSubTeamTab(TeamId.HOME)}
                style={[
                  styles.subTab,
                  {
                    backgroundColor:
                      subTeamTab === TeamId.HOME
                        ? colors.primary
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color:
                        subTeamTab === TeamId.HOME
                          ? colors.onPrimary
                          : textSecondary,
                    },
                  ]}
                >
                  {String(match.myTeamName || "NOUS").toUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSubTeamTab(TeamId.AWAY)}
                style={[
                  styles.subTab,
                  {
                    backgroundColor:
                      subTeamTab === TeamId.AWAY ? "#ef4444" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color:
                        subTeamTab === TeamId.AWAY
                          ? colors.onPrimary
                          : textSecondary,
                    },
                  ]}
                >
                  {String(match.opponent || "EUX").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.subContent} contentContainerStyle={{ flexGrow: 1 }}>
            {/* On Court */}
            <View
              style={[
                styles.subSection,
                {
                  backgroundColor: colors.surface,
                  borderColor,
                },
              ]}
            >
              <View style={styles.subSectionHeader}>
                <Text style={[styles.subSectionTitle, { color: textPrimary }]}>
                  SUR LE TERRAIN ({onCourt.length})
                </Text>
                <Text style={[styles.subSectionHint, { color: textSecondary }]}>
                  Appuyez pour sortir
                </Text>
              </View>
              <View style={styles.subGrid}>
                {onCourt
                  .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                  .map((player: Player) => {
                    const isOut = subSelection.out.includes(player.id);
                    return (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => toggleSubOut(player.id)}
                        style={[
                          styles.subPlayerCard,
                          {
                            backgroundColor: isOut
                              ? colors.error + "20"
                              : colors.background,
                            borderColor: isOut ? "#ef4444" : "transparent",
                            borderWidth: isOut ? 2 : 1,
                            padding: isCompact ? sp.xs : sp.sm,
                            borderRadius: isCompact ? sp.xs : sp.sm,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.subPlayerNumber,
                            {
                              backgroundColor: isOut
                                ? "#ef4444"
                                : colors.surfaceVariant,
                              width: isCompact
                                ? sizes.avatarXs
                                : sizes.avatarSm,
                              height: isCompact
                                ? sizes.avatarXs
                                : sizes.avatarSm,
                              borderRadius: isCompact
                                ? sizes.avatarXs / 2
                                : sizes.avatarSm / 2,
                              marginBottom: sp.xs,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.subPlayerNumberText,
                              {
                                color: isOut
                                  ? colors.onPrimary
                                  : colors.text.primary,
                                fontSize: isCompact ? font.xs : font.sm,
                              },
                            ]}
                          >
                            {player.jerseyNumber}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.subPlayerName,
                            {
                              color: colors.text.primary,
                              fontSize: isCompact ? font.xxs : font.xs,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {player.name}
                        </Text>
                        {isOut && (
                          <View style={styles.subPlayerBadge}>
                            <MaterialCommunityIcons
                              name="arrow-right"
                              size={10}
                              color={colors.onPrimary}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>

            {/* Bench */}
            <View
              style={[
                styles.subSection,
                {
                  backgroundColor: colors.surface,
                  borderColor,
                },
              ]}
            >
              <View style={styles.subSectionHeader}>
                <Text style={[styles.subSectionTitle, { color: textPrimary }]}>
                  BANC ({onBench.length})
                </Text>
                <Text style={[styles.subSectionHint, { color: textSecondary }]}>
                  Appuyez pour entrer
                </Text>
              </View>
              <View style={styles.subGrid}>
                {onBench
                  .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                  .map((player: Player) => {
                    const isIn = subSelection.in.includes(player.id);
                    return (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => toggleSubIn(player.id)}
                        style={[
                          styles.subPlayerCard,
                          {
                            backgroundColor: isIn
                              ? colors.success + "20"
                              : colors.background,
                            borderColor: isIn
                              ? STATUS_COLORS.success
                              : "transparent",
                            borderWidth: isIn ? 2 : 1,
                            padding: isCompact ? sp.xs : sp.sm,
                            borderRadius: isCompact ? sp.xs : sp.sm,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.subPlayerNumber,
                            {
                              backgroundColor: isIn
                                ? STATUS_COLORS.success
                                : colors.surfaceVariant,
                              width: isCompact
                                ? sizes.avatarXs
                                : sizes.avatarSm,
                              height: isCompact
                                ? sizes.avatarXs
                                : sizes.avatarSm,
                              borderRadius: isCompact
                                ? sizes.avatarXs / 2
                                : sizes.avatarSm / 2,
                              marginBottom: sp.xs,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.subPlayerNumberText,
                              {
                                color: isIn ? colors.onPrimary : textSecondary,
                                fontSize: isCompact ? font.xs : font.sm,
                              },
                            ]}
                          >
                            {player.jerseyNumber}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.subPlayerName,
                            {
                              color: textSecondary,
                              fontSize: isCompact ? font.xxs : font.xs,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {player.name}
                        </Text>
                        {isIn && (
                          <View
                            style={[
                              styles.subPlayerBadge,
                              { backgroundColor: STATUS_COLORS.success },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="arrow-right"
                              size={10}
                              color={colors.onPrimary}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.subFooter,
              {
                borderTopColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onCommit}
              disabled={
                subSelection.in.length !== subSelection.out.length ||
                subSelection.in.length === 0
              }
              style={[
                styles.subCommitButton,
                {
                  backgroundColor:
                    subSelection.in.length !== subSelection.out.length ||
                    subSelection.in.length === 0
                      ? colors.surfaceVariant
                      : colors.primary,
                  opacity:
                    subSelection.in.length !== subSelection.out.length ||
                    subSelection.in.length === 0
                      ? 0.5
                      : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={20}
                color={colors.onPrimary}
              />
              <Text
                style={[
                  styles.subCommitButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                {subSelection.in.length > 0 &&
                subSelection.in.length !== subSelection.out.length
                  ? `Sélectionnez ${Math.abs(
                      subSelection.in.length - subSelection.out.length,
                    )} autre(s)`
                  : "Valider les changements"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// End Match Modal
interface EndMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EndMatchModal: React.FC<EndMatchModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.endMatchModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <View style={[styles.endMatchIcon, { backgroundColor: "#fee2e2" }]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={32}
              color="#ef4444"
            />
          </View>

          <Text style={[styles.endMatchTitle, { color: textPrimary }]}>
            Terminer le match ?
          </Text>

          <Text style={[styles.endMatchDescription, { color: textSecondary }]}>
            Le match sera archivé et vous ne pourrez plus modifier les
            statistiques.
          </Text>

          <View style={styles.endMatchActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.endMatchCancelButton,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.endMatchCancelButtonText,
                  { color: textPrimary },
                ]}
              >
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.endMatchConfirmButton,
                { backgroundColor: "#ef4444" },
              ]}
            >
              <Text
                style={[
                  styles.endMatchConfirmButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                Terminer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Overtime Modal
interface OvertimeModalProps {
  visible: boolean;
  onClose: () => void;
  onStartOvertime: () => void;
  onEndMatch: () => void;
  match: any;
  quarter: number;
  maxPeriods: number;
  overtimeDuration: number;
  setOvertimeDuration: (value: number) => void;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = ({
  visible,
  onClose,
  onStartOvertime,
  onEndMatch,
  match,
  quarter,
  maxPeriods,
  overtimeDuration,
  setOvertimeDuration,
}) => {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const [duration, setDuration] = React.useState(overtimeDuration.toString());

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.overtimeModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.overtimeCloseButton}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.overtimeIcon}>
            <MaterialCommunityIcons
              name="flag"
              size={32}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.overtimeTitle, { color: textPrimary }]}>
            {quarter === maxPeriods
              ? "Fin du temps réglementaire"
              : "Fin de la prolongation"}
          </Text>

          <Text style={[styles.overtimeScore, { color: textPrimary }]}>
            {match.scoreHome} - {match.scoreAway}
          </Text>

          <Text style={[styles.overtimeDescription, { color: textSecondary }]}>
            Le temps est écoulé. Voulez-vous terminer le match ou lancer une
            prolongation ?
          </Text>

          <View
            style={[
              styles.overtimeDurationBox,
              {
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[styles.overtimeDurationLabel, { color: textSecondary }]}
            >
              DURÉE DE LA PROLONGATION
            </Text>
            <View style={styles.overtimeDurationInput}>
              <TouchableOpacity
                onPress={() => {
                  const newValue = Math.max(1, parseInt(duration) - 1);
                  setDuration(newValue.toString());
                  setOvertimeDuration(newValue);
                }}
                style={[
                  styles.overtimeDurationButton,
                  {
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={20}
                  color={textPrimary}
                />
              </TouchableOpacity>
              <View style={styles.overtimeDurationDisplay}>
                <MaterialCommunityIcons
                  name="timer"
                  size={20}
                  color={textSecondary}
                />
                <Text
                  style={[styles.overtimeDurationValue, { color: textPrimary }]}
                >
                  {duration} min
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const newValue = Math.min(20, parseInt(duration) + 1);
                  setDuration(newValue.toString());
                  setOvertimeDuration(newValue);
                }}
                style={[
                  styles.overtimeDurationButton,
                  {
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.overtimeActions}>
            <TouchableOpacity
              onPress={onEndMatch}
              style={[
                styles.overtimePrimaryButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="flag-checkered"
                size={20}
                color={colors.onPrimary}
              />
              <Text
                style={[
                  styles.overtimePrimaryButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                Terminer le match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onStartOvertime}
              style={[
                styles.overtimeSecondaryButton,
                {
                  backgroundColor: surfaceColor,
                  borderColor,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="play"
                size={18}
                color={textPrimary}
              />
              <Text
                style={[
                  styles.overtimeSecondaryButtonText,
                  { color: textPrimary },
                ]}
              >
                Lancer la prolongation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Period Confirm Modal
interface PeriodConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  timer: number;
  formatTime: (seconds: number) => string;
}

export const PeriodConfirmModal: React.FC<PeriodConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  timer,
  formatTime,
}) => {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.periodConfirmModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.periodConfirmCloseButton,
              {
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.periodConfirmIcon,
              {
                backgroundColor: colors.warning + "30",
                borderColor: colors.warning,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={32}
              color={colors.warning}
            />
          </View>

          <Text style={[styles.periodConfirmTitle, { color: textPrimary }]}>
            Attention
          </Text>

          <Text
            style={[styles.periodConfirmDescription, { color: textSecondary }]}
          >
            Il reste{" "}
            <Text style={{ fontWeight: "bold", color: textPrimary }}>
              {formatTime(timer)}
            </Text>{" "}
            au chronomètre.
            {"\n"}
            Voulez-vous vraiment passer à la période suivante ?
          </Text>

          <View style={styles.periodConfirmActions}>
            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.periodConfirmForceButton,
                { backgroundColor: "#f59e0b" },
              ]}
            >
              <Text
                style={[
                  styles.periodConfirmForceButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                Passer à la suivante
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.periodConfirmCancelButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodConfirmCancelButtonText,
                  {
                    color: colors.text.primary,
                  },
                ]}
              >
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Delete Action Confirm Modal
interface DeleteActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventDescription: string;
}

export const DeleteActionModal: React.FC<DeleteActionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  eventDescription,
}) => {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.deleteActionModal,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <View
            style={[styles.deleteActionIcon, { backgroundColor: "#fee2e2" }]}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={32}
              color="#ef4444"
            />
          </View>

          <Text style={[styles.deleteActionTitle, { color: textPrimary }]}>
            Supprimer cette action ?
          </Text>

          <View
            style={[
              styles.deleteActionDetail,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor,
              },
            ]}
          >
            <Text
              style={{
                color: textPrimary,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              {eventDescription}
            </Text>
          </View>

          <Text style={[styles.deleteActionWarning, { color: textSecondary }]}>
            Cette action sera définitivement supprimée de la base de données.
          </Text>

          <View style={styles.deleteActionActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.deleteActionCancelButton,
                {
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.deleteActionCancelButtonText,
                  { color: textPrimary },
                ]}
              >
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.deleteActionConfirmButton,
                { backgroundColor: "#ef4444" },
              ]}
            >
              <Text
                style={[
                  styles.deleteActionConfirmButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Sync Modal
interface SyncModalProps {
  visible: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({ visible }) => {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.syncModalOverlay}>
        <View
          style={[
            styles.syncModalContent,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="cloud-upload"
            size={48}
            color={colors.primary}
            style={{ marginBottom: 16 }}
          />
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.syncModalText, { color: textPrimary }]}>
            Synchronisation avec le serveur...
          </Text>
          <Text style={[styles.syncModalSubtext, { color: textSecondary }]}>
            Veuillez patienter
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  // History Modal
  historyModal: {
    width: "100%",
    maxWidth: 500,
    height: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  historyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  historyCloseButton: {
    padding: 8,
    borderRadius: 999,
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    padding: 16,
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyItemDescription: {
    fontSize: 14,
    fontWeight: "bold",
  },
  historyItemMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  historyDeleteButton: {
    padding: 8,
  },
  historyEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  historyEmptyText: {
    fontSize: 14,
  },
  historyFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  historyFooterButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  historyFooterButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // Filter Modal - Bottom Sheet
  filterModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  filterBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  filterBottomSheet: {
    width: "100%",
    minHeight: "70%",
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSheetContent: {
    flex: 1,
    paddingBottom: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  clearButtonText: {
    fontSize: 10,
    fontWeight: "700",
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  selectAllText: {
    fontSize: 10,
    fontWeight: "600",
  },
  filterButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  playerFilterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
  },
  playerFilterBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  playerFilterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  playerFilterName: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Filter Summary
  filterSummary: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  filterSummaryTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  filterSummaryItemFlex: {
    flex: 1,
    alignItems: "center",
  },
  filterSummaryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  filterSummaryValue: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  filterSummaryPercentage: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 14,
  },
  filterSummaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
    textAlign: "center",
  },
  // Player Selection Modal
  playerModal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  playerModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playerModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  playerModalSubtitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  playerModalClose: {
    padding: 8,
    borderRadius: 999,
  },
  playerTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  playerTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  playerTabText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    padding: 4,
  },
  playerCard: {
    width: "30%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  playerCardNumber: {
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 8,
  },
  playerCardNumberText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  playerCardName: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  // Court Action Modal
  courtActionModal: {
    width: "100%",
    borderWidth: 1,
  },
  courtActionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  courtActionTitle: {
    fontSize: 20,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  courtActionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  courtActionClose: {
    padding: 8,
    borderRadius: 999,
  },
  courtActionGrid: {
    gap: 12,
  },
  courtActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  courtActionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  courtActionButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COMMON_COLORS.white,
  },
  // Substitution Modal
  subModal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  subHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  subSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  subClose: {
    padding: 8,
    borderRadius: 999,
  },
  subTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  subContent: {
    gap: 16,
    maxHeight: 500,
  },
  subSection: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subSectionHint: {
    fontSize: 12,
  },
  subGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subPlayerCard: {
    width: "23%",
    padding: 8,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  subPlayerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  subPlayerNumberText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  subPlayerName: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  subPlayerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    padding: 2,
  },
  subFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  subCommitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  subCommitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // End Match Modal
  endMatchModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  endMatchIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  endMatchTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  endMatchDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  endMatchActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  endMatchCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  endMatchCancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  endMatchConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  endMatchConfirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // Overtime Modal
  overtimeModal: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  overtimeCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  overtimeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  overtimeTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  overtimeScore: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  overtimeDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  overtimeDurationBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  overtimeDurationLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
  },
  overtimeDurationInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  overtimeDurationButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  overtimeDurationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 80,
    justifyContent: "center",
  },
  overtimeDurationValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  overtimeActions: {
    gap: 12,
  },
  overtimePrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  overtimePrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  overtimeSecondaryButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  overtimeSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // Period Confirm Modal
  periodConfirmModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  periodConfirmCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    borderRadius: 999,
  },
  periodConfirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  periodConfirmTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  periodConfirmDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  periodConfirmActions: {
    width: "100%",
    gap: 12,
  },
  periodConfirmForceButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  periodConfirmForceButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  periodConfirmCancelButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  periodConfirmCancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // Delete Action Modal (for period selection screen)
  deleteActionModal: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  deleteActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  deleteActionTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
  },
  deleteActionDetail: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  deleteActionWarning: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  deleteActionActions: {
    flexDirection: "row",
    gap: 12,
  },
  deleteActionCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteActionCancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteActionConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteActionConfirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  syncModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  syncModalContent: {
    width: "80%",
    maxWidth: 300,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncModalText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  syncModalSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
