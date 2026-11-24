import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Text, ViewStyle } from 'react-native';
import { INITIALS_AVATAR } from '../constants/avatarConstants';
import { AvatarService } from '../src/services/AvatarService';
import { useTheme } from '../src/contexts/ThemeContext';
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
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const signedPhotoUrl = useSignedUrl(photoUrl);

  useEffect(() => {
    setImageError(false);
  }, [signedPhotoUrl]);

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

  if (imageError || !AvatarService.hasPhoto(signedPhotoUrl)) {
    return (
      <View style={[containerStyle, style, { backgroundColor: colors.surfaceVariant }]}>
        <Text
          allowFontScaling={false}
          style={[
            styles.initials,
            { color: colors.text.primary, fontSize: size * INITIALS_AVATAR.fontSizeRatio },
          ]}
        >
          {AvatarService.getInitials(playerName)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: signedPhotoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={(e) => {
          console.warn('[PlayerAvatar] load error', {
            player: playerName,
            url: signedPhotoUrl,
            error: e.nativeEvent,
          });
          setImageError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    fontWeight: INITIALS_AVATAR.fontWeight,
  },
});
