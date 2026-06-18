import React from "react";
import Svg, { Rect, Path, Line, Circle, G } from "react-native-svg";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../../src/theme";

// Court uses a 100×85 SVG coordinate space.
// y=0  → baseline (panier)
// y=85 → ligne de mi-terrain
// x=0..100 → gauche..droite

interface TacticalCourtSVGProps {
  width: number;
  height: number;
}

export default function TacticalCourtSVG({ width, height }: TacticalCourtSVGProps) {
  const { isDark } = useTheme();

  const bg = isDark ? SLATE_COLORS[900] : "#2d5a3d";
  const line = isDark ? SLATE_COLORS[600] : "rgba(255,255,255,0.55)";
  const hoop = "#f97316";

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 85"
      style={{ borderRadius: 16 }}
    >
      {/* Court background */}
      <Rect x="0" y="0" width="100" height="85" fill={bg} />

      {/* Outer border */}
      <Rect
        x="0.5" y="0.5" width="99" height="84"
        fill="none" stroke={line} strokeWidth="1.2"
      />

      {/* ---- 3-point arc + corners ---- */}
      {/* Left corner line */}
      <Line x1="8" y1="0" x2="8" y2="14" stroke={line} strokeWidth="1.2" />
      {/* Right corner line */}
      <Line x1="92" y1="0" x2="92" y2="14" stroke={line} strokeWidth="1.2" />
      {/* Arc (from left corner to right corner, centered at basket x=50, y=15) */}
      <Path
        d="M 8 14 A 42 42 0 0 0 92 14"
        fill="none" stroke={line} strokeWidth="1.2"
      />

      {/* ---- Key (raquette) ---- */}
      <Rect
        x="36" y="0" width="28" height="32"
        fill="none" stroke={line} strokeWidth="1"
      />
      {/* Free throw inner lane lines */}
      <Rect
        x="40" y="0" width="20" height="32"
        fill="none" stroke={line} strokeWidth="0.6" strokeDasharray="2,2"
      />

      {/* ---- Free throw arc (above) ---- */}
      <Path
        d="M 36 32 A 14 14 0 0 0 64 32"
        fill="none" stroke={line} strokeWidth="1"
      />
      {/* Free throw arc (below, dashed) */}
      <Path
        d="M 36 32 A 14 14 0 0 1 64 32"
        fill="none" stroke={line} strokeWidth="0.8" strokeDasharray="2,2"
      />

      {/* ---- Restricted area arc ---- */}
      <Path
        d="M 44.5 15 A 5.5 5.5 0 0 0 55.5 15"
        fill="none" stroke={line} strokeWidth="0.8"
      />

      {/* ---- Backboard ---- */}
      <Line x1="42" y1="10" x2="58" y2="10" stroke={line} strokeWidth="1.8" />
      {/* Backboard support */}
      <Line x1="50" y1="10" x2="50" y2="13" stroke={line} strokeWidth="1" />

      {/* ---- Hoop ---- */}
      <Circle cx="50" cy="15" r="2.8" fill="none" stroke={hoop} strokeWidth="1.4" />

      {/* ---- Half-court line & circle ---- */}
      <Path
        d="M 35 85 A 15 15 0 0 1 65 85"
        fill="none" stroke={line} strokeWidth="1"
      />
      <Path
        d="M 44 85 A 6 6 0 0 1 56 85"
        fill="none" stroke={line} strokeWidth="0.7"
      />
    </Svg>
  );
}
