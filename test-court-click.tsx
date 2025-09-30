import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BasketballCourtSVG from './components/BasketballCourtSVG';

interface ClickMarker {
  id: string;
  // Coordonnées SVG sémantiques (invariantes selon orientation/écran)
  svgX: number;
  svgY: number;
  // Données pour debug
  originalScreenX: number;
  originalScreenY: number;
  originalOrientation: 'portrait' | 'landscape';
}

export default function TestCourtClick() {
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([]);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const insets = useSafeAreaInsets();

  // Écouter les changements d'orientation
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newIsPortrait = window.height > window.width;
      console.log(`🔄 CHANGEMENT D'ORIENTATION: ${dimensions.height > dimensions.width ? 'Portrait' : 'Paysage'} → ${newIsPortrait ? 'Portrait' : 'Paysage'}`);
      console.log(`📐 Anciennes dimensions: ${dimensions.width}x${dimensions.height}`);
      console.log(`📐 Nouvelles dimensions: ${window.width}x${window.height}`);

      setDimensions(window);

      // Logs des marqueurs existants pour debugging
      if (clickMarkers.length > 0) {
        console.log(`🎯 Repositionnement de ${clickMarkers.length} marqueurs:`);
        clickMarkers.forEach((marker, index) => {
          console.log(`  Marqueur ${index + 1}:`, {
            id: marker.id.slice(-6),
            originalOrientation: marker.originalOrientation,
            screenOriginal: { x: marker.originalScreenX.toFixed(1), y: marker.originalScreenY.toFixed(1) },
            svg: { x: marker.svgX.toFixed(1), y: marker.svgY.toFixed(1) }
          });
        });
      }
    });

    return () => subscription?.remove();
  }, [dimensions, clickMarkers]);

  // Calculer les dimensions réelles du terrain avec les insets
  const courtWidth = dimensions.width;
  const courtHeight = dimensions.height - insets.top - insets.bottom;
  const isPortrait = dimensions.height > dimensions.width;

  // Dimensions SVG selon l'orientation
  const SVG_WIDTH = isPortrait ? 615.75 : 1146.749971;
  const SVG_HEIGHT = isPortrait ? 1146.749971 : 615.75;

  // Convertir coordonnées SVG (normalisées en portrait) → écran
  const convertSvgToScreen = (
    portraitSvgX: number,
    portraitSvgY: number,
    debugIndex?: number
  ) => {
    // Les coordonnées sont stockées en mode portrait, il faut les convertir selon l'orientation actuelle
    let svgX = portraitSvgX;
    let svgY = portraitSvgY;

    // Si on est en paysage, transformer portrait coords -> landscape coords
    if (!isPortrait) {
      // Portrait (x, y) -> Landscape (y, 615.75 - x)
      const landscapeX = portraitSvgY;
      const landscapeY = 615.75 - portraitSvgX;
      svgX = landscapeX;
      svgY = landscapeY;
    }

    // Le SVG s'affiche en "width: 100%, height: 100%" donc il scale proportionnellement
    const scaleX = courtWidth / SVG_WIDTH;
    const scaleY = courtHeight / SVG_HEIGHT;

    const result = {
      x: svgX * scaleX,
      y: svgY * scaleY + insets.top
    };

    if (debugIndex !== undefined) {
      console.log(`🎯 Conversion marqueur ${debugIndex + 1}:`, {
        orientation: isPortrait ? 'Portrait' : 'Paysage',
        portraitSvg: { x: portraitSvgX.toFixed(1), y: portraitSvgY.toFixed(1) },
        currentSvg: { x: svgX.toFixed(1), y: svgY.toFixed(1) },
        svgDimensions: { w: SVG_WIDTH, h: SVG_HEIGHT },
        courtDimensions: { w: courtWidth, h: courtHeight },
        scale: { x: scaleX.toFixed(3), y: scaleY.toFixed(3) },
        screenCoords: { x: result.x.toFixed(1), y: result.y.toFixed(1) }
      });
    }

    return result;
  };

  const handleCourtPress = (svgX: number, svgY: number, screenX: number, screenY: number) => {
    console.log(`🎯 Clic détecté - SVG: (${svgX.toFixed(2)}, ${svgY.toFixed(2)}) - Écran: (${screenX.toFixed(2)}, ${screenY.toFixed(2)}) (${isPortrait ? 'Portrait' : 'Paysage'})`);

    // Créer un nouveau marqueur avec coordonnées SVG sémantiques
    const newMarker: ClickMarker = {
      id: `${Date.now()}-${Math.random()}`,
      svgX,
      svgY,
      originalScreenX: screenX,
      originalScreenY: screenY,
      originalOrientation: isPortrait ? 'portrait' : 'landscape',
    };

    setLastClick({ x: svgX, y: svgY });
    setClickMarkers(prev => [...prev, newMarker]);
  };

  const clearMarkers = () => {
    setClickMarkers([]);
    setLastClick(null);
  };

  return (
    <View style={styles.fullscreenContainer}>
      {/* Terrain en plein écran */}
      <BasketballCourtSVG
        width={courtWidth}
        height={courtHeight}
        onCourtPress={handleCourtPress}
        backgroundColor="#fccb54"
      />

      {/* Marqueurs de clic */}
      {clickMarkers.map((marker, index) => {
        // Convertir les coordonnées SVG sémantiques → écran selon l'orientation actuelle
        const position = convertSvgToScreen(
          marker.svgX,
          marker.svgY,
          index
        );

        return (
          <View
            key={marker.id}
            style={[
              styles.clickMarker,
              {
                left: position.x - 16, // Centrer l'icône (32/2)
                top: position.y - 25,  // Centrer l'icône (50/2)
              },
            ]}
          >
            <Text style={styles.markerIcon}>❌</Text>
            <Text style={styles.markerCoords}>
              {marker.svgX.toFixed(0)},{marker.svgY.toFixed(0)}
            </Text>
            <Text style={styles.markerOrientation}>
              {marker.originalOrientation[0].toUpperCase()}
            </Text>
          </View>
        );
      })}

      {/* Bouton d'effacement en overlay */}
      {clickMarkers.length > 0 && (
        <TouchableOpacity onPress={clearMarkers} style={styles.floatingClearButton}>
          <Text style={styles.floatingClearText}>🗑️ {clickMarkers.length}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  clickMarker: {
    position: 'absolute',
    width: 32,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  markerIcon: {
    fontSize: 20,
    color: '#FF0000',
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  markerCoords: {
    fontSize: 8,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 3,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: 'bold',
  },
  markerOrientation: {
    fontSize: 7,
    color: '#FFD700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 2,
    borderRadius: 2,
    textAlign: 'center',
    marginTop: 1,
    fontWeight: 'bold',
  },
  floatingClearButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 87, 34, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 2000,
  },
  floatingClearText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});