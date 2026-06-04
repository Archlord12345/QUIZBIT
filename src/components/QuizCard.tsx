import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../utils/theme';

interface QuizCardProps {
  variant: 'primary' | 'secondary';
  title: string;
  subtitle: string;
  icon: any; // Lucide icon component or string emoji
  onClick?: () => void;
  iconColor?: string; // hex color
  bgColor?: string; // hex color
}

export const QuizCard: React.FC<QuizCardProps> = ({
  variant,
  title,
  subtitle,
  icon: Icon,
  onClick,
  iconColor = '#ee6845',
  bgColor = '#ffffff',
}) => {
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={onClick}
        style={styles.primaryCard}
        activeOpacity={0.9}
      >
        {/* Glow effect */}
        <View style={styles.primaryGlow} />

        {/* Icon in circled dark transparent badge */}
        <View style={styles.primaryIconBadge}>
          {typeof Icon === 'string' ? (
            <Text style={styles.emojiText}>{Icon}</Text>
          ) : (
            <Icon size={20} color="white" />
          )}
        </View>

        <View>
          <Text style={styles.primaryTitle}>{title}</Text>
          <Text style={styles.primarySubtitle}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Secondary variant
  return (
    <TouchableOpacity
      onPress={onClick}
      style={[styles.secondaryCard, { backgroundColor: bgColor }]}
      activeOpacity={0.9}
    >
      {/* Icon in circle */}
      <View style={styles.secondaryIconBadge}>
        {typeof Icon === 'string' ? (
          <Text style={styles.emojiTextSmall}>{Icon}</Text>
        ) : (
          <Icon size={18} color={iconColor} />
        )}
      </View>

      <View>
        <Text style={styles.secondaryTitle}>{title}</Text>
        <Text style={styles.secondarySubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryCard: {
    width: '100%',
    backgroundColor: '#ee6845',
    borderRadius: 24,
    padding: 20,
    height: 144,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#ee6845',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryGlow: {
    position: 'absolute',
    bottom: -32,
    left: -32,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  emojiTextSmall: {
    fontSize: 18,
  },
  primaryTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  primarySubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  secondaryCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 24,
    padding: 16,
    height: 144,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: 'rgba(231, 229, 228, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTitle: {
    color: '#2e1d33',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  secondarySubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
});
