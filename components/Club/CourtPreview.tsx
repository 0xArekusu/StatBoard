import React from "react";
import { View, StyleSheet } from "react-native";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { useTheme } from "../../src/contexts/ThemeContext";

interface CourtPreviewProps {
  backgroundColor: string;
  lineColor: string;
  logoUri?: string | null;
  width?: number;
  height?: number;
}

export default function CourtPreview({
  backgroundColor,
  lineColor,
  logoUri,
  width = 300,
  height = 400,
}: CourtPreviewProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, { width, height }]}>
      <BasketballCourtSVG
        width={width}
        height={height}
        backgroundColor={backgroundColor}
        lineColor={lineColor}
        logoUri={logoUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
