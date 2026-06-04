import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../utils/theme';

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
        {/* Profile Circle with Initials and Green Active Dot */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitials(displayName)}
            </Text>
          </View>
          {/* Active status indicator dot */}
          <View style={styles.statusDot} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.greetingText}>Bonsoir</Text>
          <Text style={styles.nameText}>{displayName}</Text>
        </View>
      </View>

      {/* Bell / Notification Button */}
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
    paddingHorizontal: 24,
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: '#92400E',
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
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: COLORS.primary,
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
    color: COLORS.textOnDark,
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  bellEmoji: {
    fontSize: 16,
  },
});
