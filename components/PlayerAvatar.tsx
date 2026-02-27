/**
 * PlayerAvatar Component
 *
 * Displays a player's avatar with fallback to number if image fails to load
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { AvatarService } from '../src/services/AvatarService';
import { useSignedUrl } from '../hooks/useSignedUrl';

interface PlayerAvatarProps {
  playerName: string;
  playerNumber: number;
  photoUrl?: string | null;
  size?: number;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderWidth?: number;
  style?: ViewStyle;
}

export default function PlayerAvatar({
  playerName,
  playerNumber,
  photoUrl,
  size = 56,
  borderColor,
  backgroundColor,
  textColor,
  borderWidth = 2,
  style,
}: PlayerAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Generate signed URL for photo (2h expiration)
  const signedPhotoUrl = useSignedUrl(photoUrl);
  const avatarUrl = AvatarService.getAvatarUrl(playerName, signedPhotoUrl);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // If image failed to load, show player number
  if (imageError) {
    return (
      <View style={[containerStyle, style]}>
        <Text
          style={[
            styles.numberText,
            {
              color: textColor,
              fontSize: size * 0.36, // Scale font size based on avatar size
            },
          ]}
        >
          {playerNumber}
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        onError={() => setImageError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  numberText: {
    fontWeight: '900',
  },
});
