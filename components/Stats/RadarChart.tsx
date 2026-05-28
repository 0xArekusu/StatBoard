import React from 'react';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useTheme } from '../../src/contexts/ThemeContext';
import { COMMON_COLORS } from '../../src/theme';
import { PlayerSeasonData } from '../../src/services/seasonStats';

interface RadarChartProps {
  player: PlayerSeasonData;
  size?: number;
}

const AXES = ['PTS', 'REB', 'AST', 'INT', 'CTR', 'ÉVAL', '%TIR'];
const N = AXES.length;
const REFS = [30, 10, 10, 10, 10, 20, 1.0];
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];

function getValues(player: PlayerSeasonData): number[] {
  const n = player.matchesPlayed || 1;
  const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
  return [
    Math.max(0, Math.min(player.avgPts / REFS[0], 1)),
    Math.max(0, Math.min(player.avgReb / REFS[1], 1)),
    Math.max(0, Math.min(player.avgAst / REFS[2], 1)),
    Math.max(0, Math.min((player.stl / n) / REFS[3], 1)),
    Math.max(0, Math.min((player.blk / n) / REFS[4], 1)),
    Math.max(0, Math.min(player.avgEff / REFS[5], 1)),
    Math.max(0, Math.min(fgPct / REFS[6], 1)),
  ];
}

export default function RadarChart({ player, size = 140 }: RadarChartProps) {
  const { colors } = useTheme();

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.50;
  const lr = size * 0.62;
  const fs = Math.max(7, Math.round(size * 0.065));
  const pad = Math.round(size * 0.22);
  const vb = `${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}`;

  function ang(i: number) {
    return (i / N) * 2 * Math.PI - Math.PI / 2;
  }

  function pt(i: number, t: number) {
    const a = ang(i);
    return { x: cx + r * t * Math.cos(a), y: cy + r * t * Math.sin(a) };
  }

  function poly(vals: number[]) {
    return vals.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');
  }

  const values = getValues(player);

  return (
    <Svg width={size} height={size} viewBox={vb}>
      {/* Concentric rings — visible against dark bg */}
      {GRID_LEVELS.map((t, i) => (
        <Polygon
          key={i}
          points={poly(Array(N).fill(t))}
          fill="none"
          stroke={COMMON_COLORS.white}
          strokeWidth={t === 1.0 ? 1.4 : 0.8}
          strokeOpacity={t === 1.0 ? 0.7 : 0.4}
        />
      ))}

      {/* Radial spokes */}
      {Array.from({ length: N }, (_, i) => {
        const p = pt(i, 1);
        return (
          <Line
            key={i}
            x1={cx} y1={cy}
            x2={p.x} y2={p.y}
            stroke={COMMON_COLORS.white}
            strokeWidth={0.8}
            strokeOpacity={0.4}
          />
        );
      })}

      {/* Player polygon */}
      <Polygon
        points={poly(values)}
        fill={colors.primary + '33'}
        stroke={colors.primary}
        strokeWidth={1.5}
      />

      {/* Vertex dots */}
      {values.map((v, i) => {
        const p = pt(i, v);
        return <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={colors.primary} />;
      })}

      {/* Labels */}
      {AXES.map((label, i) => {
        const a = ang(i);
        return (
          <SvgText
            key={i}
            x={cx + lr * Math.cos(a)}
            y={cy + lr * Math.sin(a) + fs * 0.38}
            textAnchor="middle"
            fontSize={fs}
            fontWeight="600"
            fill={COMMON_COLORS.white}
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
