import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../utils/theme';

type LogoMarkProps = {
  compact?: boolean;
  subtitle?: string;
};

const LogoMark = ({ compact = false, subtitle }: LogoMarkProps) => (
  <View style={styles.container}>
    <Image
      accessibilityLabel="Logo QuizBit"
      resizeMode="contain"
      source={require('../assets/logo.png')}
      style={[styles.logo, compact && styles.logoCompact]}
    />
    {!compact ? <Text style={styles.title}>QuizBit</Text> : null}
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logo: {
    height: 150,
    width: 150,
  },
  logoCompact: {
    height: 82,
    width: 82,
  },
  title: {
    color: COLORS.textOnDark,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: COLORS.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default LogoMark;
