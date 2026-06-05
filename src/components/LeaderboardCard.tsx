import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarImage } from './AvatarImage';
import { LeaderboardUser } from '../types';
import { GameMode } from '../controllers/ScoreController';
import { COLORS } from '../utils/theme';
import { LAYOUT, UI } from '../utils/ui';

interface LeaderboardCardProps {
  ranks: LeaderboardUser[];
  onBackClick?: () => void;
  showBackButton?: boolean;
  activeSeason?: string;
  selectedMode?: GameMode;
  onSelectMode?: (mode: GameMode | undefined) => void;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  ranks,
  onBackClick,
  showBackButton = Boolean(onBackClick),
  activeSeason = "Saison 4",
  selectedMode,
  onSelectMode,
}) => {
  // Extract top three and other ranks
  const top1Input = ranks.find((item) => item.rank === 1);
  const top2Input = ranks.find((item) => item.rank === 2);
  const top3Input = ranks.find((item) => item.rank === 3);
  const others = ranks.filter((item) => item.rank > 3).sort((a, b) => a.rank - b.rank);
  const emptyMessage =
    selectedMode === 'battle_royale'
      ? 'Aucun score Battle pour le moment. Termine une partie Battle Royale pour apparaitre ici.'
      : selectedMode === 'solo'
      ? 'Aucun score Solo pour le moment. Joue un quiz pour apparaitre ici.'
      : 'Aucun score enregistre pour le moment. Joue un quiz ou une Battle Royale.';

  return (
    <View style={styles.container}>
      {/* Top Bar Navigation */}
      <View style={styles.header}>
        {showBackButton && onBackClick ? (
          <TouchableOpacity
            onPress={onBackClick}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}

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

      {ranks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyTitle}>Classement vide</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : null}

      {/* Podium Section */}
      <View style={styles.podiumContainer}>
        {/* Podium Rank 2 (Left) */}
        {top2Input ? (
          <View style={styles.podiumColumn}>
            {/* User Avatar */}
            <View style={styles.avatarWrapper}>
              <AvatarImage
                avatarUrl={top2Input.avatarUrl}
                seed={top2Input.userId}
                displayName={top2Input.name}
                size={56}
                style={styles.podiumAvatar}
                frameStyle={[styles.avatarCircle, styles.avatarRank2]}
              />
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
              <AvatarImage
                avatarUrl={top1Input.avatarUrl}
                seed={top1Input.userId}
                displayName={top1Input.name}
                size={68}
                style={styles.podiumAvatar}
                frameStyle={[styles.avatarCircle, styles.avatarRank1]}
              />
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
              <AvatarImage
                avatarUrl={top3Input.avatarUrl}
                seed={top3Input.userId}
                displayName={top3Input.name}
                size={56}
                style={styles.podiumAvatar}
                frameStyle={[styles.avatarCircle, styles.avatarRank3]}
              />
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

                <AvatarImage
                  avatarUrl={item.avatarUrl}
                  seed={item.userId}
                  displayName={item.name}
                  size={40}
                  style={styles.rankListAvatar}
                  frameStyle={[
                    styles.rankAvatarCircle,
                    isCurrentUser
                      ? styles.rankAvatarCurrentUser
                      : styles.rankAvatarNormal,
                  ]}
                />

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
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: LAYOUT.screenPaddingH,
    backgroundColor: COLORS.background,
  },
  headerSide: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: UI.line,
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
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  seasonBadge: {
    backgroundColor: UI.chipBg,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seasonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: LAYOUT.screenPaddingH,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.line,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
  },
  filterTextActive: {
    color: COLORS.textOnDark,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
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
    alignItems: 'center',
    borderColor: 'white',
    borderRadius: 999,
    borderWidth: 2,
    elevation: 3,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  podiumAvatar: {
    borderWidth: 0,
  },
  rankListAvatar: {
    borderWidth: 0,
  },
  avatarRank1: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.secondary,
    borderWidth: 3,
  },
  avatarRank2: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.primaryDark,
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
    color: COLORS.text,
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
    color: COLORS.muted,
    marginTop: 1,
    marginBottom: 4,
  },
  podiumScoreRank1: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.secondary,
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
    backgroundColor: COLORS.surfaceElevated,
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
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
    borderColor: UI.lineMuted,
  },
  rankRowCurrentUser: {
    backgroundColor: UI.currentUserBg,
    borderColor: UI.currentUserBorder,
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
    color: COLORS.muted,
  },
  rankAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarNormal: {
    backgroundColor: UI.avatarBg,
  },
  rankAvatarCurrentUser: {
    backgroundColor: COLORS.primarySoft,
  },
  rankAvatarText: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankAvatarTextNormal: {
    color: COLORS.text,
  },
  rankAvatarTextCurrentUser: {
    color: COLORS.textOnDark,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  rankPoints: {
    fontSize: 11,
    color: COLORS.muted,
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
    backgroundColor: UI.trendUpBg,
    borderColor: UI.trendUpBorder,
  },
  trendDown: {
    backgroundColor: UI.trendDownBg,
    borderColor: UI.trendDownBorder,
  },
  trendNeutral: {
    backgroundColor: UI.lineMuted,
    borderColor: UI.line,
  },
  trendTextUp: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.success,
  },
  trendTextDown: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.error,
  },
  trendTextNeutral: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  trophyIndicator: {
    padding: 6,
    backgroundColor: UI.trophyBg,
    borderColor: UI.trophyBorder,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textSubtle,
  },
  trendArrowUp: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  trendArrowDown: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  trophyIndicatorText: {
    fontSize: 12,
  },
});
