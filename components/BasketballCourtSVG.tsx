import React from "react";
import Svg, { Rect, Line, Circle, Path, G } from "react-native-svg";

interface BasketballCourtSVGProps {
  width: number;
  height: number;
}

export default function BasketballCourtSVG({
  width,
  height,
}: BasketballCourtSVGProps) {
  // Court dimensions (proportional to container)
  const courtWidth = width;
  const courtHeight = height;

  // Calculate court elements proportionally
  const isPortrait = height > width;

  // Key (paint) area dimensions
  const keyWidth = isPortrait ? courtWidth * 0.3 : courtWidth * 0.24;
  const keyHeight = isPortrait ? courtHeight * 0.24 : courtHeight * 0.3;

  // Circle dimensions
  const circleDiameter = isPortrait ? courtWidth * 0.2 : courtHeight * 0.2;
  const circleRadius = circleDiameter / 2;

  // 3-point arc dimensions
  const threePointArcWidth = isPortrait
    ? courtWidth * 0.88
    : courtHeight * 0.88;
  const threePointArcHeight = isPortrait
    ? courtHeight * 0.68
    : courtWidth * 0.38;

  return (
    <Svg
      width={courtWidth}
      height={courtHeight}
      viewBox={`0 0 ${courtWidth} ${courtHeight}`}
    >
      {/* Court background */}
      <Rect
        x={0}
        y={0}
        width={courtWidth}
        height={courtHeight}
        fill="#FF8C00"
        stroke="#FFFFFF"
        strokeWidth={4}
        rx={20}
      />

      {/* Center line */}
      {isPortrait ? (
        <Line
          x1={0}
          y1={courtHeight / 2}
          x2={courtWidth}
          y2={courtHeight / 2}
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      ) : (
        <Line
          x1={courtWidth / 2}
          y1={0}
          x2={courtWidth / 2}
          y2={courtHeight}
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      )}

      {/* Center circle */}
      <Circle
        cx={courtWidth / 2}
        cy={courtHeight / 2}
        r={circleRadius}
        fill="transparent"
        stroke="#FFFFFF"
        strokeWidth={3}
      />

      {/* Paint areas (key) */}
      {isPortrait ? (
        <G>
          {/* Top paint area */}
          <Rect
            x={courtWidth / 2 - keyWidth / 2}
            y={0}
            width={keyWidth}
            height={keyHeight}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Bottom paint area */}
          <Rect
            x={courtWidth / 2 - keyWidth / 2}
            y={courtHeight - keyHeight}
            width={keyWidth}
            height={keyHeight}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Free throw circles */}
          <Circle
            cx={courtWidth / 2}
            cy={keyHeight - circleRadius / 2}
            r={circleRadius}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          <Circle
            cx={courtWidth / 2}
            cy={courtHeight - keyHeight + circleRadius / 2}
            r={circleRadius}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </G>
      ) : (
        <G>
          {/* Left paint area */}
          <Rect
            x={0}
            y={courtHeight / 2 - keyHeight / 2}
            width={keyWidth}
            height={keyHeight}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Right paint area */}
          <Rect
            x={courtWidth - keyWidth}
            y={courtHeight / 2 - keyHeight / 2}
            width={keyWidth}
            height={keyHeight}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Free throw circles */}
          <Circle
            cx={keyWidth - circleRadius / 2}
            cy={courtHeight / 2}
            r={circleRadius}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          <Circle
            cx={courtWidth - keyWidth + circleRadius / 2}
            cy={courtHeight / 2}
            r={circleRadius}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </G>
      )}

      {/* 3-point arcs */}
      {isPortrait ? (
        <G>
          {/* Top 3-point arc */}
          <Path
            d={`M ${courtWidth * 0.08} ${courtHeight * 0.34} Q ${
              courtWidth / 2
            } ${-courtHeight * 0.16} ${courtWidth * 0.92} ${
              courtHeight * 0.34
            }`}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Bottom 3-point arc */}
          <Path
            d={`M ${courtWidth * 0.08} ${courtHeight * 0.66} Q ${
              courtWidth / 2
            } ${courtHeight * 1.16} ${courtWidth * 0.92} ${courtHeight * 0.66}`}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </G>
      ) : (
        <G>
          {/* Left 3-point arc */}
          <Path
            d={`M ${courtWidth * 0.34} ${courtHeight * 0.08} Q ${
              -courtWidth * 0.17
            } ${courtHeight / 2} ${courtWidth * 0.34} ${courtHeight * 0.92}`}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Right 3-point arc */}
          <Path
            d={`M ${courtWidth * 0.66} ${courtHeight * 0.08} Q ${
              courtWidth * 1.17
            } ${courtHeight / 2} ${courtWidth * 0.66} ${courtHeight * 0.92}`}
            fill="transparent"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </G>
      )}

      {/* Baskets */}
      <Circle
        cx={courtWidth / 2}
        cy={isPortrait ? 30 : courtHeight / 2}
        r={6}
        fill="#FFFFFF"
      />

      <Circle
        cx={courtWidth / 2}
        cy={isPortrait ? courtHeight - 30 : courtHeight / 2}
        r={6}
        fill="#FFFFFF"
      />
    </Svg>
  );
}
