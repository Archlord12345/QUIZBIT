import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LogoMark from '../components/LogoMark';
import AuthController, { UserAccount } from '../controllers/AuthController';
import QuizController, { QuizState } from '../controllers/QuizController';
import { COLORS, SPACING } from '../utils/theme';

type HomeViewProps = {
  account: UserAccount;
  onAccountUpdated: (account: UserAccount) => void;
  onBattle: () => void;
  onLeaderboard: () => void;
  onQuizReady: (quiz: QuizState) => void;
  onSignOut: () => void;
};

const HomeView = ({
  account,
  onAccountUpdated,
  onBattle,
  onLeaderboard,
  onQuizReady,
  onSignOut,
}: HomeViewProps) => {
  const [theme, setTheme] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const cleanTheme = theme.trim();
    if (!cleanTheme || loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const quiz = await QuizController.initQuiz(cleanTheme);
      onQuizReady(quiz);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de creer le quiz pour le moment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarUri.trim() || uploadingAvatar) {
      return;
    }

    setUploadingAvatar(true);
    setError('');
    try {
      const updatedAccount = await AuthController.updateAvatar(
        account,
        avatarUri,
      );
      onAccountUpdated(updatedAccount);
      setAvatarUri('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload avatar impossible.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <LogoMark compact subtitle="Quiz, comptes, scores et battle royale" />
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{account.displayName}</Text>
        <Text style={styles.profileMeta}>{account.email}</Text>
        <View style={styles.statsRow}>
          <Stat label="Parties" value={account.gamesPlayed} />
          <Stat label="Total" value={account.totalScore} />
          <Stat label="Best" value={account.bestScore} />
        </View>
        <Text style={styles.profileMeta}>
          Avatar: {account.avatarUrl ? account.avatarUrl : 'non configure'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="URI image avatar pour Cloudinary"
          placeholderTextColor="#6B778C"
          value={avatarUri}
          onChangeText={setAvatarUri}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, uploadingAvatar && styles.disabled]}
          disabled={uploadingAvatar || !avatarUri.trim()}
          onPress={handleAvatarUpload}
        >
          <Text style={styles.secondaryButtonText}>
            {uploadingAvatar ? 'Upload...' : 'Sauvegarder avatar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quiz solo</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: Mathématiques, Science-Fiction..."
          placeholderTextColor="#6B778C"
          value={theme}
          onChangeText={setTheme}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleStart}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.button,
            (!theme.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleStart}
          disabled={loading || !theme.trim()}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Commencer le Quiz</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.modeButton} onPress={onBattle}>
          <Text style={styles.modeTitle}>Battle Royale</Text>
          <Text style={styles.modeText}>Créer ou rejoindre une salle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modeButton} onPress={onLeaderboard}>
          <Text style={styles.modeTitle}>Scores</Text>
          <Text style={styles.modeText}>Voir le leaderboard</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  logo: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    gap: 12,
    marginBottom: 18,
    padding: SPACING.lg,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  profileMeta: {
    color: '#6B778C',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    backgroundColor: '#F4F5F7',
    borderRadius: 12,
    flex: 1,
    padding: 12,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 18,
    padding: SPACING.xl,
  },
  label: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 14,
    padding: 15,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 18,
  },
  buttonDisabled: {
    backgroundColor: '#B3D4FF',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  actionsGrid: {
    gap: 12,
  },
  modeButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: COLORS.secondary,
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  modeTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  modeText: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  signOutButton: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 12,
  },
  signOutText: {
    color: 'white',
    textDecorationLine: 'underline',
  },
});

export default HomeView;
