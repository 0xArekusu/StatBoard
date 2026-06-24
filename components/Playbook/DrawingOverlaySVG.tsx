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
  hideDrawings?: boolean;
}

export default function DrawingOverlaySVG({
  width, height, drawings, livePoints, liveTool, liveColor, hideDrawings,
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
      {!hideDrawings && drawings.map((stroke) => renderStroke(stroke))}
      {!hideDrawings && liveStroke && renderStroke(liveStroke)}
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPath(points: DrawingPoint[]): string {
  return points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
}

// Walk backward along the polyline from the last point, accumulating arc length,
// until we've covered arrowLen units. Returns the split point (arrowhead base)
// and the SVG path string for the line (up to and including that base point).
function splitPathForArrow(
  points: DrawingPoint[],
  arrowLen: number,
): { linePath: string; base: DrawingPoint } {
  const end = points[points.length - 1];
  let remaining = arrowLen;
  for (let i = points.length - 1; i > 0; i--) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.hypot(dx, dy);
    if (segLen >= remaining) {
      const t = remaining / segLen;
      const base: DrawingPoint = {
        x: points[i].x - t * dx,
        y: points[i].y - t * dy,
      };
      return { linePath: buildPath([...points.slice(0, i), base]), base };
    }
    remaining -= segLen;
  }
  // Stroke shorter than arrowLen: collapse line, tip at end
  return { linePath: `M ${end.x} ${end.y}`, base: end };
}

// Direction of the last meaningful segment (for Screen bar orientation).
function lastSegmentDir(points: DrawingPoint[]): { nx: number; ny: number } {
  const end = points[points.length - 1];
  for (let i = points.length - 2; i >= 0; i--) {
    const dx = end.x - points[i].x;
    const dy = end.y - points[i].y;
    const len = Math.hypot(dx, dy);
    if (len >= 0.5) return { nx: dx / len, ny: dy / len };
  }
  return { nx: 1, ny: 0 };
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderStroke(stroke: DrawingStroke) {
  const { id, type, points, color, width } = stroke;
  if (points.length < 2) return null;

  const end = points[points.length - 1];

  if (type === DrawingTool.Pass || type === DrawingTool.Drive) {
    const arrowLen  = 4;
    const arrowHalf = 2;

    const { linePath, base } = splitPathForArrow(points, arrowLen);

    // Direction base → tip (exact, not an approximation)
    const dx = end.x - base.x;
    const dy = end.y - base.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.05) return null;
    const nx = dx / len;
    const ny = dy / len;

    const p1x = base.x + (-ny) * arrowHalf;
    const p1y = base.y +   nx  * arrowHalf;
    const p2x = base.x - (-ny) * arrowHalf;
    const p2y = base.y -   nx  * arrowHalf;

    return (
      <G key={id}>
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={type === DrawingTool.Pass ? "3,2" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={`M ${end.x} ${end.y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z`}
          fill={color}
        />
      </G>
    );
  }

  if (type === DrawingTool.Screen) {
    const { nx, ny } = lastSegmentDir(points);
    const barHalf = 2.5;
    const px = (-ny) * barHalf;
    const py =   nx  * barHalf;

    return (
      <G key={id}>
        <Path
          d={buildPath(points)}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
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
    return (
      <Path
        key={id}
        d={buildPath(points)}
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
