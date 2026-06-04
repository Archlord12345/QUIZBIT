import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import ScoreController, { GameMode, ScoreEntry } from '../controllers/ScoreController';
import AuthController from '../controllers/AuthController';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { LeaderboardUser } from '../types';
import { COLORS } from '../utils/theme';

type LeaderboardViewProps = {
  onBack: () => void;
};

const LeaderboardView = ({ onBack }: LeaderboardViewProps) => {
  const [mode, setMode] = useState<GameMode | undefined>(undefined);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const currentAccount = AuthController.getCurrentAccount();

  const loadScores = async () => {
    setLoading(true);
    try {
      setScores(await ScoreController.getLeaderboard(mode));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Map ScoreEntry[] to LeaderboardUser[]
  const mappedRanks: LeaderboardUser[] = scores.map((score, index) => ({
    rank: index + 1,
    name: score.displayName,
    score: score.score,
    initials: getInitials(score.displayName),
    isCurrentUser: score.userId === currentAccount?.id,
    change: 0, // Stable trend change indicator
  }));

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
        </View>
      ) : (
        <LeaderboardCard
          ranks={mappedRanks}
          onBackClick={onBack}
          activeSeason={mode === 'battle_royale' ? "Mode Battle" : mode === 'solo' ? "Mode Solo" : "Saison 4"}
          selectedMode={mode}
          onSelectMode={setMode}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LeaderboardView;
