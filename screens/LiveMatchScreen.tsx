import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
  STATUS_COLORS,
} from "../src/theme/clubDefaults";
import { Match, MatchStatus } from "../src/models/types";
import { Player } from "../models/Player";
import Svg, { Rect, Line, Circle, Path } from "react-native-svg";
import {
  HistoryModal,
  FilterModal,
  PlayerSelectionModal,
  CourtActionModal,
  SubstitutionModal,
  EndMatchModal,
  OvertimeModal,
} from "../components/LiveMatchModals";

interface LiveMatchScreenProps {
  navigation: any;
  route: any;
}

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

type WorkflowStep =
  | "IDLE"
  | "SELECT_PLAYER"
  | "SELECT_ACTION_FROM_COURT"
  | "SUBSTITUTION";
type FilterMode = "ALL" | "SCORING" | "DEFENSE";

// Mock players for fallback
const MOCK_ROSTER: Player[] = [
  {
    id: "p1",
    name: "T. Parker",
    jerseyNumber: 9,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p2",
    name: "B. Diaw",
    jerseyNumber: 13,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p3",
    name: "N. Batum",
    jerseyNumber: 5,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p4",
    name: "R. Gobert",
    jerseyNumber: 27,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p5",
    name: "E. Fournier",
    jerseyNumber: 10,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_OPPONENT_ROSTER: Player[] = [
  {
    id: "adv1",
    name: "Joueur 1",
    jerseyNumber: 4,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv2",
    name: "Joueur 2",
    jerseyNumber: 7,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv3",
    name: "Joueur 3",
    jerseyNumber: 11,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv4",
    name: "Joueur 4",
    jerseyNumber: 15,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv5",
    name: "Joueur 5",
    jerseyNumber: 23,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function LiveMatchScreen({
  navigation,
  route,
}: LiveMatchScreenProps) {
  const { colors, isDark } = useTheme();
  const matchId = route.params?.matchId;

  // Mock match data - In real app, load from database
  const [match, setMatch] = useState<any>({
    id: matchId,
    myTeamName: "Mon Équipe",
    opponent: "Adversaire",
    location: "HOME",
    scoreHome: 0,
    scoreAway: 0,
    status: "in_progress" as MatchStatus,
    trackOpponentStats: false,
    roster: MOCK_ROSTER,
    opponentRoster: MOCK_OPPONENT_ROSTER,
    starters: ["p1", "p2", "p3", "p4", "p5"],
    periodCount: 4,
    periodDuration: 10,
    events: [] as MatchEvent[],
  });

  // Determine Rosters
  const homeRoster =
    match?.roster && match.roster.length > 0 ? match.roster : MOCK_ROSTER;
  const opponentRoster =
    match?.opponentRoster && match.opponentRoster.length > 0
      ? match.opponentRoster
      : MOCK_OPPONENT_ROSTER;

  // Match Configuration
  const periodDurationMin = match?.periodDuration || 10;
  const maxPeriods = match?.periodCount || 4;

  const getPeriodLabel = (q: number) => {
    if (q <= maxPeriods) {
      return maxPeriods === 2 ? `MT${q}` : `Q${q}`;
    }
    return `OT${q - maxPeriods}`;
  };

  // Game Clock
  const [timer, setTimer] = useState(periodDurationMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [quarter, setQuarter] = useState(1);

  // Team State
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    if (match?.starters && match.starters.length > 0) {
      return match.starters;
    }
    return homeRoster.slice(0, 5).map((p: Player) => p.id);
  });

  const [activeOpponentPlayers, setActiveOpponentPlayers] = useState<string[]>(
    () => {
      return opponentRoster.slice(0, 5).map((p: Player) => p.id);
    }
  );

  const [subSelection, setSubSelection] = useState<{
    out: string[];
    in: string[];
  }>({ out: [], in: [] });
  const [subTeamTab, setSubTeamTab] = useState<"HOME" | "AWAY">("HOME");

  // UI State
  const [viewMode, setViewMode] = useState<"GRID" | "COURT">("GRID");
  const [playerSelectionTab, setPlayerSelectionTab] = useState<"HOME" | "AWAY">(
    "HOME"
  );

  // Modals State
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeDuration, setOvertimeDuration] = useState(5);

  // Toolbar State
  const [showMarkers, setShowMarkers] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");

  // Workflow State
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("IDLE");
  const [pendingEvent, setPendingEvent] = useState<{
    type?: EventType;
    value?: number;
    coords?: { x: number; y: number };
    playerId?: string;
  }>({});

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleNextQuarter = () => {
    setIsRunning(false);

    if (quarter >= maxPeriods) {
      setShowOvertimeModal(true);
    } else {
      setQuarter((prev) => prev + 1);
      setTimer(periodDurationMin * 60);
    }
  };

  const startOvertime = () => {
    setQuarter((prev) => prev + 1);
    setTimer(overtimeDuration * 60);
    setShowOvertimeModal(false);
  };

  // --- TOOLBAR ACTIONS ---

  const undoLastAction = () => {
    if (!match.events || match.events.length === 0) return;

    const [lastEvent, ...remainingEvents] = match.events;
    const updatedMatch = { ...match, events: remainingEvents };

    // Revert Score
    if (
      (lastEvent.type === "POINT_1" ||
        lastEvent.type === "POINT_2" ||
        lastEvent.type === "POINT_3" ||
        lastEvent.type === "POINT") &&
      lastEvent.value
    ) {
      if (lastEvent.teamId === "HOME") {
        updatedMatch.scoreHome = Math.max(0, updatedMatch.scoreHome - lastEvent.value);
      } else {
        updatedMatch.scoreAway = Math.max(0, updatedMatch.scoreAway - lastEvent.value);
      }
    }

    setMatch(updatedMatch);
  };

  const deleteEvent = (eventId: string) => {
    if (!match.events) return;
    const eventToDelete = match.events.find((e: MatchEvent) => e.id === eventId);
    if (!eventToDelete) return;

    const updatedEvents = match.events.filter((e: MatchEvent) => e.id !== eventId);
    const updatedMatch = { ...match, events: updatedEvents };

    // Revert Score
    if (
      (eventToDelete.type.includes("POINT") || eventToDelete.type === "POINT") &&
      eventToDelete.value
    ) {
      if (eventToDelete.teamId === "HOME") {
        updatedMatch.scoreHome = Math.max(
          0,
          updatedMatch.scoreHome - eventToDelete.value
        );
      } else {
        updatedMatch.scoreAway = Math.max(
          0,
          updatedMatch.scoreAway - eventToDelete.value
        );
      }
    }

    setMatch(updatedMatch);
  };

  // --- WORKFLOW ACTIONS ---

  const handleActionClick = (type: EventType, value: number = 0) => {
    setPendingEvent({ type, value });
    setPlayerSelectionTab("HOME");
    setWorkflowStep("SELECT_PLAYER");
  };

  const handleCourtClick = (x: number, y: number) => {
    setPendingEvent({ coords: { x, y } });
    setPlayerSelectionTab("HOME");
    setWorkflowStep("SELECT_ACTION_FROM_COURT");
  };

  const handleCourtActionSelect = (type: EventType, value: number = 0) => {
    setPendingEvent((prev) => ({ ...prev, type, value }));
    setWorkflowStep("SELECT_PLAYER");
  };

  const handlePlayerSelect = (playerId: string) => {
    if (pendingEvent.type) {
      finalizeEvent(
        pendingEvent.type,
        pendingEvent.value || 0,
        playerId,
        pendingEvent.coords
      );
    }
  };

  // --- SUBSTITUTION ---

  const openSubstitution = () => {
    setSubSelection({ out: [], in: [] });
    setSubTeamTab("HOME");
    setWorkflowStep("SUBSTITUTION");
  };

  const toggleSubOut = (playerId: string) => {
    setSubSelection((prev) => {
      const isSelected = prev.out.includes(playerId);
      return {
        ...prev,
        out: isSelected
          ? prev.out.filter((id) => id !== playerId)
          : [...prev.out, playerId],
      };
    });
  };

  const toggleSubIn = (playerId: string) => {
    setSubSelection((prev) => {
      const isSelected = prev.in.includes(playerId);
      return {
        ...prev,
        in: isSelected
          ? prev.in.filter((id) => id !== playerId)
          : [...prev.in, playerId],
      };
    });
  };

  const commitSubstitution = () => {
    const isHome = subTeamTab === "HOME";
    const currentActive = isHome ? activePlayers : activeOpponentPlayers;

    const remainingPlayers = currentActive.filter(
      (id) => !subSelection.out.includes(id)
    );
    const newActivePlayers = [...remainingPlayers, ...subSelection.in];

    const subDescription = `Changements (${
      isHome ? "Nous" : "Eux"
    }): ${subSelection.in.length} joueur(s)`;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: "SUBSTITUTION",
      timestamp: Date.now(),
      description: subDescription,
      teamId: isHome ? "HOME" : "AWAY",
    };

    const updatedMatch = { ...match };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];
    setMatch(updatedMatch);

    if (isHome) {
      setActivePlayers(newActivePlayers);
    } else {
      setActiveOpponentPlayers(newActivePlayers);
    }
    setWorkflowStep("IDLE");
  };

  // --- FINALIZATION ---

  const finalizeEvent = (
    type: EventType,
    value: number,
    playerId: string,
    coords?: { x: number; y: number }
  ) => {
    const isHomePlayer = homeRoster.some((p: Player) => p.id === playerId);
    const player = isHomePlayer
      ? homeRoster.find((p: Player) => p.id === playerId)
      : opponentRoster.find((p: Player) => p.id === playerId);

    const teamId = isHomePlayer ? "HOME" : "AWAY";

    let desc = "";
    const pName = player?.name.split(" ").pop() || "Joueur";

    switch (type) {
      case "POINT_1":
        desc = `${pName} (+1)`;
        break;
      case "POINT_2":
        desc = `${pName} (+2)`;
        break;
      case "POINT_3":
        desc = `${pName} (+3)`;
        break;
      case "MISS_1":
        desc = `${pName} Raté (1pt)`;
        break;
      case "MISS_2":
        desc = `${pName} Raté (2pts)`;
        break;
      case "MISS_3":
        desc = `${pName} Raté (3pts)`;
        break;
      case "FOUL":
        desc = `Faute ${pName}`;
        break;
      default:
        desc = `${pName} ${type}`;
    }

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type,
      value,
      playerId,
      teamId,
      timestamp: Date.now(),
      description: desc,
      coordinates: coords,
    };

    const updatedMatch = { ...match };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];

    // Update Score
    if (
      (type === "POINT_1" || type === "POINT_2" || type === "POINT_3") &&
      value > 0
    ) {
      if (teamId === "HOME") {
        updatedMatch.scoreHome += value;
      } else {
        updatedMatch.scoreAway += value;
      }
    }

    setMatch(updatedMatch);
    closeWorkflow();
  };

  const closeWorkflow = () => {
    setWorkflowStep("IDLE");
    setPendingEvent({});
  };

  const handleOpponentScoreSimple = (value: number) => {
    const updatedMatch = { ...match };
    updatedMatch.scoreAway += value;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: "POINT" as any,
      value,
      teamId: "AWAY",
      timestamp: Date.now(),
      description: `Adversaire +${value}`,
    };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];

    setMatch(updatedMatch);
  };

  const confirmEndMatch = () => {
    setMatch({ ...match, status: MatchStatus.COMPLETED });
    navigation.goBack();
  };

  // Helpers
  const getSubModalPlayers = () => {
    if (subTeamTab === "HOME") {
      return {
        onCourt: homeRoster.filter((p: Player) => activePlayers.includes(p.id)),
        onBench: homeRoster.filter((p: Player) => !activePlayers.includes(p.id)),
      };
    } else {
      return {
        onCourt: opponentRoster.filter((p: Player) =>
          activeOpponentPlayers.includes(p.id)
        ),
        onBench: opponentRoster.filter(
          (p: Player) => !activeOpponentPlayers.includes(p.id)
        ),
      };
    }
  };

  const playersOnCourt = homeRoster.filter((p: Player) =>
    activePlayers.includes(p.id)
  );
  const opponentPlayersOnCourt = opponentRoster.filter((p: Player) =>
    activeOpponentPlayers.includes(p.id)
  );

  const amIHome = match.location === "HOME";

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.headerContent}>
          {/* LEFT SIDE */}
          {amIHome ? (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textPrimary }]}>
                {match.scoreHome}
              </Text>
              <Text style={[styles.teamName, { color: BRAND_COLORS[600] }]}>
                {match.myTeamName || "Nous"}
              </Text>
              <TouchableOpacity
                onPress={openSubstitution}
                style={[
                  styles.subButton,
                  {
                    backgroundColor: isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`,
                    borderColor: isDark
                      ? `${BRAND_COLORS[500]}30`
                      : `${BRAND_COLORS[500]}30`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={12}
                  color={BRAND_COLORS[600]}
                />
                <Text
                  style={[styles.subButtonText, { color: BRAND_COLORS[600] }]}
                >
                  CHANGT
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textSecondary }]}>
                {match.scoreAway}
              </Text>
              <Text style={[styles.teamName, { color: textSecondary }]}>
                {match.opponent}
              </Text>
              {!match.trackOpponentStats && (
                <View style={styles.quickScoreButtons}>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(1)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +1
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(2)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +2
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(3)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +3
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* CENTER (TIMER) */}
          <View style={styles.timerSection}>
            <View style={styles.periodRow}>
              <Text style={[styles.periodText, { color: textSecondary }]}>
                {getPeriodLabel(quarter)}
              </Text>
              <TouchableOpacity
                onPress={handleNextQuarter}
                style={[
                  styles.nextPeriodButton,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[900]
                      : SLATE_COLORS[100],
                    borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={10}
                  color={BRAND_COLORS[600]}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsRunning(!isRunning)}
              style={[
                styles.playButton,
                {
                  backgroundColor: isRunning
                    ? isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[200]
                    : BRAND_COLORS[600],
                  borderColor: surfaceColor,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isRunning ? "pause" : "play"}
                size={14}
                color={isRunning ? "#ef4444" : COMMON_COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* RIGHT SIDE */}
          {amIHome ? (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textSecondary }]}>
                {match.scoreAway}
              </Text>
              <Text style={[styles.teamName, { color: textSecondary }]}>
                {match.opponent}
              </Text>
              {!match.trackOpponentStats && (
                <View style={styles.quickScoreButtons}>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(1)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +1
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(2)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +2
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(3)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +3
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textPrimary }]}>
                {match.scoreHome}
              </Text>
              <Text style={[styles.teamName, { color: BRAND_COLORS[600] }]}>
                {match.myTeamName || "Nous"}
              </Text>
              <TouchableOpacity
                onPress={openSubstitution}
                style={[
                  styles.subButton,
                  {
                    backgroundColor: isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`,
                    borderColor: isDark
                      ? `${BRAND_COLORS[500]}30`
                      : `${BRAND_COLORS[500]}30`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={12}
                  color={BRAND_COLORS[600]}
                />
                <Text
                  style={[styles.subButtonText, { color: BRAND_COLORS[600] }]}
                >
                  CHANGT
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* View Mode Toggle */}
      <View
        style={[
          styles.viewModeToggle,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <TouchableOpacity
          onPress={() => setViewMode("GRID")}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === "GRID"
                  ? BRAND_COLORS[600]
                  : isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="view-grid"
            size={16}
            color={viewMode === "GRID" ? COMMON_COLORS.white : textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === "GRID" ? COMMON_COLORS.white : textSecondary,
              },
            ]}
          >
            ACTIONS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("COURT")}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === "COURT"
                  ? BRAND_COLORS[600]
                  : isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="map"
            size={16}
            color={viewMode === "COURT" ? COMMON_COLORS.white : textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === "COURT" ? COMMON_COLORS.white : textSecondary,
              },
            ]}
          >
            TERRAIN
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {viewMode === "GRID" && (
          <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContent}>
            <ActionGrid onAction={handleActionClick} isDark={isDark} />
          </ScrollView>
        )}

        {viewMode === "COURT" && (
          <CourtView
            onCourtClick={handleCourtClick}
            events={match.events}
            showMarkers={showMarkers}
            filterMode={filterMode}
            isDark={isDark}
          />
        )}
      </View>

      {/* Toolbar */}
      <View
        style={[
          styles.toolbar,
          { backgroundColor: surfaceColor, borderTopColor: borderColor },
        ]}
      >
        <TouchableOpacity
          onPress={undoLastAction}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name="undo"
            size={22}
            color={textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Annuler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name="filter"
            size={22}
            color={
              filterMode !== "ALL" ? BRAND_COLORS[500] : textSecondary
            }
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Filtres
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowMarkers(!showMarkers)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name={showMarkers ? "eye" : "eye-off"}
            size={22}
            color={showMarkers ? BRAND_COLORS[500] : textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Vue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowHistoryModal(true)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={22}
            color={textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {/* Will be implemented in next part */}
      <OvertimeModal
        visible={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onStartOvertime={startOvertime}
        onEndMatch={() => {
          setShowOvertimeModal(false);
          setShowEndConfirm(true);
        }}
        match={match}
        quarter={quarter}
        maxPeriods={maxPeriods}
        overtimeDuration={overtimeDuration}
        setOvertimeDuration={setOvertimeDuration}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        events={match.events}
        onDeleteEvent={deleteEvent}
        match={match}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        borderColor={borderColor}
      />

      <PlayerSelectionModal
        visible={workflowStep === "SELECT_PLAYER"}
        onClose={closeWorkflow}
        onPlayerSelect={handlePlayerSelect}
        pendingEvent={pendingEvent}
        match={match}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        playerSelectionTab={playerSelectionTab}
        setPlayerSelectionTab={setPlayerSelectionTab}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <CourtActionModal
        visible={workflowStep === "SELECT_ACTION_FROM_COURT"}
        onClose={closeWorkflow}
        onActionSelect={handleCourtActionSelect}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <SubstitutionModal
        visible={workflowStep === "SUBSTITUTION"}
        onClose={closeWorkflow}
        onCommit={commitSubstitution}
        subSelection={subSelection}
        toggleSubOut={toggleSubOut}
        toggleSubIn={toggleSubIn}
        getSubModalPlayers={getSubModalPlayers}
        match={match}
        subTeamTab={subTeamTab}
        setSubTeamTab={setSubTeamTab}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <EndMatchModal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={confirmEndMatch}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />
    </View>
  );
}

// ==================== COMPONENTS ====================

// Action Grid Component
interface ActionGridProps {
  onAction: (type: EventType, value?: number) => void;
  isDark: boolean;
}

const ActionGrid: React.FC<ActionGridProps> = ({ onAction, isDark }) => (
  <View style={styles.actionGrid}>
    {/* Row 1: Scoring Positive */}
    <View style={styles.actionRow}>
      <ActionButton
        onPress={() => onAction("POINT_1", 1)}
        label="+1"
        sub="Lancer"
        color={STATUS_COLORS.success}
      />
      <ActionButton
        onPress={() => onAction("POINT_2", 2)}
        label="+2"
        sub="Points"
        color="#4ade80"
      />
      <ActionButton
        onPress={() => onAction("POINT_3", 3)}
        label="+3"
        sub="Points"
        color="#86efac"
      />
    </View>

    {/* Row 2: Scoring Negative (Misses) */}
    <View style={[styles.actionRow, { height: 64 }]}>
      <ActionButton
        onPress={() => onAction("MISS_1", 0)}
        label="Raté"
        sub="Lancer"
        color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
        textColor="#ef4444"
      />
      <ActionButton
        onPress={() => onAction("MISS_2", 0)}
        label="Raté"
        sub="2 Pts"
        color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
        textColor="#ef4444"
      />
      <ActionButton
        onPress={() => onAction("MISS_3", 0)}
        label="Raté"
        sub="3 Pts"
        color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
        textColor="#ef4444"
      />
    </View>

    {/* Row 3: Rebounds */}
    <View style={[styles.actionRow, { height: 80 }]}>
      <ActionButton
        onPress={() => onAction("REBOUND_DEF")}
        label="REB DEF"
        sub="Défensif"
        color="#2563eb"
      />
      <ActionButton
        onPress={() => onAction("REBOUND_OFF")}
        label="REB OFF"
        sub="Offensif"
        color="#06b6d4"
      />
    </View>

    {/* Row 4: Other Stats */}
    <View style={styles.actionRow}>
      <ActionButton
        onPress={() => onAction("ASSIST")}
        label="PASSE D"
        sub="Assist"
        color="#6366f1"
      />
      <ActionButton
        onPress={() => onAction("STEAL")}
        label="INTERC"
        sub="Vol"
        color="#8b5cf6"
      />
      <View style={styles.miniColumn}>
        <ActionButton
          onPress={() => onAction("BLOCK")}
          label="CONTRE"
          color={SLATE_COLORS[600]}
          textSize={14}
        />
        <ActionButton
          onPress={() => onAction("FOUL")}
          label="FAUTE"
          color="#b91c1c"
          textSize={14}
        />
      </View>
    </View>

    {/* Row 5: Turnover */}
    <View style={[styles.actionRow, { height: 56 }]}>
      <ActionButton
        onPress={() => onAction("TURNOVER")}
        label="BALLE PERDUE"
        color="#ea580c"
      />
    </View>
  </View>
);

interface ActionButtonProps {
  onPress: () => void;
  label: string;
  sub?: string;
  color: string;
  textColor?: string;
  textSize?: number;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onPress,
  label,
  sub,
  color,
  textColor = COMMON_COLORS.white,
  textSize = 20,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.actionButton,
      { backgroundColor: color, borderBottomColor: "rgba(0,0,0,0.1)" },
    ]}
    activeOpacity={0.8}
  >
    <Text style={[styles.actionButtonLabel, { color: textColor, fontSize: textSize }]}>
      {label}
    </Text>
    {sub && (
      <Text style={[styles.actionButtonSub, { color: textColor }]}>{sub}</Text>
    )}
  </TouchableOpacity>
);

