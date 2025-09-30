import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BasketballCourtSVG, { CourtMarker } from "./components/BasketballCourtSVG";

// Extend CourtMarker with debug data for testing
interface ClickMarker extends CourtMarker {
  // Debug data (not needed in production, only for testing)
  originalScreenX: number;
  originalScreenY: number;
  originalOrientation: "portrait" | "landscape";
}

export default function TestCourtClick() {
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(
    null
  );
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([]);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const insets = useSafeAreaInsets();

  // Écouter les changements d'orientation
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const newIsPortrait = window.height > window.width;
      console.log(
        `🔄 CHANGEMENT D'ORIENTATION: ${
          dimensions.height > dimensions.width ? "Portrait" : "Paysage"
        } → ${newIsPortrait ? "Portrait" : "Paysage"}`
      );
      console.log(
        `📐 Anciennes dimensions: ${dimensions.width}x${dimensions.height}`
      );
      console.log(`📐 Nouvelles dimensions: ${window.width}x${window.height}`);

      setDimensions(window);

      // Logs des marqueurs existants pour debugging
      if (clickMarkers.length > 0) {
        console.log(`🎯 Repositionnement de ${clickMarkers.length} marqueurs:`);
        clickMarkers.forEach((marker, index) => {
          console.log(`  Marqueur ${index + 1}:`, {
            id: marker.id.slice(-6),
            originalOrientation: marker.originalOrientation,
            screenOriginal: {
              x: marker.originalScreenX.toFixed(1),
              y: marker.originalScreenY.toFixed(1),
            },
            svg: { x: marker.svgX.toFixed(1), y: marker.svgY.toFixed(1) },
          });
        });
      }
    });

    return () => subscription?.remove();
  }, [dimensions, clickMarkers]);

  // Calculate actual court dimensions with safe area insets
  const courtWidth = dimensions.width;
  const courtHeight = dimensions.height - insets.top - insets.bottom;
  const isPortrait = dimensions.height > dimensions.width;

  /**
   * Handle press events on the basketball court
   *
   * Receives coordinates from BasketballCourtSVG which are already normalized to portrait orientation
   * These coordinates are device/orientation-independent and can be saved to database
   */
  const handleCourtPress = (
    svgX: number,
    svgY: number,
    screenX: number,
    screenY: number
  ) => {
    console.log(
      `🎯 Click detected - SVG: (${svgX.toFixed(2)}, ${svgY.toFixed(
        2
      )}) - Screen: (${screenX.toFixed(2)}, ${screenY.toFixed(2)}) (${
        isPortrait ? "Portrait" : "Landscape"
      })`
    );

    // Create new marker with semantic SVG coordinates (normalized to portrait)
    // These coordinates work on any device/orientation - ready for database!
    const newMarker: ClickMarker = {
      id: `${Date.now()}-${Math.random()}`,
      svgX, // Normalized to portrait by BasketballCourtSVG
      svgY, // Normalized to portrait by BasketballCourtSVG
      originalScreenX: screenX,
      originalScreenY: screenY,
      originalOrientation: isPortrait ? "portrait" : "landscape",
    };

    setLastClick({ x: svgX, y: svgY });
    setClickMarkers((prev) => [...prev, newMarker]);
  };

  const clearMarkers = () => {
    setClickMarkers([]);
    setLastClick(null);
  };

  return (
    <View style={styles.fullscreenContainer}>
      {/* Full-screen basketball court with markers rendered inside SVG */}
      <BasketballCourtSVG
        width={courtWidth}
        height={courtHeight}
        onCourtPress={handleCourtPress}
        backgroundColor="#fccb54"
        markers={clickMarkers} // Pass markers to SVG - they'll be rendered natively!
      />

      {/* Clear button overlay */}
      {clickMarkers.length > 0 && (
        <TouchableOpacity
          onPress={clearMarkers}
          style={styles.floatingClearButton}
        >
          <Text style={styles.floatingClearText}>🗑️ {clickMarkers.length}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  floatingClearButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255, 87, 34, 0.9)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 2000,
  },
  floatingClearText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
