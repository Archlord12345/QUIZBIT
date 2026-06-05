import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/theme';

interface ScoreCardProps {
  totalScore: number;
  partiesPlayed: number;
  bestScore: number;
  cups: number;
  streak: number;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  totalScore,
  partiesPlayed,
  bestScore,
  cups,
  streak,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.glowCircle} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>SCORE TOTAL</Text>
          <Text style={styles.scoreValue}>
            {(totalScore || 0).toLocaleString()}
          </Text>
        </View>

        <View style={styles.trophyBadge}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={styles.cupsValue}>{cups || 0}</Text>
          <Text style={styles.cupsLabel}>Coupes</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Parties</Text>
          <Text style={styles.statValue}>{partiesPlayed}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Meilleur</Text>
          <Text style={styles.statValue}>{bestScore}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Streak</Text>
          <View style={styles.streakContainer}>
            <Text style={[styles.statValue, styles.streakText]}>{streak}</Text>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2e1d33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  glowCircle: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textOnDark,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  trophyBadge: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(238, 104, 69, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(238, 104, 69, 0.35)',
  },
  trophyEmoji: {
    fontSize: 18,
  },
  cupsValue: {
    color: COLORS.textOnDark,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  cupsLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textOnDark,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  streakText: {
    color: COLORS.secondary,
  },
  fireEmoji: {
    fontSize: 14,
  },
});
