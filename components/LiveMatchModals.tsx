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
} from "../src/theme/clubDefaults";
import { Player } from "../models/Player";

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
}

type FilterMode = "ALL" | "SCORING" | "DEFENSE";

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
}) => (
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

        <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
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
                    style={[styles.historyItemDescription, { color: textPrimary }]}
                  >
                    {evt.description}
                  </Text>
                  <Text style={[styles.historyItemMeta, { color: textSecondary }]}>
                    {new Date(evt.timestamp).toLocaleTimeString()} •{" "}
                    {evt.teamId === "HOME"
                      ? match.myTeamName || "Nous"
                      : "Adversaire"}
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
              <Text style={[styles.historyEmptyText, { color: textSecondary }]}>
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
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.filterModal,
          { backgroundColor: surfaceColor, borderColor },
        ]}
      >
        <View style={styles.filterHeader}>
          <MaterialCommunityIcons name="filter" size={20} color={textPrimary} />
          <Text style={[styles.filterTitle, { color: textPrimary }]}>
            Filtres d'affichage
          </Text>
        </View>

        <View style={styles.filterOptions}>
          <TouchableOpacity
            onPress={() => {
              setFilterMode("ALL");
              onClose();
            }}
            style={[
              styles.filterOption,
              {
                backgroundColor:
                  filterMode === "ALL"
                    ? isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`
                    : isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[50],
                borderColor:
                  filterMode === "ALL"
                    ? BRAND_COLORS[500]
                    : borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.filterOptionText,
                {
                  color:
                    filterMode === "ALL"
                      ? BRAND_COLORS[600]
                      : textPrimary,
                },
              ]}
            >
              Tout afficher
            </Text>
            {filterMode === "ALL" && (
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={BRAND_COLORS[600]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setFilterMode("SCORING");
              onClose();
            }}
            style={[
              styles.filterOption,
              {
                backgroundColor:
                  filterMode === "SCORING"
                    ? isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`
                    : isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[50],
                borderColor:
                  filterMode === "SCORING"
                    ? BRAND_COLORS[500]
                    : borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.filterOptionText,
                {
                  color:
                    filterMode === "SCORING"
                      ? BRAND_COLORS[600]
                      : textPrimary,
                },
              ]}
            >
              Points & Tirs
            </Text>
            {filterMode === "SCORING" && (
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={BRAND_COLORS[600]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setFilterMode("DEFENSE");
              onClose();
            }}
            style={[
              styles.filterOption,
              {
                backgroundColor:
                  filterMode === "DEFENSE"
                    ? isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`
                    : isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[50],
                borderColor:
                  filterMode === "DEFENSE"
                    ? BRAND_COLORS[500]
                    : borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.filterOptionText,
                {
                  color:
                    filterMode === "DEFENSE"
                      ? BRAND_COLORS[600]
                      : textPrimary,
                },
              ]}
            >
              Défense (Reb, Int, Ctr)
            </Text>
            {filterMode === "DEFENSE" && (
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={BRAND_COLORS[600]}
              />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.filterCancel}>
          <Text style={[styles.filterCancelText, { color: textPrimary }]}>
            Annuler
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

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
            <Text style={[styles.playerModalSubtitle, { color: BRAND_COLORS[600] }]}>
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
              styles.playerTabs,
              {
                backgroundColor: isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
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
                    playerSelectionTab === "AWAY"
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
                        match.trackOpponentStats && playerSelectionTab === "AWAY"
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
            <Text style={[styles.courtActionSubtitle, { color: textSecondary }]}>
              Que s'est-il passé ici ?
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.courtActionClose,
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

        <ScrollView>
          <View style={styles.courtActionGrid}>
            {/* Simplified action grid for court - just the main actions */}
            <View style={styles.courtActionRow}>
              <CourtActionButton
                onPress={() => onActionSelect("POINT_1", 1)}
                label="+1"
                color={STATUS_COLORS.success}
              />
              <CourtActionButton
                onPress={() => onActionSelect("POINT_2", 2)}
                label="+2"
                color="#4ade80"
              />
              <CourtActionButton
                onPress={() => onActionSelect("POINT_3", 3)}
                label="+3"
                color="#86efac"
              />
            </View>
            <View style={styles.courtActionRow}>
              <CourtActionButton
                onPress={() => onActionSelect("MISS_1", 0)}
                label="Raté 1pt"
                color="#ef4444"
              />
              <CourtActionButton
                onPress={() => onActionSelect("MISS_2", 0)}
                label="Raté 2pts"
                color="#dc2626"
              />
              <CourtActionButton
                onPress={() => onActionSelect("MISS_3", 0)}
                label="Raté 3pts"
                color="#b91c1c"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const CourtActionButton: React.FC<{
  onPress: () => void;
  label: string;
  color: string;
}> = ({ onPress, label, color }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.courtActionButton, { backgroundColor: color }]}
  >
    <Text style={styles.courtActionButtonText}>{label}</Text>
  </TouchableOpacity>
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
        <View style={[styles.subModal, { backgroundColor: surfaceColor, borderColor }]}>
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
                            color: isDark ? SLATE_COLORS[300] : SLATE_COLORS[700],
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
                          borderColor: isIn ? STATUS_COLORS.success : "transparent",
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
                              color: isIn
                                ? COMMON_COLORS.white
                                : textSecondary,
                            },
                          ]}
                        >
                          {player.jerseyNumber}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.subPlayerName,
                          { color: textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {player.name.split(" ").pop()}
                      </Text>
                      {isIn && (
                        <View style={[styles.subPlayerBadge, { backgroundColor: STATUS_COLORS.success }]}>
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
                backgroundColor: isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
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
          <TouchableOpacity onPress={onClose} style={styles.overtimeCloseButton}>
            <MaterialCommunityIcons name="close-circle" size={20} color={textSecondary} />
          </TouchableOpacity>

          <View style={styles.overtimeIcon}>
            <MaterialCommunityIcons name="flag" size={32} color={BRAND_COLORS[600]} />
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
              <MaterialCommunityIcons
                name="timer"
                size={20}
                color={textSecondary}
              />
              <Text style={[styles.overtimeDurationValue, { color: textPrimary }]}>
                {duration} min
              </Text>
            </View>
          </View>

          <View style={styles.overtimeActions}>
            <TouchableOpacity
              onPress={onStartOvertime}
              style={[styles.overtimePrimaryButton, { backgroundColor: BRAND_COLORS[600] }]}
            >
              <MaterialCommunityIcons
                name="play"
                size={20}
                color={COMMON_COLORS.white}
              />
              <Text
                style={[
                  styles.overtimePrimaryButtonText,
                  { color: COMMON_COLORS.white },
                ]}
              >
                Lancer la prolongation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onEndMatch}
              style={[
                styles.overtimeSecondaryButton,
                { backgroundColor: surfaceColor, borderColor },
              ]}
            >
              <Text style={[styles.overtimeSecondaryButtonText, { color: textPrimary }]}>
                Terminer le match
              </Text>
            </TouchableOpacity>
          </View>
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
  // Filter Modal
  filterModal: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterCancel: {
    marginTop: 16,
    padding: 12,
    alignItems: "center",
  },
  filterCancelText: {
    fontSize: 16,
    fontWeight: "500",
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
    gap: 8,
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
});
