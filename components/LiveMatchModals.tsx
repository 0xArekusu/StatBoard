import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
  STATUS_COLORS,
} from "../src/theme";
import { Player } from "../models/Player";
import { MatchActionGrid } from "./MatchActionGrid";

// Types
type EventType =
  | "POINT_1"
  | "POINT_2"
  | "POINT_3"
  | "MISS_1"
  | "MISS_2"
  | "MISS_3"
  | "FOUL"
  | "REBOUND_DEF"
  | "REBOUND_OFF"
  | "ASSIST"
  | "STEAL"
  | "BLOCK"
  | "TURNOVER"
  | "SUBSTITUTION"
  | "POINT";

interface MatchEvent {
  id: string;
  type: EventType;
  value?: number;
  playerId?: string;
  teamId: "HOME" | "AWAY";
  timestamp: number;
  description: string;
  coordinates?: { x: number; y: number };
  period_number?: number;
  time_in_period?: number;
}

type FilterMode =
  | "ALL"
  | "SHOOTING"
  | "REBOUNDS"
  | "FOULS"
  | "TURNOVERS"
  | "BLOCKS"
  | "STEALS";

// History Modal
interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  events: MatchEvent[];
  onDeleteEvent: (id: string) => void;
  match: any;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  events,
  onDeleteEvent,
  match,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.historyModal, { backgroundColor: surfaceColor }]}>
          <View
            style={[
              styles.historyHeader,
              {
                backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[50],
                borderBottomColor: borderColor,
              },
            ]}
          >
            <View style={styles.historyHeaderLeft}>
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={20}
                color={BRAND_COLORS[500]}
              />
              <Text style={[styles.historyTitle, { color: textPrimary }]}>
                Historique du match
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.historyCloseButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[200],
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
                      backgroundColor: isDark
                        ? SLATE_COLORS[800]
                        : COMMON_COLORS.white,
                      borderColor: isDark
                        ? SLATE_COLORS[700]
                        : SLATE_COLORS[100],
                    },
                  ]}
                >
                  <View style={styles.historyItemLeft}>
                    <Text
                      style={[
                        styles.historyItemDescription,
                        { color: textPrimary },
                      ]}
                    >
                      {evt.description}
                    </Text>
                    <Text
                      style={[styles.historyItemMeta, { color: textSecondary }]}
                    >
                      {formatGameTime(evt.period_number, evt.time_in_period)} •{" "}
                      {evt.teamId === "HOME"
                        ? match.myTeamName || "Nous"
                        : match.opponent || "Adversaire"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onDeleteEvent(evt.id)}
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

          <View
            style={[
              styles.historyFooter,
              {
                backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[50],
                borderTopColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.historyFooterButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
            >
              <Text
                style={[
                  styles.historyFooterButtonText,
                  { color: COMMON_COLORS.white },
                ]}
              >
                Fermer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Filter Modal
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  borderColor: string;
  // Optional props for player filtering
  homeRoster?: Player[];
  opponentRoster?: Player[];
  trackOpponentStats?: boolean;
  selectedPlayers?: string[];
  onPlayerSelectionChange?: (playerIds: string[]) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filterMode,
  setFilterMode,
  isDark,
  surfaceColor,
  textPrimary,
  borderColor,
  homeRoster = [],
  opponentRoster = [],
  trackOpponentStats = false,
  selectedPlayers = [],
  onPlayerSelectionChange,
}) => {
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[600];
  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];

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
              ? BRAND_COLORS[600]
              : isDark
              ? SLATE_COLORS[800]
              : SLATE_COLORS[100],
            borderColor: isSelected ? BRAND_COLORS[500] : borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.playerFilterBadge,
            { backgroundColor: isSelected ? COMMON_COLORS.white : bgColor },
          ]}
        >
          <Text
            style={[
              styles.playerFilterBadgeText,
              { color: isSelected ? BRAND_COLORS[600] : textSecondary },
            ]}
          >
            {player.jerseyNumber}
          </Text>
        </View>
        <Text
          style={[
            styles.playerFilterName,
            { color: isSelected ? COMMON_COLORS.white : textPrimary },
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
          style={[styles.filterBottomSheet, { backgroundColor: surfaceColor }]}
        >
          {/* Handle */}
          <View
            style={[
              styles.sheetHandle,
              {
                backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[300],
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
                  setFilterMode("ALL");
                  if (onPlayerSelectionChange) {
                    onPlayerSelectionChange([]);
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
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[200],
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
                  style={[
                    styles.filterSectionLabel,
                    { color: SLATE_COLORS[400] },
                  ]}
                >
                  TYPE D'ACTION
                </Text>
              </View>

              <View style={styles.filterButtonsGrid}>
                <TouchableOpacity
                  onPress={() => setFilterMode("ALL")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "ALL"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "ALL" ? BRAND_COLORS[500] : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "ALL"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Tout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("SHOOTING")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "SHOOTING"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "SHOOTING"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "SHOOTING"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Tirs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("REBOUNDS")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "REBOUNDS"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "REBOUNDS"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "REBOUNDS"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Rebonds
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("FOULS")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "FOULS"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "FOULS"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "FOULS"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Fautes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("TURNOVERS")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "TURNOVERS"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "TURNOVERS"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "TURNOVERS"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Pertes de balle
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("BLOCKS")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "BLOCKS"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "BLOCKS"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "BLOCKS"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Contres
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFilterMode("STEALS")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor:
                        filterMode === "STEALS"
                          ? BRAND_COLORS[600]
                          : isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                      borderColor:
                        filterMode === "STEALS"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color:
                          filterMode === "STEALS"
                            ? COMMON_COLORS.white
                            : textPrimary,
                      },
                    ]}
                  >
                    Interceptions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Player filter section */}
            {onPlayerSelectionChange && homeRoster.length > 0 && (
              <>
                {/* Home Team */}
                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <Text
                      style={[
                        styles.filterSectionLabel,
                        { color: SLATE_COLORS[400] },
                      ]}
                    >
                      JOUEURS
                    </Text>
                  </View>

                  <View style={styles.playerFilterGrid}>
                    {homeRoster.map(renderPlayerButton)}
                  </View>
                </View>

                {/* Opponent Team */}
                {trackOpponentStats && opponentRoster.length > 0 && (
                  <View style={styles.filterSection}>
                    <Text
                      style={[
                        styles.filterSectionLabel,
                        { color: SLATE_COLORS[400] },
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
  playerSelectionTab: "HOME" | "AWAY";
  setPlayerSelectionTab: (tab: "HOME" | "AWAY") => void;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
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
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
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
              style={[styles.playerModalSubtitle, { color: BRAND_COLORS[600] }]}
            >
              {pendingEvent.type
                ? `Validation : ${pendingEvent.type.replace("_", " ")}`
                : "Sélectionnez le joueur"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.playerModalClose,
              {
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
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
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setPlayerSelectionTab("HOME")}
              style={[
                styles.playerTab,
                {
                  backgroundColor:
                    playerSelectionTab === "HOME"
                      ? BRAND_COLORS[600]
                      : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.playerTabText,
                  {
                    color:
                      playerSelectionTab === "HOME"
                        ? COMMON_COLORS.white
                        : textSecondary,
                  },
                ]}
              >
                {match.myTeamName || "NOUS"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPlayerSelectionTab("AWAY")}
              style={[
                styles.playerTab,
                {
                  backgroundColor:
                    playerSelectionTab === "AWAY" ? "#ef4444" : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.playerTabText,
                  {
                    color:
                      playerSelectionTab === "AWAY"
                        ? COMMON_COLORS.white
                        : textSecondary,
                  },
                ]}
              >
                EUX
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.playerGrid}>
          {(match.trackOpponentStats && playerSelectionTab === "AWAY"
            ? opponentPlayersOnCourt
            : playersOnCourt
          ).map((player: Player) => (
            <TouchableOpacity
              key={player.id}
              onPress={() => onPlayerSelect(player.id)}
              style={[
                styles.playerCard,
                {
                  backgroundColor:
                    match.trackOpponentStats && playerSelectionTab === "AWAY"
                      ? isDark
                        ? SLATE_COLORS[800]
                        : SLATE_COLORS[50]
                      : isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[50],
                  borderColor:
                    match.trackOpponentStats && playerSelectionTab === "AWAY"
                      ? isDark
                        ? SLATE_COLORS[700]
                        : SLATE_COLORS[200]
                      : isDark
                      ? SLATE_COLORS[700]
                      : SLATE_COLORS[200],
                },
              ]}
            >
              <View
                style={[
                  styles.playerCardNumber,
                  {
                    backgroundColor:
                      match.trackOpponentStats && playerSelectionTab === "AWAY"
                        ? isDark
                          ? SLATE_COLORS[700]
                          : COMMON_COLORS.white
                        : isDark
                        ? SLATE_COLORS[700]
                        : COMMON_COLORS.white,
                    borderColor:
                      match.trackOpponentStats && playerSelectionTab === "AWAY"
                        ? "#ef4444"
                        : SLATE_COLORS[200],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerCardNumberText,
                    {
                      color:
                        match.trackOpponentStats &&
                        playerSelectionTab === "AWAY"
                          ? "#ef4444"
                          : isDark
                          ? SLATE_COLORS[200]
                          : SLATE_COLORS[700],
                    },
                  ]}
                >
                  {player.jerseyNumber}
                </Text>
              </View>
              <Text
                style={[
                  styles.playerCardName,
                  {
                    color: isDark ? SLATE_COLORS[200] : SLATE_COLORS[700],
                  },
                ]}
                numberOfLines={1}
              >
                {player.name.split(" ").pop()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Court Action Modal
interface CourtActionModalProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (type: EventType, value?: number) => void;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const CourtActionModal: React.FC<CourtActionModalProps> = ({
  visible,
  onClose,
  onActionSelect,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.courtActionModal,
          { backgroundColor: surfaceColor, borderColor },
        ]}
      >
        <View style={styles.courtActionHeader}>
          <View>
            <Text style={[styles.courtActionTitle, { color: textPrimary }]}>
              ACTION
            </Text>
            <Text
              style={[styles.courtActionSubtitle, { color: textSecondary }]}
            >
              Que s'est-il passé ici ?
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.courtActionClose,
              {
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
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

        <ScrollView>
          <MatchActionGrid onAction={onActionSelect} isDark={isDark} />
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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
  subTeamTab: "HOME" | "AWAY";
  setSubTeamTab: (tab: "HOME" | "AWAY") => void;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
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
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
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
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
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
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setSubTeamTab("HOME")}
                style={[
                  styles.subTab,
                  {
                    backgroundColor:
                      subTeamTab === "HOME" ? BRAND_COLORS[600] : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color:
                        subTeamTab === "HOME"
                          ? COMMON_COLORS.white
                          : textSecondary,
                    },
                  ]}
                >
                  {match.myTeamName || "NOUS"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSubTeamTab("AWAY")}
                style={[
                  styles.subTab,
                  {
                    backgroundColor:
                      subTeamTab === "AWAY" ? "#ef4444" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color:
                        subTeamTab === "AWAY"
                          ? COMMON_COLORS.white
                          : textSecondary,
                    },
                  ]}
                >
                  EUX
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.subContent}>
            {/* On Court */}
            <View
              style={[
                styles.subSection,
                {
                  backgroundColor: isDark
                    ? `${SLATE_COLORS[950]}50`
                    : SLATE_COLORS[50],
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
                {onCourt.map((player: Player) => {
                  const isOut = subSelection.out.includes(player.id);
                  return (
                    <TouchableOpacity
                      key={player.id}
                      onPress={() => toggleSubOut(player.id)}
                      style={[
                        styles.subPlayerCard,
                        {
                          backgroundColor: isOut
                            ? isDark
                              ? "#7f1d1d"
                              : "#fee2e2"
                            : isDark
                            ? SLATE_COLORS[800]
                            : COMMON_COLORS.white,
                          borderColor: isOut ? "#ef4444" : "transparent",
                          borderWidth: isOut ? 2 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.subPlayerNumber,
                          {
                            backgroundColor: isOut
                              ? "#ef4444"
                              : isDark
                              ? SLATE_COLORS[700]
                              : SLATE_COLORS[100],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subPlayerNumberText,
                            {
                              color: isOut
                                ? COMMON_COLORS.white
                                : isDark
                                ? SLATE_COLORS[200]
                                : SLATE_COLORS[900],
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
                            color: isDark
                              ? SLATE_COLORS[300]
                              : SLATE_COLORS[700],
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {player.name.split(" ").pop()}
                      </Text>
                      {isOut && (
                        <View style={styles.subPlayerBadge}>
                          <MaterialCommunityIcons
                            name="arrow-right"
                            size={10}
                            color={COMMON_COLORS.white}
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
                  backgroundColor: isDark
                    ? `${SLATE_COLORS[950]}50`
                    : SLATE_COLORS[50],
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
                {onBench.map((player: Player) => {
                  const isIn = subSelection.in.includes(player.id);
                  return (
                    <TouchableOpacity
                      key={player.id}
                      onPress={() => toggleSubIn(player.id)}
                      style={[
                        styles.subPlayerCard,
                        {
                          backgroundColor: isIn
                            ? isDark
                              ? "#14532d"
                              : "#dcfce7"
                            : isDark
                            ? SLATE_COLORS[800]
                            : COMMON_COLORS.white,
                          borderColor: isIn
                            ? STATUS_COLORS.success
                            : "transparent",
                          borderWidth: isIn ? 2 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.subPlayerNumber,
                          {
                            backgroundColor: isIn
                              ? STATUS_COLORS.success
                              : isDark
                              ? SLATE_COLORS[700]
                              : SLATE_COLORS[200],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subPlayerNumberText,
                            {
                              color: isIn ? COMMON_COLORS.white : textSecondary,
                            },
                          ]}
                        >
                          {player.jerseyNumber}
                        </Text>
                      </View>
                      <Text
                        style={[styles.subPlayerName, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        {player.name.split(" ").pop()}
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
                            color={COMMON_COLORS.white}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

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
                      ? isDark
                        ? SLATE_COLORS[800]
                        : SLATE_COLORS[300]
                      : BRAND_COLORS[600],
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
                color={COMMON_COLORS.white}
              />
              <Text
                style={[
                  styles.subCommitButtonText,
                  { color: COMMON_COLORS.white },
                ]}
              >
                {subSelection.in.length > 0 &&
                subSelection.in.length !== subSelection.out.length
                  ? `Sélectionnez ${Math.abs(
                      subSelection.in.length - subSelection.out.length
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
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const EndMatchModal: React.FC<EndMatchModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
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
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              },
            ]}
          >
            <Text
              style={[styles.endMatchCancelButtonText, { color: textPrimary }]}
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
                { color: COMMON_COLORS.white },
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
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
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
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
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
              color={BRAND_COLORS[600]}
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
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[50],
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
                    backgroundColor: isDark
                      ? SLATE_COLORS[700]
                      : SLATE_COLORS[200],
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
                    backgroundColor: isDark
                      ? SLATE_COLORS[700]
                      : SLATE_COLORS[200],
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
                { backgroundColor: BRAND_COLORS[600] },
              ]}
            >
              <MaterialCommunityIcons
                name="flag-checkered"
                size={20}
                color={COMMON_COLORS.white}
              />
              <Text
                style={[
                  styles.overtimePrimaryButtonText,
                  { color: COMMON_COLORS.white },
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
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const PeriodConfirmModal: React.FC<PeriodConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  timer,
  formatTime,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
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
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
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
              backgroundColor: isDark ? "#78350f" : "#fef3c7",
              borderColor: isDark ? "#78350f" : "#fcd34d",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="alert-circle"
            size={32}
            color={isDark ? "#fbbf24" : "#f59e0b"}
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
                { color: COMMON_COLORS.white },
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
                backgroundColor: isDark
                  ? SLATE_COLORS[800]
                  : COMMON_COLORS.white,
                borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200],
              },
            ]}
          >
            <Text
              style={[
                styles.periodConfirmCancelButtonText,
                {
                  color: isDark ? SLATE_COLORS[300] : SLATE_COLORS[700],
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

// Delete Action Confirm Modal
interface DeleteActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventDescription: string;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const DeleteActionModal: React.FC<DeleteActionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  eventDescription,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.deleteActionModal,
          { backgroundColor: surfaceColor, borderColor },
        ]}
      >
        <View style={[styles.deleteActionIcon, { backgroundColor: "#fee2e2" }]}>
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
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[50],
              borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.deleteActionDescription,
              { color: textPrimary, fontWeight: "600" },
            ]}
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
                backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
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
                { color: COMMON_COLORS.white },
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
    minHeight: "35%",
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
    width: 48,
    height: 48,
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
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 16,
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
  // Delete Action Modal
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
  deleteActionDescription: {
    fontSize: 14,
    textAlign: "center",
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
});