// Court View Component
interface CourtViewProps {
  onCourtClick: (x: number, y: number) => void;
  events: MatchEvent[];
  showMarkers: boolean;
  filterMode: FilterMode;
  isDark: boolean;
}

const CourtView: React.FC<CourtViewProps> = ({
  onCourtClick,
  events,
  showMarkers,
  filterMode,
  isDark,
}) => {
  const [courtDimensions, setCourtDimensions] = useState({ width: 0, height: 0 });

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCourtDimensions({ width, height });
  };

  const handlePress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = (locationX / courtDimensions.width) * 100;
    const y = (locationY / courtDimensions.height) * 100;
    onCourtClick(x, y);
  };

  const filteredEvents = events?.filter((e: MatchEvent) => {
    if (!e.coordinates) return false;
    if (filterMode === "ALL") return true;
    if (filterMode === "SCORING")
      return e.type.includes("POINT") || e.type.includes("MISS");
    if (filterMode === "DEFENSE")
      return ["REBOUND_OFF", "REBOUND_DEF", "STEAL", "BLOCK", "FOUL"].includes(
        e.type
      );
    return true;
  });

  return (
    <View style={styles.courtContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onLayout={handleLayout}
        style={styles.courtTouchable}
      >
        <View style={styles.court}>
          {/* SVG Court Background */}
          <Svg width="100%" height="100%" viewBox="0 0 50 94" style={styles.courtSvg}>
            <Rect width="50" height="94" fill={isDark ? "#1e1b4b" : "#f0fdf4"} opacity="0.3" />
            <Line x1="0" y1="47" x2="50" y2="47" stroke="white" strokeWidth="0.5" />
            <Circle cx="25" cy="47" r="6" stroke="white" strokeWidth="0.5" fill="none" />

            {/* Top Key */}
            <Rect x="17" y="0" width="16" height="19" stroke="white" strokeWidth="0.5" fill="none" />
            <Path d="M 17 19 A 6 6 0 0 0 33 19" stroke="white" strokeWidth="0.5" fill="none" />
            <Circle cx="25" cy="5.25" r="1.5" stroke="white" strokeWidth="0.5" />

            {/* Bottom Key */}
            <Rect x="17" y="75" width="16" height="19" stroke="white" strokeWidth="0.5" fill="none" />
            <Path d="M 17 75 A 6 6 0 0 1 33 75" stroke="white" strokeWidth="0.5" fill="none" />
            <Circle cx="25" cy="88.75" r="1.5" stroke="white" strokeWidth="0.5" />
          </Svg>

          {/* Event Markers */}
          {showMarkers &&
            filteredEvents?.map((evt: MatchEvent) => {
              let markerColor = SLATE_COLORS[500];
              if (evt.type.includes("POINT"))
                markerColor = evt.teamId === "AWAY" ? "#ef4444" : "#22c55e";
              if (evt.type.includes("MISS"))
                markerColor = evt.teamId === "AWAY" ? "#ea580c" : "#b91c1c";

              return (
                <View
                  key={evt.id}
                  style={[
                    styles.eventMarker,
                    {
                      backgroundColor: markerColor,
                      left: `${evt.coordinates!.x}%`,
                      top: `${evt.coordinates!.y}%`,
                    },
                  ]}
                />
              );
            })}
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Modals are imported from LiveMatchModals.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  teamSection: {
    width: 112,
    alignItems: "center",
    paddingTop: 4,
  },
  score: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -2,
  },
  teamName: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  subButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  subButtonText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  quickScoreButtons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  quickScoreButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickScoreButtonText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  nextPeriodButton: {
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  timerDisplay: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SLATE_COLORS[800],
    width: 128,
    alignItems: "center",
  },
  timerText: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 4,
  },
  playButton: {
    marginTop: -12,
    padding: 6,
    borderRadius: 999,
    borderWidth: 4,
    zIndex: 10,
  },
  viewModeToggle: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewModeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  mainContent: {
    flex: 1,
    paddingBottom: 64,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    padding: 12,
  },
  actionGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    height: 96,
  },
  miniColumn: {
    flex: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
  },
  actionButtonLabel: {
    fontWeight: "900",
  },
  actionButtonSub: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
    opacity: 0.9,
  },
  courtContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  courtTouchable: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 0.6,
  },
  court: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a472a",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SLATE_COLORS[300],
    overflow: "hidden",
  },
  courtSvg: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  eventMarker: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    marginTop: -5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.4)",
  },
  toolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  toolbarButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  toolbarButtonText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 999,
    backgroundColor: SLATE_COLORS[100],
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${BRAND_COLORS[500]}20`,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${BRAND_COLORS[500]}30`,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  modalScore: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "monospace",
    textAlign: "center",
    marginVertical: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  overtimeDurationBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  overtimeDurationLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  overtimeDurationInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overtimeDurationTextInput: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontWeight: "bold",
  },
  overtimeDurationUnit: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalActions: {
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecondaryButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
