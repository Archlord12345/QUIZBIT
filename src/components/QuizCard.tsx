import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './styles/QuizCard.styles';

interface QuizCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  highlighted?: boolean;
  color?: string;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  highlighted = false,
  color = '#FF6B4A',
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        highlighted && styles.highlighted,
        { backgroundColor: highlighted ? color : '#F5F5F5' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, highlighted && styles.highlightedIcon]}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, highlighted && styles.highlightedTitle]}>{title}</Text>
        <Text style={[styles.subtitle, highlighted && styles.highlightedSubtitle]}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
