import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { pickAvatarFromLibrary } from '../utils/avatarPicker';
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
    if (uploadingAvatar) {
      return;
    }

    setUploadingAvatar(true);
    setError('');
    try {
      const avatar = await pickAvatarFromLibrary();
      if (!avatar) return;
      const updatedAccount = await AuthController.updateAvatar(
        account,
        avatar.uri,
      );
      onAccountUpdated(updatedAccount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Selection avatar impossible.',
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
        <View style={styles.profileTop}>
          {account.avatarUrl ? (
            <Image source={{ uri: account.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {account.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileIdentity}>
            <Text style={styles.profileName}>{account.displayName}</Text>
            <Text style={styles.profileMeta}>{account.email}</Text>
            <Text style={styles.profileHint}>
              Session sauvegardée localement et synchronisée avec Firebase.
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat label="Parties" value={account.gamesPlayed} />
          <Stat label="Total" value={account.totalScore} />
          <Stat label="Best" value={account.bestScore} />
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, uploadingAvatar && styles.disabled]}
          disabled={uploadingAvatar}
          onPress={handleAvatarUpload}
        >
          <Text style={styles.secondaryButtonText}>
            {uploadingAvatar ? 'Upload...' : 'Choisir une photo de profil'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quiz solo intelligent</Text>
        <Text style={styles.cardText}>
          Choisis un thème, QuizBit génère des QCM et questions ouvertes avec
          fallback Gemini vers Mistral.
        </Text>
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
            <Text style={styles.buttonText}>Générer et commencer</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.modeButton} onPress={onBattle}>
          <Text style={styles.modeTitle}>Battle Royale</Text>
          <Text style={styles.modeText}>
            Crée une salle Firestore, partage le code et lance un quiz en
            élimination.
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modeButton} onPress={onLeaderboard}>
          <Text style={styles.modeTitle}>Scores</Text>
          <Text style={styles.modeText}>
            Consulte les meilleurs scores synchronisés depuis le serveur.
          </Text>
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
    borderRadius: 24,
    gap: 12,
    marginBottom: 18,
    padding: SPACING.lg,
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
    borderRadius: 36,
    borderWidth: 2,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarInitial: {
    color: COLORS.textOnDark,
    fontSize: 28,
    fontWeight: '900',
  },
  profileIdentity: {
    flex: 1,
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
  profileHint: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
  cardText: {
    color: '#5E6C84',
    lineHeight: 20,
    marginBottom: 14,
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
