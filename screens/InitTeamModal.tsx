import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";

interface InitTeamModalProps {
  visible: boolean;
  teamA: string;
  setTeamA: (v: string) => void;
  teamB: string;
  setTeamB: (v: string) => void;
  onConfirm: () => void;
  isConfirmDisabled: boolean;
  getFormattedDate: () => string;
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
}: InitTeamModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
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
          <Text style={{ fontSize: 16, fontWeight: "bold", marginVertical: 4 }}>
            VS
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
            value={teamB}
            onChangeText={setTeamB}
            placeholder="Nom équipe B"
            placeholderTextColor="#aaa"
          />
          <Text style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Extérieur
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: isConfirmDisabled ? "#aaa" : "#007AFF",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
              opacity: isConfirmDisabled ? 0.7 : 1,
            }}
            onPress={onConfirm}
            disabled={isConfirmDisabled}
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
