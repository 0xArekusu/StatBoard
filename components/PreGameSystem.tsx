import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import PlayerEditModal from "./PlayerEditModal";
import SubstitutesManager from "./SubstitutesManager";

interface Player {
  id: number;
  num: number;
  name: string;
  isSubstitute: boolean;
}

interface Coach {
  id: number;
  name: string;
  isCoach: boolean;
}

interface PreGameSystemProps {
  visible: boolean;
  isPortrait: boolean;
  courtWidth: number;
  courtHeight: number;
  keyWidth: number;
  keyHeight: number;
  currentTeam: "A" | "B";
  setCurrentTeam: (team: "A" | "B") => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  onStartGame: () => void;
  playerEditModalVisible: boolean;
  setPlayerEditModalVisible: (visible: boolean) => void;
  editingPlayer: number | null;
  setEditingPlayer: (player: number | null) => void;
  // Propriétés pour les remplaçants
  substitutesTeamA: Player[];
  substitutesTeamB: Player[];
  onAddSubstitute: (team: "A" | "B") => void;
  onRemoveSubstitute: (team: "A" | "B") => void;
  onSubstituteEdit: (substituteId: number, team: "A" | "B") => void;
  // Propriétés pour les coachs
  coachTeamA: Coach;
  coachTeamB: Coach;
  onCoachEdit: (coachId: number, team: "A" | "B") => void;
  // Propriétés pour l'édition des joueurs
  onPlayerEditConfirm: (number: number, name: string) => void;
  onPlayerEditCancel: () => void;
}

