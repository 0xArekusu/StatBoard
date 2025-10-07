import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";

interface PlayerEditModalProps {
  visible: boolean;
  playerNumber: number;
  playerName: string;
  onConfirm: (newNumber: number, newName: string) => void;
  onCancel: () => void;
}

export default function PlayerEditModal({
  visible,
  playerNumber,
  playerName,
  onConfirm,
  onCancel,
}: PlayerEditModalProps) {
  const [editNumber, setEditNumber] = useState(playerNumber);
  const [editName, setEditName] = useState(playerName);

  // Reset fields when modal opens
  useEffect(() => {
    if (visible) {
      setEditNumber(playerNumber);
      setEditName(playerName);
    }
  }, [visible, playerNumber, playerName]);

  const handleConfirm = () => {
    if (editNumber < 0 || editNumber > 99) {
      alert("Le numéro doit être entre 0 et 99");
      return;
    }
    if (editName.trim() === "") {
      alert("Le nom ne peut pas être vide");
      return;
    }
    onConfirm(editNumber, editName.trim());
  };

  const incrementNumber = () => {
    if (editNumber < 99) {
      setEditNumber(editNumber + 1);
    }
  };

  const decrementNumber = () => {
    if (editNumber > 0) {
      setEditNumber(editNumber - 1);
    }
  };

  const handleNumberChange = (text: string) => {
    // Allow only digits
    const numericValue = text.replace(/[^0-9]/g, "");
    if (numericValue === "") {
      setEditNumber(0);
    } else {
      const number = parseInt(numericValue);
      if (number >= 0 && number <= 99) {
        setEditNumber(number);
      } else if (number > 99) {
        setEditNumber(99);
      }
    }
  };

  const isValid = editNumber >= 0 && editNumber <= 99 && editName.trim() !== "";

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
            borderRadius: 20,
            padding: 32,
            minWidth: 320,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {/* Avatar rond avec bonhomme */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#f0f0f0",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 3,
              borderColor: "#e0e0e0",
            }}
          >
            <Text style={{ fontSize: 40, color: "#bbb" }}>👤</Text>
          </View>

          {/* Name field without label */}
          <TextInput
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 16,
              width: 240,
              marginBottom: 24,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "500",
              backgroundColor: "#fafafa",
            }}
            value={editName}
            onChangeText={setEditName}
            placeholder="Nom du joueur"
            maxLength={20}
          />

          {/* Numeric field with + and - buttons */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 16,
                color: "#666",
                marginBottom: 12,
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Numéro
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: editNumber > 0 ? "#2196F3" : "#ccc",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={decrementNumber}
                disabled={editNumber <= 0}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 24,
                    fontWeight: "bold",
                    lineHeight: 24,
                  }}
                >
                  −
                </Text>
              </TouchableOpacity>

              <TextInput
                style={{
                  minWidth: 60,
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: "#f8f8f8",
                  borderWidth: 2,
                  borderColor: "#e0e0e0",
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#333",
                }}
                value={editNumber.toString()}
                onChangeText={handleNumberChange}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus={true}
              />

              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: editNumber < 99 ? "#2196F3" : "#ccc",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={incrementNumber}
                disabled={editNumber >= 99}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                    lineHeight: 20,
                  }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: "#e0e0e0",
              }}
              onPress={onCancel}
            >
              <Text style={{ color: "#666", fontWeight: "600", fontSize: 16 }}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: isValid ? "#4CAF50" : "#aaa",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
                opacity: isValid ? 1 : 0.7,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
                Confirmer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
