import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScoreController, { GameMode, ScoreEntry } from '../controllers/ScoreController';
import { UserAccount } from '../controllers/AuthController';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { LeaderboardUser } from '../types';
import { getInitials, resolveAvatarUrl } from '../utils/defaultAvatar';
import { COLORS } from '../utils/theme';

type LeaderboardViewProps = {
  account: UserAccount;
  active?: boolean;
  onBack?: () => void;
  embedded?: boolean;
  refreshToken?: number;
};

const LeaderboardView = ({
  account,
  active = true,
  onBack,
  embedded = false,
  refreshToken = 0,
}: LeaderboardViewProps) => {
  const [mode, setMode] = useState<GameMode | undefined>(undefined);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadScores = async () => {
    setLoading(true);
    setError('');
    try {
      setScores(await ScoreController.getLeaderboard(mode, account));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Impossible de charger le classement.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, active, refreshToken]);

  const mappedRanks: LeaderboardUser[] = scores.map((score, index) => ({
    rank: index + 1,
    name: score.displayName,
    score: score.score,
    initials: getInitials(score.displayName),
    userId: score.userId,
    avatarUrl: resolveAvatarUrl(
      score.avatarUrl,
      score.userId,
      score.displayName,
    ),
    isCurrentUser: score.userId === account.id,
    change: 0,
  }));

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadScores}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backLink}>Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <LeaderboardCard
          ranks={mappedRanks}
          onBackClick={onBack}
          showBackButton={!embedded && Boolean(onBack)}
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: 'white', fontWeight: '800' },
  backLink: { color: COLORS.primary, fontWeight: '800' },
});

export default LeaderboardView;
