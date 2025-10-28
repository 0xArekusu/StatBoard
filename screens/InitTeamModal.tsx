import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface InitTeamModalProps {
  visible: boolean;
  teamA: string;
  setTeamA: (v: string) => void;
  teamB: string;
  setTeamB: (v: string) => void;
  onConfirm: (teamMode: "A" | "B" | "both") => void;
  isConfirmDisabled: boolean;
  getFormattedDate: () => string;
  onRequestClose: () => void;
  onBack?: () => void; // Callback to go back to team selection
  canGoBack?: boolean; // Show back button only if team was selected
  onGoToMenu?: () => void; // Callback to go to menu (if no team selected)
  hasClubTeam?: boolean; // Whether user has selected a club team
}

export default function InitTeamModal({
  visible,
  teamA,
  setTeamA,
  teamB,
  setTeamB,
  onConfirm,
  isConfirmDisabled,
  getFormattedDate,
  onRequestClose,
  onBack,
  canGoBack = false,
  onGoToMenu,
  hasClubTeam = false,
}: InitTeamModalProps) {
  const [selectedTeamMode, setSelectedTeamMode] = React.useState<
    "A" | "B" | "both" | null
  >(null);

  // Track if teams have been swapped
  const [teamsSwapped, setTeamsSwapped] = React.useState(false);

  const isFullyDisabled = isConfirmDisabled || selectedTeamMode === null;

  // Determine which team is from the club
  // Only if user has a club team (hasClubTeam), the club team depends on swap status
  // Initially club is Team A, but if swapped, club becomes Team B
  const clubTeam = hasClubTeam ? (teamsSwapped ? "B" : "A") : null;

  // Function to handle confirm
  const handleConfirm = () => {
    if (!selectedTeamMode) return;
    onConfirm(selectedTeamMode);
  };

  // Function to swap team names
  const swapTeams = () => {
    const tempTeamA = teamA;
    setTeamA(teamB);
    setTeamB(tempTeamA);
    // Toggle swap state
    setTeamsSwapped(!teamsSwapped);
    // Reset team mode selection when swapping
    setSelectedTeamMode(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 24,
            minWidth: 300,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {getFormattedDate()}
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 10,
              width: 200,
              marginBottom: 2,
              textAlign: "center",
              fontSize: 16,
            }}
            value={teamA}
            onChangeText={setTeamA}
            placeholder="Nom équipe A"
            placeholderTextColor="#aaa"
          />
          <Text style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
            Domicile
          </Text>

          {/* VS with swap button */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 4,
              width: 200,
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#f0f0f0",
                borderRadius: 20,
                padding: 4,
                borderWidth: 1,
                borderColor: "#ddd",
                minWidth: 30,
                minHeight: 30,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -25,
              }}
              onPress={swapTeams}
            >
              <MaterialCommunityIcons name="swap-vertical" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>VS</Text>
            <View style={{ width: 30 }} />
          </View>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 10,
              width: 200,
              marginBottom: 2,
              textAlign: "center",
              fontSize: 16,
            }}
            value={teamB}
            onChangeText={setTeamB}
            placeholder="Nom équipe B"
            placeholderTextColor="#aaa"
          />
          <Text style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Extérieur
          </Text>

          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>
            Quelle équipe gérez-vous ?
          </Text>

          {[
            { key: "A", label: `${teamA || "Team A"} (Domicile)` },
            { key: "B", label: `${teamB || "Team B"} (Extérieur)` },
            { key: "both", label: "Les deux équipes" },
          ].map((option) => {
            // Disable Team B if club team is Team A, disable Team A if club team is Team B
            const isDisabled = clubTeam && option.key !== clubTeam && option.key !== "both";

            return (
              <TouchableOpacity
                key={option.key}
                disabled={isDisabled}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 4,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor:
                    selectedTeamMode === option.key ? "#e3f2fd" : "transparent",
                  borderWidth: 1,
                  borderColor:
                    selectedTeamMode === option.key ? "#1976d2" : isDisabled ? "#f0f0f0" : "#ddd",
                  minWidth: 250,
                  opacity: isDisabled ? 0.4 : 1,
                }}
                onPress={() =>
                  setSelectedTeamMode(option.key as "A" | "B" | "both")
                }
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor:
                      selectedTeamMode === option.key ? "#1976d2" : isDisabled ? "#ccc" : "#ddd",
                    backgroundColor:
                      selectedTeamMode === option.key ? "#1976d2" : "transparent",
                    marginRight: 10,
                  }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: selectedTeamMode === option.key ? "#1976d2" : isDisabled ? "#aaa" : "#333",
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16, justifyContent: "center" }}>
            {canGoBack && onBack ? (
              <TouchableOpacity
                style={{
                  backgroundColor: "#f0f0f0",
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderWidth: 1,
                  borderColor: "#ddd",
                }}
                onPress={onBack}
              >
                <Text style={{ color: "#666", fontWeight: "600", fontSize: 16 }}>
                  Retour
                </Text>
              </TouchableOpacity>
            ) : null}

            {!canGoBack && onGoToMenu ? (
              <TouchableOpacity
                style={{
                  backgroundColor: "#f0f0f0",
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderWidth: 1,
                  borderColor: "#ddd",
                }}
                onPress={onGoToMenu}
              >
                <Text style={{ color: "#666", fontWeight: "600", fontSize: 16 }}>
                  Retour
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: isFullyDisabled ? "#aaa" : "#007AFF",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 32,
                opacity: isFullyDisabled ? 0.7 : 1,
              }}
              onPress={handleConfirm}
              disabled={isFullyDisabled}
            >
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                Confirmer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
