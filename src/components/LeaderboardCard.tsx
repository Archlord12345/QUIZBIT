import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles/LeaderboardCard.styles';

interface RankItem {
  rank: number;
  initials: string;
  name: string;
  score: number;
  change?: number;
  icon?: string;
}

interface LeaderboardCardProps {
  topThree: RankItem[];
  otherRanks: RankItem[];
  selectedRank?: number;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  topThree,
  otherRanks,
  selectedRank,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topThreeContainer}>
        {topThree.map((item, index) => (
          <View
            key={item.rank}
            style={[
              styles.topThreeCard,
              index === 1 && styles.topThreeCardFirst,
            ]}
          >
            <View
              style={[
                styles.topThreeAvatar,
                index === 1 && styles.topThreeAvatarFirst,
              ]}
            >
              <Text
                style={[
                  styles.topThreeInitials,
                  index === 1 && styles.topThreeInitialsFirst,
                ]}
              >
                {item.initials}
              </Text>
            </View>
            <Text style={styles.topThreeName}>{item.name}</Text>
            <Text style={styles.topThreeScore}>{item.score}</Text>
            <Text style={styles.topThreeRank}>{item.rank}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rankingsContainer}>
        {otherRanks.map((item) => (
          <View
            key={item.rank}
            style={[
              styles.rankingItem,
              selectedRank === item.rank && styles.rankingItemSelected,
            ]}
          >
            <Text style={styles.rankingNumber}>{item.rank}</Text>
            <View style={styles.rankingAvatar}>
              <Text style={styles.rankingInitials}>{item.initials}</Text>
            </View>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName}>{item.name}</Text>
              <Text style={styles.rankingScore}>{item.score} pts</Text>
            </View>
            <View style={styles.rankingChange}>
              {item.change !== undefined && (
                <>
                  <Text
                    style={[
                      styles.rankingChangeText,
                      item.change >= 0
                        ? styles.rankingChangePositive
                        : styles.rankingChangeNegative,
                    ]}
                  >
                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}
                  </Text>
                  <Text style={styles.rankingIcon}>{item.icon || '🏆'}</Text>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
