import * as React from "react";
import Svg, { Defs, ClipPath, Path, G, Text } from "react-native-svg";

interface JerseyIconProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  number?: string | number;
}

const JerseyIcon = ({
  width = 120,
  height = 120,
  primaryColor = "#FF0000",
  secondaryColor = "#000000",
  number = "23",
}: JerseyIconProps) => {
  const aspectRatio = 375 / 375; // Original viewBox dimensions
  const calculatedHeight = width / aspectRatio;

  return (
    <Svg
      width={width}
      height={calculatedHeight}
      viewBox="0 0 375 374.999991"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs>
        <ClipPath id="3b0c8dc996">
          <Path
            d="M 259 27 L 289.660156 27 L 289.660156 135 L 259 135 Z M 259 27 "
            clipRule="nonzero"
          />
        </ClipPath>
        <ClipPath id="c363b29a6b">
          <Path
            d="M 85.660156 25 L 289.660156 25 L 289.660156 350.90625 L 85.660156 350.90625 Z M 85.660156 25 "
            clipRule="nonzero"
          />
        </ClipPath>
        <ClipPath id="9b23404a81">
          <Path
            d="M 85.660156 27 L 117 27 L 117 135 L 85.660156 135 Z M 85.660156 27 "
            clipRule="nonzero"
          />
        </ClipPath>
      </Defs>
      <G
        clipPath="url(#3b0c8dc996)"
        transform="translate(-55,-2) scale(1.19,1.06)"
      >
        <Path
          fill={primaryColor}
          d="M 264.867188 89.675781 L 264.867188 34.589844 C 264.867188 31.304688 262.460938 28.492188 259.21875 27.898438 L 259.21875 90.449219 C 259.21875 110.128906 271.324219 127.367188 289.660156 134.324219 L 289.660156 128.878906 C 274.550781 121.621094 264.867188 106.394531 264.867188 89.675781 Z M 264.867188 89.675781 "
          fillOpacity={1}
          fillRule="nonzero"
        />
      </G>
      <G transform="translate(-24,-0.9) scale(1.13,1.09)">
        <Path
          fill={primaryColor}
          d="M 187.660156 78.132812 C 199.695312 78.132812 211.730469 72.347656 220.683594 62.261719 C 229.84375 51.941406 234.71875 38.648438 234.546875 24.625 L 230.429688 24.082031 C 229.914062 24.015625 229.398438 24.007812 228.890625 24.054688 C 229.175781 36.800781 224.699219 49.289062 216.421875 58.617188 C 208.542969 67.492188 198.0625 72.582031 187.660156 72.582031 C 177.261719 72.582031 166.78125 67.492188 158.902344 58.617188 C 150.625 49.289062 146.148438 36.804688 146.433594 24.058594 C 145.914062 24.011719 145.386719 24.019531 144.855469 24.085938 L 140.773438 24.625 C 140.605469 38.648438 145.480469 51.9375 154.640625 62.261719 C 163.59375 72.347656 175.628906 78.132812 187.660156 78.132812 Z M 187.660156 78.132812 "
          fillOpacity={1}
          fillRule="nonzero"
        />
      </G>
      <G clipPath="url(#c363b29a6b)">
        <Path
          fill={secondaryColor}
          d="M 253.847656 90.445312 L 253.847656 27.171875 L 239.929688 25.335938 C 239.929688 40.410156 234.585938 54.679688 224.703125 65.816406 C 214.730469 77.046875 201.230469 83.488281 187.660156 83.488281 C 174.09375 83.488281 160.59375 77.046875 150.625 65.816406 C 140.738281 54.675781 135.394531 40.40625 135.394531 25.335938 L 121.476562 27.171875 L 121.476562 90.449219 C 121.476562 113.054688 107.148438 132.769531 85.660156 140.015625 L 85.660156 345.152344 C 85.660156 348.257812 88.222656 350.78125 91.375 350.78125 L 283.949219 350.78125 C 287.101562 350.78125 289.664062 348.257812 289.664062 345.152344 L 289.664062 140.015625 C 268.175781 132.773438 253.847656 113.054688 253.847656 90.445312 Z M 253.847656 90.445312 "
          fillOpacity={1}
          fillRule="nonzero"
        />
      </G>
      <G
        transform="translate(-16,-2) scale(1.19,1.06)"
        clipPath="url(#9b23404a81)"
      >
        <Path
          fill={primaryColor}
          d="M 116.105469 90.445312 L 116.105469 27.898438 C 112.863281 28.492188 110.457031 31.304688 110.457031 34.589844 L 110.457031 89.542969 C 110.457031 106.296875 100.777344 121.558594 85.660156 128.875 L 85.660156 134.324219 C 104.003906 127.363281 116.105469 110.125 116.105469 90.445312 Z M 116.105469 90.445312 "
          fillOpacity={1}
          fillRule="nonzero"
        />
      </G>
      <Text
        x={187.5}
        y={260}
        textAnchor="middle"
        fontSize={120}
        fontWeight="bold"
        fill={primaryColor}
        stroke={secondaryColor}
        strokeWidth={3}
        fontFamily="serif"
      >
        {number}
      </Text>
    </Svg>
  );
};

export default JerseyIcon;
