import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/theme';

type SplashScreenProps = {
  message?: string;
};

/**
 * Ecran de chargement anime aligne sur le logo QuizBit :
 * fond bleu nuit, halos en spirale, logo pulsant, anneau rotatif et points animes.
 */
const SplashScreen = ({ message = 'Chargement...' }: SplashScreenProps) => {
  const spin = useRef(new Animated.Value(0)).current;
  const spinSlow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const dotLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 360,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(720 - delay),
        ]),
      );

    const animations = [
      loop(spin, 2600),
      loop(spinSlow, 9000),
      pulseLoop,
      dotLoop(dot1, 0),
      dotLoop(dot2, 160),
      dotLoop(dot3, 320),
    ];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [spin, spinSlow, pulse, dot1, dot2, dot3]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rotateReverse = spinSlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.06],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const dotStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />
      <Animated.View
        style={[styles.cube, styles.cubeOne, { transform: [{ rotate }] }]}
      />
      <Animated.View
        style={[
          styles.cube,
          styles.cubeTwo,
          { transform: [{ rotate: rotateReverse }] },
        ]}
      />
      <Animated.View
        style={[styles.cube, styles.cubeThree, { transform: [{ rotate }] }]}
      />

      <View style={styles.center}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[styles.halo, { transform: [{ scale: haloScale }] }]}
          />
          <Animated.View
            style={[styles.ring, { transform: [{ rotate }] }]}
          />
          <Animated.View
            style={[styles.ringInner, { transform: [{ rotate: rotateReverse }] }]}
          />
          <Animated.Image
            accessibilityLabel="Logo QuizBit"
            resizeMode="contain"
            source={require('../assets/logo.png')}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          />
        </View>

        <Text style={styles.title}>QuizBit</Text>
        <Text style={styles.subtitle}>Quiz IA, scores cloud et battle royale</Text>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dotStyle(dot1)]} />
          <Animated.View style={[styles.dot, dotStyle(dot2)]} />
          <Animated.View style={[styles.dot, dotStyle(dot3)]} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const RING = 168;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(37, 99, 235, 0.30)',
  },
  cube: {
    position: 'absolute',
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
  },
  cubeOne: {
    top: 110,
    left: 44,
    width: 26,
    height: 26,
  },
  cubeTwo: {
    top: 180,
    right: 52,
    width: 18,
    height: 18,
  },
  cubeThree: {
    bottom: 150,
    right: 70,
    width: 22,
    height: 22,
  },
  center: {
    alignItems: 'center',
  },
  logoStage: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  halo: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: COLORS.secondary,
    borderRightColor: 'rgba(56, 189, 248, 0.45)',
  },
  ringInner: {
    position: 'absolute',
    width: RING - 28,
    height: RING - 28,
    borderRadius: (RING - 28) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.65)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
  },
  logo: {
    width: 104,
    height: 104,
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 14,
  },
});

export default SplashScreen;
