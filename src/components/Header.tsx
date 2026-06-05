import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../utils/theme';
import { LAYOUT, UI } from '../utils/ui';

interface HeaderProps {
  displayName: string;
  onNotificationClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayName,
  onNotificationClick,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitials(displayName)}
            </Text>
          </View>
          <View style={styles.statusDot} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.greetingText}>Bonsoir</Text>
          <Text style={styles.nameText}>{displayName}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onNotificationClick}
        style={styles.bellButton}
        activeOpacity={0.8}
      >
        <Text style={styles.bellEmoji}>🔔</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: LAYOUT.screenPaddingH,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
    shadowColor: '#2e1d33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: COLORS.textOnDark,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  textContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.line,
  },
  bellEmoji: {
    fontSize: 16,
  },
});
