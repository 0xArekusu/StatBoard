import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";

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
}: InitTeamModalProps) {
  const [selectedTeamMode, setSelectedTeamMode] = React.useState<
    "A" | "B" | "both" | null
  >(null);

  const isFullyDisabled = isConfirmDisabled || selectedTeamMode === null;

  // Function to swap team names
  const swapTeams = () => {
    const tempTeamA = teamA;
    setTeamA(teamB);
    setTeamB(tempTeamA);
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
              <Text style={{ fontSize: 14, color: "#666", fontWeight: "bold" }}>
                ⇅
              </Text>
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
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
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
                  selectedTeamMode === option.key ? "#1976d2" : "#ddd",
                minWidth: 250,
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
                    selectedTeamMode === option.key ? "#1976d2" : "#ddd",
                  backgroundColor:
                    selectedTeamMode === option.key ? "#1976d2" : "transparent",
                  marginRight: 10,
                }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: selectedTeamMode === option.key ? "#1976d2" : "#333",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={{
              backgroundColor: isFullyDisabled ? "#aaa" : "#007AFF",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
              opacity: isFullyDisabled ? 0.7 : 1,
              marginTop: 16,
            }}
            onPress={() => selectedTeamMode && onConfirm(selectedTeamMode)}
            disabled={isFullyDisabled}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              Confirmer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
