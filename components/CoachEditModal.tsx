import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin d'accéder à vos photos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

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
          {/* Avatar rond avec photo ou C pour Coach */}
          <TouchableOpacity
            onPress={pickImage}
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
              <>
                <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 4,
                  }}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 40, color: "#666", fontWeight: "bold" }}>
                  C
                </Text>
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 4,
                  }}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </>
            )}
          </TouchableOpacity>

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
