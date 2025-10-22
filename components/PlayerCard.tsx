import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { Player, PlayerPosition } from "../models/Player";

interface PlayerCardProps {
  player?: Player;
  onSave: (data: {
    name: string;
    jerseyNumber: number;
    photoUrl?: string;
    position?: PlayerPosition;
    isStarter: boolean;
  }) => Promise<boolean> | void;
  onDelete?: () => void;
  onToggleStarter?: () => void;
  canEdit: boolean;
  canBecomeStarter?: boolean;
}

const POSITIONS = [
  { value: 1, label: "1 (PG)" },
  { value: 2, label: "2 (SG)" },
  { value: 3, label: "3 (SF)" },
  { value: 4, label: "4 (PF)" },
  { value: 5, label: "5 (C)" },
];

export default function PlayerCard({
  player,
  onSave,
  onDelete,
  onToggleStarter,
  canEdit,
  canBecomeStarter = true,
}: PlayerCardProps) {
  const [name, setName] = useState(player?.name || "");
  const [jerseyNumber, setJerseyNumber] = useState(
    player?.jerseyNumber?.toString() || ""
  );
  const [photoUrl, setPhotoUrl] = useState(player?.photoUrl);
  const [position, setPosition] = useState<PlayerPosition | undefined>(
    player?.position
  );
  const [isStarter, setIsStarter] = useState(player?.isStarter || false);
  const [isEditing, setIsEditing] = useState(!player);

  // Sync with player prop changes
  useEffect(() => {
    if (player) {
      setName(player.name);
      setJerseyNumber(player.jerseyNumber.toString());
      setPhotoUrl(player.photoUrl);
      setPosition(player.position);
      setIsStarter(player.isStarter);
    }
  }, [player]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom du joueur est requis");
      return;
    }

    const number = parseInt(jerseyNumber);
    if (isNaN(number) || number < 0 || number > 99) {
      Alert.alert("Erreur", "Le numéro doit être entre 0 et 99");
      return;
    }

    const result = onSave({
      name: name.trim(),
      jerseyNumber: number,
      photoUrl,
      position,
      isStarter,
    });

    // If onSave returns a promise, wait for it
    if (result instanceof Promise) {
      const success = await result;
      if (success) {
        setIsEditing(false);
      }
    } else {
      // For new players (no validation needed)
      if (!player) {
        setName("");
        setJerseyNumber("");
        setPhotoUrl(undefined);
        setPosition(undefined);
        setIsStarter(false);
      }
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setName(player?.name || "");
    setJerseyNumber(player?.jerseyNumber?.toString() || "");
    setPhotoUrl(player?.photoUrl);
    setPosition(player?.position);
    setIsStarter(player?.isStarter || false);
    setIsEditing(false);
  };

  const handleToggleStarter = () => {
    const newValue = !isStarter;
    setIsStarter(newValue);
    if (onToggleStarter) {
      onToggleStarter();
    }
  };

  return (
    <View style={[styles.card, isStarter && styles.starterCard]}>
      {/* Starter Badge */}
      {isStarter && (
        <View style={styles.starterBadge}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.starterText}>Titulaire</Text>
        </View>
      )}

      {/* Photo */}
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={canEdit && isEditing ? pickImage : undefined}
        disabled={!canEdit || !isEditing}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={40} color="#ccc" />
          </View>
        )}
        {canEdit && isEditing && (
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Player Info */}
      <View style={styles.infoContainer}>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom du joueur"
              value={name}
              onChangeText={setName}
              maxLength={30}
            />
            <TextInput
              style={[styles.input, styles.numberInput]}
              placeholder="N°"
              value={jerseyNumber}
              onChangeText={setJerseyNumber}
              keyboardType="number-pad"
              maxLength={2}
            />
          </>
        ) : (
          <>
            <Text style={styles.playerName}>{player?.name}</Text>
            <Text style={styles.playerNumber}>#{player?.jerseyNumber}</Text>
          </>
        )}

        {/* Position Selector */}
        {isEditing ? (
          <View style={styles.positionContainer}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                key={pos.value}
                style={[
                  styles.positionButton,
                  position === pos.value && styles.positionButtonSelected,
                ]}
                onPress={() => setPosition(pos.value as PlayerPosition)}
              >
                <Text
                  style={[
                    styles.positionText,
                    position === pos.value && styles.positionTextSelected,
                  ]}
                >
                  {pos.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          player?.position && (
            <Text style={styles.positionLabel}>
              Poste {player.position}
            </Text>
          )
        )}
      </View>

      {/* Actions */}
      {canEdit && (
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSave}
              >
                <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
              </TouchableOpacity>
              {player && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCancel}
                >
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleToggleStarter}
                disabled={!isStarter && !canBecomeStarter}
              >
                <Ionicons
                  name={isStarter ? "star" : "star-outline"}
                  size={28}
                  color={!isStarter && !canBecomeStarter ? "#ccc" : "#FFD700"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={28} color="#2196F3" />
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onDelete}
                >
                  <Ionicons name="trash-outline" size={28} color="#F44336" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  starterCard: {
    borderColor: "#FFD700",
    backgroundColor: "#FFFEF0",
  },
  starterBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  starterText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  infoContainer: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  numberInput: {
    width: 80,
  },
  playerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9C27B0",
    marginBottom: 8,
  },
  positionContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  positionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  positionButtonSelected: {
    borderColor: "#9C27B0",
    backgroundColor: "#9C27B0",
  },
  positionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  positionTextSelected: {
    color: "#fff",
  },
  positionLabel: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});
