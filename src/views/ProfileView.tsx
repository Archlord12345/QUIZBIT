import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AuthController, { UserAccount } from '../controllers/AuthController';
import { pickAvatarFromLibrary } from '../utils/avatarPicker';
import { COLORS, SPACING } from '../utils/theme';
import LogoMark from '../components/LogoMark';

type ProfileViewProps = {
  account: UserAccount;
  navigation: NativeStackNavigationProp<any>;
  onBack?: () => void;
  onAccountUpdated: (account: UserAccount) => void;
  onSignOut: () => void;
};

const ProfileView = ({
  account,
  navigation,
  onBack,
  onAccountUpdated,
  onSignOut,
}: ProfileViewProps) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarUpload = async () => {
    if (uploadingAvatar) return;

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
        err instanceof Error ? err.message : 'Sélection avatar impossible.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <LogoMark compact />
        <View style={{ width: 70 }} />
      </View>

      <Text style={styles.pageTitle}>Mon Profil</Text>

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
              Session sauvegardée et synchronisée avec Firebase.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Parties" value={account.gamesPlayed} />
          <Stat label="Total" value={account.totalScore} />
          <Stat label="Best" value={account.bestScore} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, uploadingAvatar && styles.disabled]}
          disabled={uploadingAvatar}
          onPress={handleAvatarUpload}
        >
          {uploadingAvatar ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Changer la photo de profil</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.secondaryButtonText}>Paramètres de l'application</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={onSignOut}>
          <Text style={styles.dangerButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  backButton: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  pageTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: SPACING.lg,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    gap: 16,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
    borderRadius: 40,
    borderWidth: 2,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarInitial: {
    color: COLORS.textOnDark,
    fontSize: 32,
    fontWeight: '900',
  },
  profileIdentity: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#6B778C',
    fontSize: 14,
    fontWeight: '500',
  },
  profileHint: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    flex: 1,
    padding: 16,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  statLabel: {
    color: '#6B778C',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: SPACING.xl,
    gap: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#DFE1E6',
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 16,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProfileView;