import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface LandscapeToggleButtonProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  color: string;
  backgroundColor: string;
  borderColor: string;
  /** Positionnement (top/bottom + right) propre au contexte d'utilisation */
  style: ViewStyle;
  size?: number;
  iconSize?: number;
}

/**
 * Bouton rond flottant pour replier/déplier une barre en paysage téléphone
 * (barre de score, barre d'actions...). Le positionnement est laissé au
 * composant appelant via `style` pour que le bouton reste au même endroit
 * qu'il soit replié ou déployé.
 */
export function LandscapeToggleButton({
  icon,
  onPress,
  color,
  backgroundColor,
  borderColor,
  style,
  size = 32,
  iconSize = 16,
}: LandscapeToggleButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        { width: size, height: size, backgroundColor, borderColor },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
  },
});
