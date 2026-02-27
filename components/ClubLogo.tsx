/**
 * ClubLogo Component
 *
 * Displays club logo with automatic signed URL generation for private bucket access.
 * Falls back to placeholder if no logo is available.
 */

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useSignedUrl } from '../hooks/useSignedUrl';
import { COACH_ASSISTANT_LOGO_MARGIN } from '../src/utils/logoHelper';

interface ClubLogoProps {
  logoPath: string | null | undefined;
  style: StyleProp<ImageStyle>;
}

export default function ClubLogo({ logoPath, style }: ClubLogoProps) {
  const signedUrl = useSignedUrl(logoPath);

  if (signedUrl) {
    return <Image source={{ uri: signedUrl }} style={style} />;
  }

  // Fallback to default logo
  return <Image source={COACH_ASSISTANT_LOGO_MARGIN} style={style} />;
}