export default function PreGameSystem({
  visible,
  isPortrait,
  courtWidth,
  courtHeight,
  keyWidth,
  keyHeight,
  currentTeam,
  setCurrentTeam,
  players,
  setPlayers,
  onStartGame,
  playerEditModalVisible,
  setPlayerEditModalVisible,
  editingPlayer,
  setEditingPlayer,
  substitutesTeamA,
  substitutesTeamB,
  onAddSubstitute,
  onRemoveSubstitute,
  onSubstituteEdit,
  coachTeamA,
  coachTeamB,
  onCoachEdit,
  onPlayerEditConfirm,
  onPlayerEditCancel,
}: PreGameSystemProps) {
  // Fonction pour calculer les positions des joueurs
  const getPlayerPosition = (playerId: number) => {
    const positions = [
      // Meneur (ID 1)
      {
        left: courtWidth / 2 - 20,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight - 50
              : courtHeight / 2 - keyHeight / 2 - 50
            : isPortrait
            ? courtHeight - keyHeight - 50
            : courtHeight / 2 + keyHeight / 2 + 10,
      },
      // Ailier gauche (ID 2)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 - keyWidth / 2 - 40
              : courtWidth / 2 - keyWidth / 2 - 40
            : isPortrait
            ? courtWidth / 2 - keyWidth / 2 - 40
            : courtWidth / 2 + keyWidth / 2 + 40,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight
              : courtHeight / 2 - keyHeight / 2
            : isPortrait
            ? courtHeight - keyHeight
            : courtHeight / 2 + keyHeight / 2,
      },
      // Ailier droit (ID 3)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 + keyWidth / 2
              : courtWidth / 2 + keyWidth / 2
            : isPortrait
            ? courtWidth / 2 + keyWidth / 2
            : courtWidth / 2 - keyWidth / 2,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight
              : courtHeight / 2 - keyHeight / 2
            : isPortrait
            ? courtHeight - keyHeight
            : courtHeight / 2 + keyHeight / 2,
      },
      // Intérieur gauche (ID 4)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 - keyWidth / 4 - 30
              : courtWidth / 2 - keyWidth / 4 - 30
            : isPortrait
            ? courtWidth / 2 - keyWidth / 4 - 30
            : courtWidth / 2 + keyWidth / 4 + 30,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight + keyHeight / 2
              : courtHeight / 2 - keyHeight / 4
            : isPortrait
            ? courtHeight - keyHeight - keyHeight / 2
            : courtHeight / 2 + keyHeight / 4,
      },
      // Intérieur droit (ID 5)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 + keyWidth / 4 + 10
              : courtWidth / 2 + keyWidth / 4 + 10
            : isPortrait
            ? courtWidth / 2 + keyWidth / 4 + 10
            : courtWidth / 2 - keyWidth / 4 - 10,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight + keyHeight / 2
              : courtHeight / 2 - keyHeight / 4
            : isPortrait
            ? courtHeight - keyHeight - keyHeight / 2
            : courtHeight / 2 + keyHeight / 4,
      },
    ];

    return positions[playerId - 1] || positions[0];
  };

  const handlePlayerEdit = (playerId: number) => {
    setEditingPlayer(playerId);
    setPlayerEditModalVisible(true);
  };

  const handlePlayerEditConfirm = (newNumber: number, newName: string) => {
    if (editingPlayer !== null) {
      setPlayers(
        players.map((player) =>
          player.id === editingPlayer
            ? { ...player, num: newNumber, name: newName }
            : player
        )
      );
    }
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  const handlePlayerEditCancel = () => {
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  if (!visible) return null;

  return (
    <>
      <PlayerEditModal
        visible={playerEditModalVisible}
        playerNumber={
          editingPlayer
            ? players.find((p) => p.id === editingPlayer)?.num || 0
            : 0
        }
        playerName={
          editingPlayer
            ? players.find((p) => p.id === editingPlayer)?.name || ""
            : ""
        }
        onConfirm={handlePlayerEditConfirm}
        onCancel={handlePlayerEditCancel}
      />

      {/* Flèches pour switcher de côté */}
      <View
        style={{
          position: "absolute",
          top: isPortrait ? "50%" : "90%",
          left: isPortrait ? "10%" : "50%",
          transform: [
            { translateX: isPortrait ? -24 : -55 },
            { translateY: isPortrait ? -64 : -25 },
          ],
          zIndex: 300,
          flexDirection: isPortrait ? "column" : "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor:
              currentTeam === "A" ? "#4CAF50" : "rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: 12,
            marginBottom: isPortrait ? 6 : 0,
            marginRight: isPortrait ? 0 : 6,
            borderWidth: 2,
            borderColor:
              currentTeam === "A" ? "#388E3C" : "rgba(255,255,255,0.5)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setCurrentTeam("A")}
        >
          <Text
            style={{
              fontSize: 24,
              color: currentTeam === "A" ? "#fff" : "rgba(255,255,255,0.8)",
              fontWeight: "bold",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {isPortrait ? "▲" : "◀"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor:
              currentTeam === "B" ? "#4CAF50" : "rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: 12,
            borderWidth: 2,
            borderColor:
              currentTeam === "B" ? "#388E3C" : "rgba(255,255,255,0.5)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setCurrentTeam("B")}
        >
          <Text
            style={{
              fontSize: 24,
              color: currentTeam === "B" ? "#fff" : "rgba(255,255,255,0.8)",
              fontWeight: "bold",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {isPortrait ? "▼" : "▶"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pastilles des joueurs */}
      {players.map((player) => (
        <View key={player.id}>
          <TouchableOpacity
            onPress={() => {
              setEditingPlayer(player.id);
              setPlayerEditModalVisible(true);
            }}
            style={{
              position: "absolute",
              left: getPlayerPosition(player.id).left,
              top: getPlayerPosition(player.id).top,
              width: 40,
              height: 40,
              backgroundColor: "#1976d2",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 200,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {player.num}
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              position: "absolute",
              left: getPlayerPosition(player.id).left - 10,
              top: getPlayerPosition(player.id).top + 45,
              color: "#fff",
              fontSize: 12,
              fontWeight: "bold",
              textAlign: "center",
              width: 60,
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
              zIndex: 200,
            }}
          >
            {player.name}
          </Text>
        </View>
      ))}

      {/* Gestionnaire des remplaçants */}
      <SubstitutesManager
        substitutes={currentTeam === "A" ? substitutesTeamA : substitutesTeamB}
        coach={currentTeam === "A" ? coachTeamA : coachTeamB}
        onSubstituteEdit={(id) => onSubstituteEdit(id, currentTeam)}
        onCoachEdit={(id) => onCoachEdit(id, currentTeam)}
        onAddSubstitute={() => onAddSubstitute(currentTeam)}
        onRemoveSubstitute={() => onRemoveSubstitute(currentTeam)}
        currentTeam={currentTeam}
        teamLetter={currentTeam}
        maxSubstitutes={8}
      />

      {/* Bouton démarrer le match */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: "#FF6B35",
          borderRadius: 25,
          paddingVertical: 12,
          paddingHorizontal: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 300,
        }}
        onPress={onStartGame}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            textShadowColor: "rgba(0,0,0,0.3)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}
        >
          🏀 Démarrer le match
        </Text>
      </TouchableOpacity>

      {/* Modal d'édition des joueurs */}
      <PlayerEditModal
        visible={playerEditModalVisible}
        playerNumber={
          editingPlayer
            ? (() => {
                // Chercher dans les titulaires
                const playerInStarters = players.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.num;

                // Chercher dans les remplaçants
                const substitutes =
                  currentTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const playerInSubstitutes = substitutes.find(
                  (p) => p.id === editingPlayer
                );
                return playerInSubstitutes?.num || 0;
              })()
            : 0
        }
        playerName={
          editingPlayer
            ? (() => {
                // Chercher dans les titulaires
                const playerInStarters = players.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.name;

                // Chercher dans les remplaçants
                const substitutes =
                  currentTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const playerInSubstitutes = substitutes.find(
                  (p) => p.id === editingPlayer
                );
                return playerInSubstitutes?.name || "";
              })()
            : ""
        }
        onConfirm={onPlayerEditConfirm}
        onCancel={onPlayerEditCancel}
      />
    </>
  );
}
