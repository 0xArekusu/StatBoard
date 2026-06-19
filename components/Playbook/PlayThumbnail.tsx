import React from "react";
import Svg, { Rect, Path, Line, Circle, G, Text as SvgText, Defs, Marker } from "react-native-svg";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../../src/theme";
import { PlayScene, DrawingStroke } from "../../src/models/PlayTypes";

interface Props {
  scene: PlayScene;
  width: number;
  height: number;
}

export default function PlayThumbnail({ scene, width, height }: Props) {
  const { isDark } = useTheme();

  const bg   = isDark ? SLATE_COLORS[900] : "#2d5a3d";
  const line = isDark ? SLATE_COLORS[600] : "rgba(255,255,255,0.45)";
  const hoop = "#f97316";

  const strokeColors = Array.from(new Set(scene.drawings.map((s) => s.color)));

  return (
    <Svg width={width} height={height} viewBox="0 0 100 85">
      <Defs>
        {strokeColors.map((c) => (
          <Marker
            key={c}
            id={`th-${c.replace("#", "")}`}
            viewBox="0 0 10 10"
            refX="8" refY="5"
            markerWidth="4" markerHeight="4"
            orient="auto"
          >
            <Path d="M 0 1 L 9 5 L 0 9 Z" fill={c} />
          </Marker>
        ))}
      </Defs>

      {/* Court background */}
      <Rect x="0" y="0" width="100" height="85" fill={bg} />
      <Rect x="0.5" y="0.5" width="99" height="84" fill="none" stroke={line} strokeWidth="1.2" />

      {/* 3-point arc */}
      <Line x1="8" y1="0" x2="8" y2="14" stroke={line} strokeWidth="1.2" />
      <Line x1="92" y1="0" x2="92" y2="14" stroke={line} strokeWidth="1.2" />
      <Path d="M 8 14 A 42 42 0 0 0 92 14" fill="none" stroke={line} strokeWidth="1.2" />

      {/* Key */}
      <Rect x="36" y="0" width="28" height="32" fill="none" stroke={line} strokeWidth="1" />
      <Path d="M 36 32 A 14 14 0 0 0 64 32" fill="none" stroke={line} strokeWidth="1" />

      {/* Hoop */}
      <Circle cx="50" cy="15" r="2.8" fill="none" stroke={hoop} strokeWidth="1.4" />

      {/* Drawings */}
      {scene.drawings.map((stroke) => renderStroke(stroke))}

      {/* Tokens */}
      {Object.entries(scene.positions).map(([key, pos]) => {
        if (key === "BALL") {
          return <Circle key={key} cx={pos.x} cy={pos.y} r="3.2" fill="#f97316" />;
        }
        const isDef = key.startsWith("D");
        const num   = key.replace("A", "").replace("D", "");
        return (
          <G key={key}>
            <Circle
              cx={pos.x} cy={pos.y} r="5.5"
              fill={isDef ? "#dc2626" : "#4f46e5"}
              stroke={isDef ? "#f87171" : "#818cf8"}
              strokeWidth="1"
            />
            <SvgText
              x={pos.x} y={pos.y + 2.5}
              fontSize="5" fontWeight="bold"
              fill="white" textAnchor="middle"
            >
              {isDef ? `D${num}` : num}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function renderStroke(stroke: DrawingStroke) {
  const { id, type, points, color, width } = stroke;
  if (points.length < 2) return null;

  const start  = points[0];
  const end    = points[points.length - 1];
  const marker = `url(#th-${color.replace("#", "")})`;

  if (type === "pass") {
    return (
      <Line key={id}
        x1={start.x} y1={start.y} x2={end.x} y2={end.y}
        stroke={color} strokeWidth={width} strokeDasharray="3,2"
        markerEnd={marker}
      />
    );
  }

  if (type === "drive") {
    return (
      <Line key={id}
        x1={start.x} y1={start.y} x2={end.x} y2={end.y}
        stroke={color} strokeWidth={width}
        markerEnd={marker}
      />
    );
  }

  if (type === "screen") {
    const dx  = end.x - start.x;
    const dy  = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const barHalf = 4;
    const px = (-dy / len) * barHalf;
    const py = (dx / len) * barHalf;
    return (
      <G key={id}>
        <Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} />
        <Line
          x1={end.x - px} y1={end.y - py}
          x2={end.x + px} y2={end.y + py}
          stroke={color} strokeWidth={width * 1.8} strokeLinecap="round"
        />
      </G>
    );
  }

  if (type === "pencil") {
    const d = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
    return (
      <Path key={id} d={d} fill="none" stroke={color} strokeWidth={width}
        strokeLinecap="round" strokeLinejoin="round" />
    );
  }

  return null;
}
