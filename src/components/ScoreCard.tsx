import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles/ScoreCard.styles';

interface ScoreStat {
  label: string;
  value: number | string;
  icon?: string;
}

interface ScoreCardProps {
  totalScore: number;
  stats: ScoreStat[];
  icon?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  totalScore,
  stats,
  icon = '🏆',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.label}>SCORE TOTAL</Text>
          <Text style={styles.score}>{totalScore.toLocaleString()}</Text>
        </View>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statBox}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
