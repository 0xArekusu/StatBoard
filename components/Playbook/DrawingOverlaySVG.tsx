import React from "react";
import Svg, { G, Line, Path, Defs, Marker } from "react-native-svg";
import { DrawingStroke, DrawingPoint, DrawingTool } from "../../src/models/PlayTypes";

// Coordinate space: 100 × 85 (matches court viewBox)

interface Props {
  width: number;
  height: number;
  drawings: DrawingStroke[];
  livePoints: DrawingPoint[];
  liveTool: Exclude<DrawingTool, "move">;
  liveColor: string;
}

export default function DrawingOverlaySVG({
  width,
  height,
  drawings,
  livePoints,
  liveTool,
  liveColor,
}: Props) {
  // Collect unique colors to define arrowhead markers once
  const colors = Array.from(
    new Set([...drawings.map((s) => s.color), liveColor])
  );

  const liveStroke: DrawingStroke | null =
    livePoints.length >= 2
      ? { id: "__live__", type: liveTool, points: livePoints, color: liveColor, width: 3 }
      : null;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 85"
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      <Defs>
        {colors.map((c) => (
          <Marker
            key={c}
            id={markerId(c)}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <Path d="M 0 1 L 9 5 L 0 9 Z" fill={c} />
          </Marker>
        ))}
      </Defs>

      {drawings.map((stroke) => renderStroke(stroke))}
      {liveStroke && renderStroke(liveStroke)}
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function markerId(color: string) {
  return `arrow-${color.replace("#", "")}`;
}

function renderStroke(stroke: DrawingStroke) {
  const { id, type, points, color, width } = stroke;
  if (points.length < 2) return null;

  const start = points[0];
  const end = points[points.length - 1];

  if (type === "pass") {
    return (
      <G key={id}>
        <Line
          x1={start.x} y1={start.y}
          x2={end.x} y2={end.y}
          stroke={color}
          strokeWidth={width}
          strokeDasharray="3,2"
          markerEnd={`url(#${markerId(color)})`}
        />
      </G>
    );
  }

  if (type === "drive") {
    return (
      <G key={id}>
        <Line
          x1={start.x} y1={start.y}
          x2={end.x} y2={end.y}
          stroke={color}
          strokeWidth={width}
          markerEnd={`url(#${markerId(color)})`}
        />
      </G>
    );
  }

  if (type === "screen") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    // Perpendicular bar at the end of the line
    const barHalf = 4;
    const px = (-dy / len) * barHalf;
    const py = (dx / len) * barHalf;

    return (
      <G key={id}>
        <Line
          x1={start.x} y1={start.y}
          x2={end.x} y2={end.y}
          stroke={color}
          strokeWidth={width}
        />
        <Line
          x1={end.x - px} y1={end.y - py}
          x2={end.x + px} y2={end.y + py}
          stroke={color}
          strokeWidth={width * 1.8}
          strokeLinecap="round"
        />
      </G>
    );
  }

  // pencil — freehand polyline
  if (type === "pencil") {
    const d = points
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
      .join(" ");
    return (
      <Path
        key={id}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  return null;
}
