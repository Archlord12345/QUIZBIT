import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LeaderboardUser } from '../types';
import { GameMode } from '../controllers/ScoreController';

interface LeaderboardCardProps {
  ranks: LeaderboardUser[];
  onBackClick: () => void;
  activeSeason?: string;
  selectedMode?: GameMode;
  onSelectMode?: (mode: GameMode | undefined) => void;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  ranks,
  onBackClick,
  activeSeason = "Saison 4",
  selectedMode,
  onSelectMode,
}) => {
  // Extract top three and other ranks
  const top1Input = ranks.find((item) => item.rank === 1);
  const top2Input = ranks.find((item) => item.rank === 2);
  const top3Input = ranks.find((item) => item.rank === 3);
  const others = ranks.filter((item) => item.rank > 3).sort((a, b) => a.rank - b.rank);

  return (
    <View style={styles.container}>
      {/* Top Bar Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBackClick}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Classement</Text>

        <View style={styles.seasonBadge}>
          <Text style={styles.seasonText}>{activeSeason}</Text>
        </View>
      </View>

      {/* Mode Filters */}
      {onSelectMode && (
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, selectedMode === undefined && styles.filterButtonActive]}
            onPress={() => onSelectMode(undefined)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, selectedMode === undefined && styles.filterTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedMode === 'solo' && styles.filterButtonActive]}
            onPress={() => onSelectMode('solo')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, selectedMode === 'solo' && styles.filterTextActive]}>
              Solo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedMode === 'battle_royale' && styles.filterButtonActive]}
            onPress={() => onSelectMode('battle_royale')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, selectedMode === 'battle_royale' && styles.filterTextActive]}>
              Battle
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Podium Section */}
      <View style={styles.podiumContainer}>
        {/* Podium Rank 2 (Left) */}
        {top2Input ? (
          <View style={styles.podiumColumn}>
            {/* User Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, styles.avatarRank2]}>
                <Text style={styles.avatarInitials}>{top2Input.initials}</Text>
              </View>
            </View>
            {/* User Meta */}
            <Text style={styles.podiumName} numberOfLines={1}>
              {top2Input.name}
            </Text>
            <Text style={styles.podiumScore}>
              {top2Input.score.toLocaleString()}
            </Text>
            {/* Stand Column */}
            <View style={[styles.podiumStand, styles.standRank2]}>
              <Text style={styles.standNumber}>2</Text>
            </View>
          </View>
        ) : (
          <View style={styles.podiumColumnPlaceholder} />
        )}

        {/* Podium Rank 1 (Center) */}
        {top1Input ? (
          <View style={[styles.podiumColumn, styles.podiumCenter]}>
            {/* Crown above Rank 1 */}
            <Text style={styles.crownEmoji}>👑</Text>
            {/* User Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, styles.avatarRank1]}>
                <Text style={[styles.avatarInitials, styles.avatarInitialsRank1]}>
                  {top1Input.initials}
                </Text>
              </View>
            </View>
            {/* User Meta */}
            <Text style={[styles.podiumName, styles.podiumNameRank1]} numberOfLines={1}>
              {top1Input.name}
            </Text>
            <Text style={styles.podiumScoreRank1}>
              {top1Input.score.toLocaleString()}
            </Text>
            {/* Stand Column - Highlighted Pinkish */}
            <View style={[styles.podiumStand, styles.standRank1]}>
              <Text style={styles.standNumberRank1}>1</Text>
            </View>
          </View>
        ) : (
          <View style={styles.podiumColumnPlaceholder} />
        )}

        {/* Podium Rank 3 (Right) */}
        {top3Input ? (
          <View style={styles.podiumColumn}>
            {/* User Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, styles.avatarRank3]}>
                <Text style={styles.avatarInitials}>{top3Input.initials}</Text>
              </View>
            </View>
            {/* User Meta */}
            <Text style={styles.podiumName} numberOfLines={1}>
              {top3Input.name}
            </Text>
            <Text style={styles.podiumScore}>
              {top3Input.score.toLocaleString()}
            </Text>
            {/* Stand Column */}
            <View style={[styles.podiumStand, styles.standRank3]}>
              <Text style={styles.standNumber}>3</Text>
            </View>
          </View>
        ) : (
          <View style={styles.podiumColumnPlaceholder} />
        )}
      </View>

      {/* Other Rankings List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollListContent}
        showsVerticalScrollIndicator={false}
      >
        {others.map((item) => {
          const isCurrentUser = item.isCurrentUser;
          return (
            <View
              key={item.rank}
              style={[
                styles.rankRow,
                isCurrentUser ? styles.rankRowCurrentUser : styles.rankRowNormal,
              ]}
            >
              {/* Left Profile details */}
              <View style={styles.rankLeft}>
                {/* Ranking number capsule */}
                <View style={styles.rankNumberContainer}>
                  <Text style={styles.rankNumber}>{item.rank}</Text>
                </View>

                {/* Avatar Initials circle */}
                <View
                  style={[
                    styles.rankAvatarCircle,
                    isCurrentUser ? styles.rankAvatarCurrentUser : styles.rankAvatarNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.rankAvatarText,
                      isCurrentUser ? styles.rankAvatarTextCurrentUser : styles.rankAvatarTextNormal,
                    ]}
                  >
                    {item.initials}
                  </Text>
                </View>

                {/* Name and score */}
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rankPoints}>
                    {item.score.toLocaleString()} pts
                  </Text>
                </View>
              </View>

              {/* Trend movement indicator and trophy badge */}
              <View style={styles.rankRight}>
                {/* Trend movement */}
                <View>
                  {item.change > 0 ? (
                    <View style={[styles.trendBadge, styles.trendUp]}>
                      <Text style={styles.trendArrowUp}>▲</Text>
                      <Text style={styles.trendTextUp}>{item.change}</Text>
                    </View>
                  ) : item.change < 0 ? (
                    <View style={[styles.trendBadge, styles.trendDown]}>
                      <Text style={styles.trendArrowDown}>▼</Text>
                      <Text style={styles.trendTextDown}>{Math.abs(item.change)}</Text>
                    </View>
                  ) : (
                    <View style={[styles.trendBadge, styles.trendNeutral]}>
                      <Text style={styles.trendTextNeutral}>0</Text>
                    </View>
                  )}
                </View>

                {/* Decorative Trophy Indicator Badge */}
                <View style={styles.trophyIndicator}>
                  <Text style={styles.trophyIndicatorText}>🏆</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fdf8fa',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2e1d33',
    letterSpacing: -0.2,
  },
  seasonBadge: {
    backgroundColor: '#fcf5fb',
    borderWidth: 1,
    borderColor: '#f5ecf6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seasonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7a317a',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#7a317a',
    borderColor: '#7a317a',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716c',
  },
  filterTextActive: {
    color: 'white',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fdf8fa',
  },
  podiumColumn: {
    flex: 1,
    maxWidth: 100,
    alignItems: 'center',
  },
  podiumColumnPlaceholder: {
    flex: 1,
    maxWidth: 100,
  },
  podiumCenter: {
    maxWidth: 110,
    transform: [{ translateY: -4 }],
  },
  crownEmoji: {
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarCircle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarRank1: {
    width: 60,
    height: 60,
    backgroundColor: '#ee6845',
    borderWidth: 3,
  },
  avatarRank2: {
    width: 52,
    height: 52,
    backgroundColor: '#4a204e',
  },
  avatarRank3: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(74, 32, 78, 0.85)',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  avatarInitialsRank1: {
    fontSize: 15,
    fontWeight: '900',
  },
  podiumName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e1d33',
    textAlign: 'center',
    width: '100%',
  },
  podiumNameRank1: {
    fontSize: 13,
    fontWeight: '900',
  },
  podiumScore: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716c',
    marginTop: 1,
    marginBottom: 4,
  },
  podiumScoreRank1: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ee6845',
    marginTop: 1,
    marginBottom: 4,
  },
  podiumStand: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  standRank1: {
    height: 80,
    backgroundColor: '#faebea',
    borderColor: 'rgba(245, 179, 164, 0.25)',
  },
  standRank2: {
    height: 54,
    backgroundColor: '#fdfafb',
    borderColor: 'rgba(101, 51, 109, 0.1)',
  },
  standRank3: {
    height: 40,
    backgroundColor: '#fdfafb',
    borderColor: 'rgba(101, 51, 109, 0.1)',
  },
  standNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: 'rgba(101, 51, 109, 0.25)',
  },
  standNumberRank1: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(238, 104, 69, 0.45)',
  },
  scrollList: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollListContent: {
    paddingBottom: 32,
    gap: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  rankRowNormal: {
    backgroundColor: 'white',
    borderColor: '#f5f5f4',
  },
  rankRowCurrentUser: {
    backgroundColor: 'rgba(250, 236, 238, 0.7)',
    borderColor: '#edd3d8',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankNumberContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716c',
  },
  rankAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarNormal: {
    backgroundColor: '#e9eef7',
  },
  rankAvatarCurrentUser: {
    backgroundColor: '#5b2861',
  },
  rankAvatarText: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankAvatarTextNormal: {
    color: '#2e1d33',
  },
  rankAvatarTextCurrentUser: {
    color: 'white',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e1d33',
  },
  rankPoints: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 1,
  },
  rankRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  trendUp: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  trendDown: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  trendNeutral: {
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
  },
  trendTextUp: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  trendTextDown: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f43f5e',
  },
  trendTextNeutral: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716c',
  },
  trophyIndicator: {
    padding: 6,
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#57534e',
  },
  trendArrowUp: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
  },
  trendArrowDown: {
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: 'bold',
  },
  trophyIndicatorText: {
    fontSize: 12,
  },
});
