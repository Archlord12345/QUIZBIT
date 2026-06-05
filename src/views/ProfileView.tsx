import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AvatarImage } from '../components/AvatarImage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AuthController, { UserAccount } from '../controllers/AuthController';
import { pickAvatarFromLibrary } from '../utils/avatarPicker';
import { COLORS, LINE } from '../utils/theme';
import { LAYOUT, RADIUS, UI } from '../utils/ui';
import { ScreenHeader, ScreenScroll, screenCardStyle } from '../components/ScreenLayout';

type ProfileViewProps = {
  account: UserAccount;
  navigation: NativeStackNavigationProp<any>;
  onBack?: () => void;
  embedded?: boolean;
  onAccountUpdated: (account: UserAccount) => void;
  onSignOut: () => void;
};

const ProfileView = ({
  account,
  navigation,
  onBack,
  embedded = false,
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
        avatar.type || 'image/jpeg',
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

  const handleBack = () => {
    if (onBack) onBack();
    else navigation.goBack();
  };

  return (
    <ScreenScroll>
      <ScreenHeader
        title="Mon profil"
        onBack={handleBack}
        showBack={!embedded}
      />

      <View style={[screenCardStyle, styles.profileCard]}>
        <View style={styles.profileTop}>
          <AvatarImage
            avatarUrl={account.avatarUrl}
            seed={account.id}
            displayName={account.displayName}
            size={80}
            style={styles.avatar}
          />
          <View style={styles.profileIdentity}>
            <Text style={styles.profileName}>{account.displayName}</Text>
            <Text style={styles.profileMeta}>{account.email}</Text>
            <Text style={styles.profileHint}>
              Session synchronisée via l&apos;API Vercel.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Parties" value={account.gamesPlayed} />
          <Stat label="Total" value={account.totalScore} />
          <Stat label="Best" value={account.bestScore} />
          <Stat label="Coupes" value={account.cups || 0} />
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

      <View style={[screenCardStyle, styles.actionsCard]}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.secondaryButtonText}>Paramètres de l&apos;application</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={onSignOut}>
          <Text style={styles.dangerButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScreenScroll>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  profileCard: {
    gap: 16,
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
  profileIdentity: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  profileMeta: {
    color: COLORS.muted,
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
    gap: LAYOUT.cardGap,
    marginTop: 8,
  },
  statBox: {
    backgroundColor: UI.surfaceSoft,
    borderRadius: RADIUS.md,
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
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  primaryButtonText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
  actionsCard: {
    gap: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: LINE,
    borderRadius: RADIUS.md,
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
    backgroundColor: UI.errorBg,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProfileView;
