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
import { useTranslation } from "react-i18next";
import type { Player, PlayerPosition } from "../models/Player";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { useSignedUrl } from "../hooks/useSignedUrl";

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
  onCancel?: () => void;
  canEdit: boolean;
  canBecomeStarter?: boolean;
  hideJerseyNumber?: boolean;
  hidePosition?: boolean;
  hideStarter?: boolean;
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
  onCancel,
  canEdit,
  canBecomeStarter = true,
  hideJerseyNumber = false,
  hidePosition = false,
  hideStarter = false,
}: PlayerCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
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

  // Generate signed URL for photo (2h expiration)
  const signedPhotoUrl = useSignedUrl(photoUrl);

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
      Alert.alert(t("common.error"), t("playerCard.nameRequired"));
      return;
    }

    const number = parseInt(jerseyNumber);
    if (isNaN(number) || number < 0 || number > 99) {
      Alert.alert(t("common.error"), t("playerCard.numberRange"));
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
    onCancel?.();
  };

  const handleToggleStarter = () => {
    if (onToggleStarter) {
      onToggleStarter();
    }
  };

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: sp.md,
        padding: sp.md,
      },
      isStarter && [styles.starterCard, { backgroundColor: colors.surfaceVariant }]
    ]}>
      {/* Starter Badge */}
      {isStarter && (
        <View style={[
          styles.starterBadge,
          {
            backgroundColor: colors.surface,
            borderColor: "#FFD700",
            paddingHorizontal: sp.sm,
            paddingVertical: sp.xs,
            borderRadius: sp.md,
            gap: sp.xs,
          }
        ]}>
          <Ionicons name="star" size={font.md} color="#FFD700" />
          <Text style={[styles.starterText, { color: colors.text.primary, fontSize: font.xs }]}>{t("playerCard.starter")}</Text>
        </View>
      )}

      {/* Photo */}
      <TouchableOpacity
        style={[
          styles.photoContainer,
          {
            width: sizes.avatarLg,
            height: sizes.avatarLg,
            borderRadius: sizes.avatarLg / 2,
          }
        ]}
        onPress={canEdit && isEditing ? pickImage : undefined}
        disabled={!canEdit || !isEditing}
      >
        {signedPhotoUrl ? (
          <Image source={{ uri: signedPhotoUrl }} style={[styles.photo, { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: sizes.avatarLg / 2 }]} />
        ) : (
          <View style={[
            styles.photoPlaceholder,
            {
              backgroundColor: colors.surfaceVariant,
              width: sizes.avatarLg,
              height: sizes.avatarLg,
              borderRadius: sizes.avatarLg / 2,
            }
          ]}>
            <Ionicons name="person" size={sizes.avatarSm} color={colors.text.tertiary} />
          </View>
        )}
        {canEdit && isEditing && (
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={sizes.iconMd} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Player Info */}
      <View style={[styles.infoContainer, { gap: sp.sm }]}>
        {isEditing ? (
          <>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text.primary,
                  padding: sp.sm,
                  borderRadius: sp.sm,
                  fontSize: font.md,
                }
              ]}
              placeholder={t("teamRosterScreen.playerNamePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
              maxLength={30}
            />
            {!hideJerseyNumber && (
              <TextInput
                style={[
                  styles.input,
                  styles.numberInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text.primary,
                    padding: sp.sm,
                    borderRadius: sp.sm,
                    fontSize: font.md,
                    width: sizes.avatarMd,
                  }
                ]}
                placeholder="N°"
                placeholderTextColor={colors.text.tertiary}
                value={jerseyNumber}
                onChangeText={setJerseyNumber}
                keyboardType="number-pad"
                maxLength={2}
              />
            )}
          </>
        ) : (
          <>
            <Text style={[styles.playerName, { color: colors.text.primary, fontSize: font.lg }]}>{player?.name}</Text>
            {!hideJerseyNumber && (
              <Text style={[styles.playerNumber, { color: colors.button.club, fontSize: font.md }]}>#{player?.jerseyNumber}</Text>
            )}
          </>
        )}

        {/* Position Selector */}
        {!hidePosition && (
          isEditing ? (
            <View style={[styles.positionContainer, { gap: sp.xs }]}>
              {POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos.value}
                  style={[
                    styles.positionButton,
                    {
                      borderColor: colors.border,
                      paddingHorizontal: sp.sm,
                      paddingVertical: sp.xs,
                      borderRadius: sp.xs,
                    },
                    position === pos.value && [
                      styles.positionButtonSelected,
                      { borderColor: colors.button.club, backgroundColor: colors.button.club }
                    ],
                  ]}
                  onPress={() => setPosition(pos.value as PlayerPosition)}
                >
                  <Text
                    style={[
                      styles.positionText,
                      { color: colors.text.secondary, fontSize: font.xs },
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
              <Text style={[styles.positionLabel, { color: colors.text.secondary }]}>
                Poste {player.position}
              </Text>
            )
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
              {!hideStarter && (
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
              )}
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  starterCard: {
    borderColor: "#FFD700",
  },
  starterBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  starterText: {
    fontSize: 10,
    fontWeight: "bold",
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
    marginBottom: 4,
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: "600",
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
    justifyContent: "center",
    alignItems: "center",
  },
  positionButtonSelected: {
  },
  positionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  positionTextSelected: {
    color: "#fff",
  },
  positionLabel: {
    fontSize: 12,
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
