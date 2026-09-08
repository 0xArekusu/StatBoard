import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import { MatchEvent } from "../../constants/liveMatchConstants";
import { Player } from "../../models/Player";
import { ActionType } from "../../src/models/ActionTypes";

interface TeamFoulDrawerProps {
  visible: boolean;
  onClose: () => void;
  events: MatchEvent[];
  myTeamRoster: Player[];
  opponentRoster: Player[];
  trackOpponentStats: boolean;
  myTeamId: "HOME" | "AWAY";
  currentPeriod: number;
  myTeamName: string;
  opponentName: string;
}

function FoulDots({ count }: { count: number }) {
  const isOut = count >= 5;
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= count;
        const isLastAndOut = isOut && i === 5;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: filled
                  ? isLastAndOut
                    ? "#dc2626"
                    : "#fbbf24"
                  : "transparent",
                borderColor: filled
                  ? isLastAndOut
                    ? "#dc2626"
                    : "#fbbf24"
                  : "#444",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function PlayerFoulRow({
  jerseyNumber,
  foulCount,
}: {
  jerseyNumber: number;
  foulCount: number;
}) {
  const { colors } = useTheme();
  const isOut = foulCount >= 5;
  return (
    <View style={styles.playerRow}>
      <Text
        style={[
          styles.playerNumber,
          { color: isOut ? "#dc2626" : colors.text.primary },
        ]}
      >
        #{jerseyNumber}
      </Text>
      <FoulDots count={foulCount} />
    </View>
  );
}

export function TeamFoulDrawer({
  visible,
  onClose,
  events,
  myTeamRoster,
  opponentRoster,
  trackOpponentStats,
  myTeamId,
  currentPeriod,
  myTeamName,
  opponentName,
}: TeamFoulDrawerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const opponentTeamId = myTeamId === "HOME" ? "AWAY" : "HOME";

  const getTeamFoulsForPeriod = (teamId: "HOME" | "AWAY") =>
    events.filter(
      (e) =>
        e.action_type === ActionType.FOUL &&
        e.teamId === teamId &&
        e.period_number === currentPeriod
    ).length;

  const getPlayerFouls = (teamId: "HOME" | "AWAY", jerseyNumber: number) =>
    events.filter(
      (e) =>
        e.action_type === ActionType.FOUL &&
        e.teamId === teamId &&
        e.playerNumber === jerseyNumber
    ).length;

  const renderTeamColumn = (
    roster: Player[],
    teamId: "HOME" | "AWAY",
    teamName: string
  ) => {
    const teamFouls = getTeamFoulsForPeriod(teamId);
    const isAlert = teamFouls >= 5;

    const sorted = [...roster].sort(
      (a, b) => a.jerseyNumber - b.jerseyNumber
    );

    return (
      <View style={styles.teamColumn}>
        <Text style={[styles.teamTitle, { color: colors.text.secondary }]}>
          {teamName}
        </Text>
        <View
          style={[
            styles.teamFoulBadge,
            { borderColor: isAlert ? "#dc2626" : colors.border },
          ]}
        >
          <Text
            style={[
              styles.teamFoulBadgeText,
              { color: isAlert ? "#dc2626" : colors.text.primary },
            ]}
          >
            {teamFouls}F
          </Text>
        </View>
        <ScrollView
          style={styles.playerList}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((player) => (
            <PlayerFoulRow
              key={player.id}
              jerseyNumber={player.jerseyNumber}
              foulCount={getPlayerFouls(teamId, player.jerseyNumber)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.drawerTitle, { color: colors.text.secondary }]}>
          {t("teamFoulDrawer.title")}
        </Text>
        <View style={styles.content}>
          {myTeamId === "HOME" ? (
            <>
              {renderTeamColumn(myTeamRoster, myTeamId, myTeamName)}
              {trackOpponentStats && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  {renderTeamColumn(opponentRoster, opponentTeamId, opponentName)}
                </>
              )}
            </>
          ) : (
            <>
              {trackOpponentStats && (
                <>
                  {renderTeamColumn(opponentRoster, opponentTeamId, opponentName)}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              )}
              {renderTeamColumn(myTeamRoster, myTeamId, myTeamName)}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 36,
    maxHeight: "85%",
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  content: {
    flexDirection: "row",
    width: "100%",
    gap: 16,
  },
  teamColumn: {
    flex: 1,
    alignItems: "center",
  },
  teamTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  teamFoulBadge: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 14,
  },
  teamFoulBadgeText: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  playerList: {
    width: "100%",
    maxHeight: 480,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    gap: 10,
  },
  playerNumber: {
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "900",
    minWidth: 36,
    textAlign: "right",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
  },
});
