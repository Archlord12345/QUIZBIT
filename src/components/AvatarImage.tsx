import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { getInitials, resolveAvatarUrl } from '../utils/defaultAvatar';

type AvatarImageProps = {
  avatarUrl?: string;
  seed: string;
  displayName?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  frameStyle?: StyleProp<ViewStyle>;
};

export const AvatarImage = ({
  avatarUrl,
  seed,
  displayName = 'Player',
  size = 48,
  style,
  frameStyle,
}: AvatarImageProps) => {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () => resolveAvatarUrl(avatarUrl, seed, displayName),
    [avatarUrl, seed, displayName],
  );
  const radius = size / 2;

  if (failed) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius },
          frameStyle,
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize: Math.max(12, size * 0.34) }]}>
          {getInitials(displayName)}
        </Text>
      </View>
    );
  }

  return (
    <View style={frameStyle}>
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surfaceMuted,
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
  },
  fallbackText: {
    color: COLORS.textOnDark,
    fontWeight: '900',
  },
});
