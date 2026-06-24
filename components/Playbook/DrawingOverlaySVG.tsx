import React from "react";
import Svg, { G, Line, Path } from "react-native-svg";
import { DrawingStroke, DrawingPoint, DrawingTool } from "../../src/models/PlayTypes";


interface Props {
  width: number;
  height: number;
  drawings: DrawingStroke[];
  livePoints: DrawingPoint[];
  liveTool: Exclude<DrawingTool, "move">;
  liveColor: string;
}

export default function DrawingOverlaySVG({
  width, height, drawings, livePoints, liveTool, liveColor,
}: Props) {
  const liveStroke: DrawingStroke | null =
    livePoints.length >= 2
      ? { id: "__live__", type: liveTool, points: livePoints, color: liveColor, width: 1.5 }
      : null;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 85"
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {drawings.map((stroke) => renderStroke(stroke))}
      {liveStroke && renderStroke(liveStroke)}
    </Svg>
  );
}

function renderStroke(stroke: DrawingStroke) {
  const { id, type, points, color, width } = stroke;
  if (points.length < 2) return null;

  const start = points[0];
  const end   = points[points.length - 1];

  if (type === DrawingTool.Pass || type === DrawingTool.Drive) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    const nx = dx / len;
    const ny = dy / len;

    // Arrowhead triangle: tip at end, base 4 units back, half-width 2 units
    const arrowLen  = 4;
    const arrowHalf = 2;
    const tipX = end.x;
    const tipY = end.y;
    const bx = end.x - arrowLen * nx;
    const by = end.y - arrowLen * ny;
    const p1x = bx + (-ny) * arrowHalf;
    const p1y = by +   nx  * arrowHalf;
    const p2x = bx - (-ny) * arrowHalf;
    const p2y = by -   nx  * arrowHalf;

    return (
      <G key={id}>
        <Line
          x1={start.x} y1={start.y}
          x2={bx} y2={by}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={type === DrawingTool.Pass ? "3,2" : undefined}
          strokeLinecap="round"
        />
        <Path
          d={`M ${tipX} ${tipY} L ${p1x} ${p1y} L ${p2x} ${p2y} Z`}
          fill={color}
        />
      </G>
    );
  }

  if (type === DrawingTool.Screen) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    const barHalf = 2.5;
    const px = (-dy / len) * barHalf;
    const py = ( dx / len) * barHalf;

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
          strokeWidth={width * 1.2}
          strokeLinecap="round"
        />
      </G>
    );
  }

  if (type === DrawingTool.Pencil) {
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
