import React from "react";
import { View } from "react-native";
import Svg, { Line, Circle, G, Text as SvgText, Defs, Marker, Path } from "react-native-svg";
import { useClub } from "../../src/contexts/ClubContext";
import { DEFAULT_COURT_COLORS } from "../../src/theme/colors";
import { PlayScene, DrawingStroke, CourtMode } from "../../src/models/PlayTypes";
import { getPlaybookViewBox } from "../../constants/courtConstants";
import BasketballCourtSVG from "../BasketballCourtSVG";

interface Props {
  scene: PlayScene;
  mode: CourtMode;
  width: number;
  height: number;
}

export default function PlayThumbnail({ scene, mode, width, height }: Props) {
  const { currentClub } = useClub();

  const bg   = currentClub?.courtBackgroundColor ?? DEFAULT_COURT_COLORS.background;
  const line = currentClub?.courtLineColor ?? DEFAULT_COURT_COLORS.line;

  const { vbW, vbH } = getPlaybookViewBox(mode);
  const strokeColors = Array.from(new Set(scene.drawings.map((s) => s.color)));

  return (
    <View style={{ width, height }}>
      <BasketballCourtSVG
        width={width}
        height={height}
        mode={mode}
        backgroundColor={bg}
        lineColor={line}
        logoUri={currentClub?.logoUrl ?? null}
      />

      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          {strokeColors.map((c) => (
            <Marker
              key={c}
              id={`th-${c.replace("#", "")}`}
              viewBox="0 0 10 10"
              refX="4" refY="5"
              markerWidth="4" markerHeight="4"
              orient="auto"
            >
              <Path d="M 0 1 L 9 5 L 0 9 Z" fill={c} />
            </Marker>
          ))}
        </Defs>

        {scene.drawings.map((stroke) => renderStroke(stroke))}

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
    </View>
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
