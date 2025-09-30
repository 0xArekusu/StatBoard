import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import BasketballCourtSVG from './components/BasketballCourtSVG';

interface ClickMarker {
  id: string;
  // Position physique sur le terrain (peu importe l'orientation)
  physicalX: number; // 0-1 : position sur la largeur physique du terrain
  physicalY: number; // 0-1 : position sur la longueur physique du terrain
  // Données originales pour debug
  originalScreenX: number;
  originalScreenY: number;
  originalOrientation: 'portrait' | 'landscape';
}

export default function TestCourtClick() {
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const [clickMarkers, setClickMarkers] = useState<ClickMarker[]>([]);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

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
            physical: { x: marker.physicalX.toFixed(3), y: marker.physicalY.toFixed(3) }
          });
        });
      }
    });

    return () => subscription?.remove();
  }, [dimensions, clickMarkers]);

  // Taille du terrain (ajustable selon vos besoins)
  const courtWidth = dimensions.width - 40;
  const courtHeight = dimensions.height - 200;
  const courtTop = 120; // Position du terrain depuis le haut
  const isPortrait = dimensions.height > dimensions.width;

  // ALGORITHME SIMPLE : Concept d'un terrain de basket physique
  // Portrait = terrain dans le sens de la longueur (plus haut que large)
  // Paysage = terrain dans le sens de la largeur (plus large que haut)
  // La position physique reste la même, seule l'affichage change

  const convertSvgToPhysical = (
    svgX: number,
    svgY: number,
    wasPortrait: boolean
  ) => {
    // MAPPING EXACT basé sur les données réelles de correspondance
    if (wasPortrait) {
      // Portrait : référence absolue (viewBox 615.75 x 1146.749971)
      return {
        physicalX: svgX / 615.75,           // Position sur la largeur du terrain
        physicalY: svgY / 1146.749971       // Position sur la longueur du terrain
      };
    } else {
      // Paysage : conversion basée sur les correspondances réelles
      // Analyse des données :
      // Portrait (104.78, 3.68) → Paysage (178.77, 5.10) [haut-gauche]
      // Portrait (513.00, 10.65) → Paysage (966.13, 9.82) [haut-droit]
      // Portrait (509.75, 1011.99) → Paysage (966.13, 484.83) [bas-droit]
      // Portrait (106.00, 1007.16) → Paysage (174.14, 481.69) [bas-gauche]

      // Le paysage a un viewBox de 1146.749971 x 615.75
      // Mais la correspondance n'est pas une simple rotation !
      // Il faut interpoler la position dans l'espace portrait de référence

      // Convertir d'abord en coordonnées normalisées paysage
      const normalizedX = svgX / 1146.749971;
      const normalizedY = svgY / 615.75;

      // Puis mapper vers l'espace physique portrait
      // En analysant les correspondances, on voit que :
      // - X paysage → Y physique (longueur)
      // - Y paysage inversé → X physique (largeur)
      return {
        physicalX: 1 - normalizedY,  // Y paysage inversé = largeur physique
        physicalY: normalizedX       // X paysage = longueur physique
      };
    }
  };

  const convertPhysicalToScreen = (
    physicalX: number,
    physicalY: number,
    currentIsPortrait: boolean,
    courtDimensions: { width: number; height: number },
    debugIndex?: number
  ) => {
    let result;

    if (currentIsPortrait) {
      // Portrait : affichage normal
      result = {
        x: physicalX * courtDimensions.width,   // largeur physique → X écran
        y: physicalY * courtDimensions.height   // longueur physique → Y écran
      };
    } else {
      // Paysage : appliquer la rotation 90°
      result = {
        x: physicalY * courtDimensions.width,           // longueur physique → X écran
        y: (1 - physicalX) * courtDimensions.height     // largeur physique inversée → Y écran
      };
    }

    if (debugIndex !== undefined) {
      console.log(`🎯 Conversion marqueur ${debugIndex + 1}:`, {
        orientation: currentIsPortrait ? 'Portrait' : 'Paysage',
        physical: { x: physicalX.toFixed(3), y: physicalY.toFixed(3) },
        courtDimensions,
        calculatedScreen: { x: result.x.toFixed(1), y: result.y.toFixed(1) },
        formula: currentIsPortrait ?
          'Portrait: x=physX*width, y=physY*height' :
          'Paysage: x=physY*width, y=(1-physX)*height'
      });
    }

    return result;
  };

  const handleCourtPress = (svgX: number, svgY: number, screenX: number, screenY: number) => {
    console.log(`🎯 Clic détecté - SVG: (${svgX.toFixed(2)}, ${svgY.toFixed(2)}) - Écran: (${screenX.toFixed(2)}, ${screenY.toFixed(2)}) (${isPortrait ? 'Portrait' : 'Paysage'})`);

    // Log spécial pour créer une table de correspondance
    console.log(`📋 DONNÉES DE MAPPING - ${isPortrait ? 'PORTRAIT' : 'PAYSAGE'}: { svgX: ${svgX.toFixed(2)}, svgY: ${svgY.toFixed(2)} }`);

    // Convertir les coordonnées SVG en position physique sur le terrain (référence absolue)
    const physical = convertSvgToPhysical(svgX, svgY, isPortrait);

    console.log(`📍 Position physique: largeur=${physical.physicalX.toFixed(3)}, longueur=${physical.physicalY.toFixed(3)}`);

    // Créer un nouveau marqueur avec position physique
    const newMarker: ClickMarker = {
      id: `${Date.now()}-${Math.random()}`,
      physicalX: physical.physicalX,
      physicalY: physical.physicalY,
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
    <View style={styles.container}>
      <Text style={styles.title}>Test de gestion du clic sur le terrain</Text>

      <View style={styles.infoContainer}>
        {lastClick ? (
          <Text style={styles.infoText}>
            Dernier clic: x={lastClick.x.toFixed(2)}, y={lastClick.y.toFixed(2)} ({isPortrait ? 'Portrait' : 'Paysage'})
          </Text>
        ) : (
          <Text style={styles.infoText}>
            Cliquez sur le terrain pour voir les coordonnées ({isPortrait ? 'Portrait' : 'Paysage'})
          </Text>
        )}
        <View style={styles.controls}>
          <Text style={styles.counterText}>
            Clics: {clickMarkers.length}
          </Text>
          {clickMarkers.length > 0 && (
            <TouchableOpacity onPress={clearMarkers} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.courtContainer}>
        <BasketballCourtSVG
          width={courtWidth}
          height={courtHeight}
          onCourtPress={handleCourtPress}
          backgroundColor="#fccb54"
        />

        {/* Marqueurs de clic */}
        {clickMarkers.map((marker, index) => {
          // Utiliser la position physique pour recalculer selon l'orientation actuelle
          const position = convertPhysicalToScreen(
            marker.physicalX,
            marker.physicalY,
            isPortrait,
            { width: courtWidth, height: courtHeight },
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
                {marker.physicalX.toFixed(2)},{marker.physicalY.toFixed(2)}
              </Text>
              <Text style={styles.markerOrientation}>
                {marker.originalOrientation[0].toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.instruction}>
        Cliquez n'importe où sur le terrain pour tester la conversion des coordonnées.
        Les coordonnées affichées correspondent à la position dans le SVG,
        peu importe la taille de l'écran ou l'orientation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  courtContainer: {
    flex: 1,
    backgroundColor: 'green',
    borderRadius: 8,
    overflow: 'hidden',
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
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  markerCoords: {
    fontSize: 7,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    textAlign: 'center',
    marginTop: 1,
  },
  markerOrientation: {
    fontSize: 6,
    color: '#FFD700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 2,
    borderRadius: 2,
    textAlign: 'center',
    marginTop: 1,
    fontWeight: 'bold',
  },
  instruction: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.8,
  },
});