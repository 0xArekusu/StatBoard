import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, Image } from "react-native";

interface CoachEditModalProps {
  visible: boolean;
  coachName: string;
  coachPhotoUrl?: string;
  onConfirm: (name: string, photoUrl?: string) => void;
  onCancel: () => void;
}

export default function CoachEditModal({
  visible,
  coachName,
  coachPhotoUrl,
  onConfirm,
  onCancel,
}: CoachEditModalProps) {
  const [editName, setEditName] = useState(coachName);
  const [photoUrl, setPhotoUrl] = useState(coachPhotoUrl);

  // Reset fields when modal opens
  useEffect(() => {
    if (visible) {
      setEditName(coachName);
      setPhotoUrl(coachPhotoUrl);
    }
  }, [visible, coachName, coachPhotoUrl]);

  const handleConfirm = () => {
    if (editName.trim() === "") {
      alert("Le nom ne peut pas être vide");
      return;
    }
    onConfirm(editName.trim(), photoUrl);
  };

  const isValid = editName.trim() !== "";

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
          {/* Avatar rond avec photo ou C pour Coach (non cliquable) */}
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
              overflow: "hidden",
            }}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontSize: 40, color: "#666", fontWeight: "bold" }}>
                C
              </Text>
            )}
          </View>

          {/* Name field */}
          <TextInput
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 16,
              width: 240,
              marginBottom: 32,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "500",
              backgroundColor: "#fafafa",
            }}
            value={editName}
            onChangeText={setEditName}
            placeholder="Nom du coach"
            maxLength={30}
          />

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#f5f5f5",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#ddd",
                minWidth: 100,
                alignItems: "center",
              }}
              onPress={onCancel}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: "#666",
                }}
              >
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: isValid ? "#1976d2" : "#ccc",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                minWidth: 100,
                alignItems: "center",
              }}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: "#fff",
                }}
              >
                Confirmer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
