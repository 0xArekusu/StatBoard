import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
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

  const signedPhotoUrl = useSignedUrl(photoUrl);
  const avatarUrl = AvatarService.getAvatarUrl(playerName, signedPhotoUrl);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

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

  if (imageError) {
    return <View style={[containerStyle, style]} />;
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={(e) => {
          console.warn('[PlayerAvatar] load error', {
            player: playerName,
            url: avatarUrl,
            error: e.nativeEvent,
          });
          setImageError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
