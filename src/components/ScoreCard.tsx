import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScoreCardProps {
  totalScore: number;
  partiesPlayed: number;
  bestScore: number;
  streak: number;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  totalScore,
  partiesPlayed,
  bestScore,
  streak,
}) => {
  return (
    <View style={styles.card}>
      {/* Decorative background radial highlight */}
      <View style={styles.glowCircle} />
      
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>SCORE TOTAL</Text>
          <Text style={styles.scoreValue}>
            {(totalScore || 0).toLocaleString()}
          </Text>
        </View>
        
        {/* Golden Trophy badge */}
        <View style={styles.trophyBadge}>
          <Text style={styles.trophyEmoji}>🏆</Text>
        </View>
      </View>

      {/* Row of Stats */}
      <View style={styles.statsRow}>
        {/* Parties */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Parties</Text>
          <Text style={styles.statValue}>{partiesPlayed}</Text>
        </View>

        {/* Meilleur */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Meilleur</Text>
          <Text style={styles.statValue}>{bestScore}</Text>
        </View>

        {/* Streak */}
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
    backgroundColor: '#4d1f4d',
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#D6D3D1',
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  trophyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(238, 104, 69, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(238, 104, 69, 0.3)',
  },
  trophyEmoji: {
    fontSize: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D6D3D1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  streakText: {
    color: '#F97316',
  },
  fireEmoji: {
    fontSize: 14,
  },
});
