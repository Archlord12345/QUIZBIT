import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScoreController, {
  GameMode,
  ScoreEntry,
} from '../controllers/ScoreController';
import { COLORS, SPACING } from '../utils/theme';

type LeaderboardViewProps = {
  onBack: () => void;
};

const LeaderboardView = ({ onBack }: LeaderboardViewProps) => {
  const [mode, setMode] = useState<GameMode | undefined>(undefined);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadScores = async (nextMode = mode) => {
    setLoading(true);
    try {
      setScores(await ScoreController.getLeaderboard(nextMode));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <View style={styles.filters}>
        <FilterButton
          label="Tous"
          active={!mode}
          onPress={() => setMode(undefined)}
        />
        <FilterButton
          label="Solo"
          active={mode === 'solo'}
          onPress={() => setMode('solo')}
        />
        <FilterButton
          label="Battle"
          active={mode === 'battle_royale'}
          onPress={() => setMode('battle_royale')}
        />
      </View>

      <View style={styles.card}>
        {loading ? <ActivityIndicator color={COLORS.primary} /> : null}
        {!loading && scores.length === 0 ? (
          <Text style={styles.empty}>Aucun score pour le moment.</Text>
        ) : null}
        {scores.map((score, index) => (
          <View key={score.id} style={styles.scoreRow}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.player}>{score.displayName}</Text>
              <Text style={styles.meta}>
                {score.theme} -{' '}
                {score.mode === 'battle_royale' ? 'Battle' : 'Solo'}
              </Text>
            </View>
            <Text style={styles.points}>{score.score}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => loadScores()}
      >
        <Text style={styles.refreshText}>Actualiser</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const FilterButton = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    padding: SPACING.lg,
  },
  title: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 18,
    marginTop: 32,
    textAlign: 'center',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    borderColor: COLORS.secondary,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  filterButtonActive: {
    backgroundColor: 'white',
  },
  filterText: {
    color: 'white',
    fontWeight: '800',
    textAlign: 'center',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    minHeight: 220,
    padding: SPACING.lg,
  },
  empty: {
    color: COLORS.text,
    textAlign: 'center',
  },
  scoreRow: {
    alignItems: 'center',
    borderBottomColor: '#E1E4E8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  rank: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    width: 42,
  },
  scoreDetails: {
    flex: 1,
  },
  player: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: '#6B778C',
    fontSize: 12,
  },
  points: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: '900',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    marginTop: 18,
    padding: 15,
  },
  refreshText: {
    color: 'white',
    fontWeight: '800',
  },
  backButton: {
    alignSelf: 'center',
    padding: 12,
  },
  backText: {
    color: 'white',
    textDecorationLine: 'underline',
  },
});

export default LeaderboardView;
