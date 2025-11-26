import * as React from "react";
import Svg, { Path } from "react-native-svg";
import { BRAND_COLORS } from "../../src/theme";

interface JerseyIconProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  strokeWidth?: number;
}

const JerseyIconSimple = ({
  width = 40,
  height = 40,
  primaryColor = "none",
  secondaryColor = BRAND_COLORS[500],
  strokeWidth = 20,
}: JerseyIconProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 375 374.999991"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={primaryColor}
        stroke={secondaryColor}
        strokeWidth={strokeWidth}
        d="M 253.847656 90.445312 L 253.847656 27.171875 L 239.929688 25.335938 C 239.929688 40.410156 234.585938 54.679688 224.703125 65.816406 C 214.730469 77.046875 201.230469 83.488281 187.660156 83.488281 C 174.09375 83.488281 160.59375 77.046875 150.625 65.816406 C 140.738281 54.675781 135.394531 40.40625 135.394531 25.335938 L 121.476562 27.171875 L 121.476562 90.449219 C 121.476562 113.054688 107.148438 132.769531 85.660156 140.015625 L 85.660156 345.152344 C 85.660156 348.257812 88.222656 350.78125 91.375 350.78125 L 283.949219 350.78125 C 287.101562 350.78125 289.664062 348.257812 289.664062 345.152344 L 289.664062 140.015625 C 268.175781 132.773438 253.847656 113.054688 253.847656 90.445312 Z"
      />
    </Svg>
  );
};

export default JerseyIconSimple;
