import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LogoMark from '../components/LogoMark';
import { UserAccount } from '../controllers/AuthController';
import QuizController, { QuizState } from '../controllers/QuizController';
import { OpenAnswerMode, QuestionType } from '../models/AIModel';
import {
  describeThemeMedia,
  pickThemeMedia,
  ThemeMedia,
} from '../utils/themeMediaPicker';
import { COLORS, SPACING } from '../utils/theme';
import { Header } from '../components/Header';

// Component Imports
import { ScoreCard } from '../components/ScoreCard';
import { QuizCard } from '../components/QuizCard';
import { BottomNavigation, NavItem } from '../components/BottomNavigation';

// View & Controller Imports
import ProfileView from './ProfileView';
import LeaderboardView from './LeaderboardView';
import BattleRoyaleView from './BattleRoyaleView';
import { BattleRoyaleRoom } from '../controllers/BattleRoyaleController';

type HomeViewProps = {
  account: UserAccount;
  navigation: NativeStackNavigationProp<any>;
  onAccountUpdated: (account: UserAccount) => void;
  onSignOut: () => void;
  onStartBattle: (room: BattleRoyaleRoom) => void;
  onQuizReady: (quiz: QuizState) => void;
};

const questionTypeLabel = {
  mixed: 'Mixte',
  mcq: 'QCM',
  open: 'QRO',
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'quiz', label: 'Quiz', icon: '🧠' },
  { id: 'battle', label: 'Battle', icon: '⚔️' },
  { id: 'top', label: 'Top', icon: '🏆' },
  { id: 'profile', label: 'Profil', icon: '👤' },
];

const HomeView = ({
  account,
  navigation,
  onAccountUpdated,
  onSignOut,
  onStartBattle,
  onQuizReady,
}: HomeViewProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'quiz' | 'battle' | 'top' | 'profile'>('home');
  const [theme, setTheme] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('mixed');
  const [questionCount, setQuestionCount] = useState('5');
  const [choiceCount, setChoiceCount] = useState('4');
  const [openAnswerMode, setOpenAnswerMode] =
    useState<OpenAnswerMode>('flexible');
  const [themeMedia, setThemeMedia] = useState<ThemeMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedQuestionCount = Math.max(
    1,
    Math.min(20, Math.floor(Number(questionCount) || 5)),
  );

  const handleStart = async () => {
    const cleanTheme = theme.trim();
    if (!cleanTheme || loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const quiz = await QuizController.initQuiz(cleanTheme, {
        choiceCount: Number(choiceCount),
        count: normalizedQuestionCount,
        mediaDescription: describeThemeMedia(themeMedia),
        openAnswerMode,
        questionType,
      });
      onQuizReady(quiz);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de creer le quiz pour le moment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleThemeMedia = async () => {
    setError('');
    try {
      const media = await pickThemeMedia();
      if (media) setThemeMedia(media);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Chargement du support impossible.',
      );
    }
  };

  const handleDailyChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const quiz = await QuizController.initQuiz("Cinéma des années 90", {
        count: 5,
        questionType: 'mixed',
      });
      onQuizReady(quiz);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de lancer le défi pour le moment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Header displayName={account.displayName} />

        <View style={styles.scoreCardContainer}>
          <ScoreCard
            totalScore={account.totalScore}
            partiesPlayed={account.gamesPlayed}
            bestScore={account.bestScore}
            streak={7}
          />
        </View>

        {/* Grid Row 1: Orange (Nouveau Quiz) & White (Battle Royale) */}
        <View style={styles.gridRow1}>
          <View style={styles.orangeCardWrapper}>
            <QuizCard
              variant="primary"
              title="Nouveau Quiz"
              subtitle="Génère avec l'IA"
              icon="🧠"
              onClick={() => setActiveTab('quiz')}
            />
          </View>
          <View style={styles.battleCardWrapper}>
            <QuizCard
              variant="secondary"
              title="Battle"
              subtitle="Royale"
              icon="⚔️"
              iconColor="#ee6845"
              onClick={() => setActiveTab('battle')}
            />
          </View>
        </View>

        {/* Grid Row 2: Classement & Défi du jour */}
        <View style={styles.gridRow2}>
          <View style={styles.halfCardWrapper}>
            <QuizCard
              variant="secondary"
              title="Classement"
              subtitle="Top 12 mondial"
              icon="🏆"
              iconColor="#7a317a"
              onClick={() => setActiveTab('top')}
            />
          </View>
          <View style={styles.halfCardWrapper}>
            <QuizCard
              variant="secondary"
              title="Défi du jour"
              subtitle="Cinéma 90's"
              icon="🔥"
              iconColor="#ee6845"
              onClick={handleDailyChallenge}
            />
          </View>
        </View>

        {/* Section: Support de thème */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support de thème</Text>
          <TouchableOpacity onPress={handleThemeMedia} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Voir tout {'>'}</Text>
          </TouchableOpacity>
        </View>

        {themeMedia ? (
          <View style={styles.mediaBadge}>
            <Text style={styles.mediaBadgeTitle}>{themeMedia.name}</Text>
            <Text style={styles.mediaBadgeText}>
              {themeMedia.type || 'type inconnu'}
              {themeMedia.size ? ` · ${Math.round(themeMedia.size / 1024)} Ko` : ''}
            </Text>
            <TouchableOpacity onPress={() => setThemeMedia(null)}>
              <Text style={styles.mediaRemove}>Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.pillsRow}>
          <TouchableOpacity style={styles.pillButton} onPress={handleThemeMedia} activeOpacity={0.8}>
            <Text style={styles.pillEmoji}>🖼️</Text>
            <Text style={styles.pillText}>Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillButton} onPress={handleThemeMedia} activeOpacity={0.8}>
            <Text style={styles.pillEmoji}>🎧</Text>
            <Text style={styles.pillText}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillButton} onPress={handleThemeMedia} activeOpacity={0.8}>
            <Text style={styles.pillEmoji}>📹</Text>
            <Text style={styles.pillText}>Vidéo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillButton} onPress={handleThemeMedia} activeOpacity={0.8}>
            <Text style={styles.pillEmoji}>📄</Text>
            <Text style={styles.pillText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderQuizGeneratorForm = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header displayName={account.displayName} />
        
        <View style={styles.logoSection}>
          <LogoMark compact subtitle="Génère tes quiz avec l'IA" />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Quiz solo intelligent</Text>
          <Text style={styles.cardText}>
            Choisis un thème, puis définis obligatoirement le nombre de questions
            avant de lancer le mode {questionTypeLabel[questionType]}. Les QCM ont
            au maximum 5 choix et les QRO peuvent être corrigées souplement ou
            strictement.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="ex: Mathématiques, Science-Fiction..."
            placeholderTextColor="#6B778C"
            value={theme}
            onChangeText={setTheme}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleStart}
          />
          <TouchableOpacity style={styles.mediaButton} onPress={handleThemeMedia}>
            <Text style={styles.mediaButtonText}>
              Charger un support de thème (audio, vidéo, image, document)
            </Text>
          </TouchableOpacity>
          {themeMedia ? (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeTitle}>{themeMedia.name}</Text>
              <Text style={styles.mediaBadgeText}>
                {themeMedia.type || 'type inconnu'}
                {themeMedia.size ? ` · ${Math.round(themeMedia.size / 1024)} Ko` : ''}
              </Text>
              <TouchableOpacity onPress={() => setThemeMedia(null)}>
                <Text style={styles.mediaRemove}>Retirer</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.optionLabel}>Format des questions</Text>
          <View style={styles.segmentedRow}>
            <OptionChip
              active={questionType === 'mixed'}
              label="Mixte"
              onPress={() => setQuestionType('mixed')}
            />
            <OptionChip
              active={questionType === 'mcq'}
              label="QCM"
              onPress={() => setQuestionType('mcq')}
            />
            <OptionChip
              active={questionType === 'open'}
              label="QRO"
              onPress={() => setQuestionType('open')}
            />
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.settingBox}>
              <Text style={styles.optionLabel}>Nombre de questions</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#6B778C"
                value={questionCount}
                onChangeText={value =>
                  setQuestionCount(clampNumber(value, 1, 20))
                }
              />
            </View>
            {questionType !== 'open' ? (
              <View style={styles.settingBox}>
                <Text style={styles.optionLabel}>Choix QCM</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="4"
                  placeholderTextColor="#6B778C"
                  value={choiceCount}
                  onChangeText={value => setChoiceCount(clampNumber(value, 2, 5))}
                />
              </View>
            ) : null}
          </View>

          {questionType !== 'mcq' ? (
            <>
              <Text style={styles.optionLabel}>Correction des réponses ouvertes</Text>
              <View style={styles.segmentedRow}>
                <OptionChip
                  active={openAnswerMode === 'flexible'}
                  label="Souple"
                  onPress={() => setOpenAnswerMode('flexible')}
                />
                <OptionChip
                  active={openAnswerMode === 'exact'}
                  label="Nom exact"
                  onPress={() => setOpenAnswerMode('exact')}
                />
              </View>
              <Text style={styles.helperText}>
                Souple accepte synonymes et petites fautes. Nom exact exige la
                bonne orthographe pour les personnes, lieux ou termes précis.
              </Text>
            </>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              (!theme.trim() || loading) && styles.buttonDisabled,
            ]}
            onPress={handleStart}
            disabled={loading || !theme.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Générer {normalizedQuestionCount} questions</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderDashboard();
      case 'quiz':
        return renderQuizGeneratorForm();
      case 'battle':
        return (
          <BattleRoyaleView
            account={account}
            navigation={navigation as any}
            onBack={() => setActiveTab('home')}
            onStartBattle={onStartBattle}
          />
        );
      case 'top':
        return (
          <LeaderboardView
            onBack={() => setActiveTab('home')}
          />
        );
      case 'profile':
        return (
          <ProfileView
            account={account}
            navigation={navigation as any}
            onAccountUpdated={onAccountUpdated}
            onSignOut={onSignOut}
          />
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      <BottomNavigation
        items={NAV_ITEMS}
        activeItem={activeTab}
        onItemPress={(tabId) => setActiveTab(tabId as any)}
      />
    </View>
  );
};

const clampNumber = (value: string, min: number, max: number) => {
  const numeric = Math.max(min, Math.min(max, Math.floor(Number(value) || min)));
  return String(numeric);
};

const OptionChip = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.optionChip, active && styles.optionChipActive]}
    onPress={onPress}
  >
    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  logoSection: {
    marginVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 18,
    marginHorizontal: SPACING.lg,
    padding: SPACING.xl,
  },
  label: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardText: {
    color: '#5E6C84',
    lineHeight: 20,
    marginBottom: 14,
  },
  optionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  optionChip: {
    borderColor: '#DFE1E6',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  optionChipTextActive: {
    color: COLORS.textOnDark,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  settingBox: {
    flex: 1,
  },
  helperText: {
    color: '#6B778C',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  mediaButton: {
    alignItems: 'center',
    borderColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 13,
  },
  mediaButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  mediaBadge: {
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    gap: 4,
    marginHorizontal: SPACING.lg,
    marginBottom: 14,
    padding: 12,
  },
  mediaBadgeTitle: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  mediaBadgeText: {
    color: '#5E6C84',
    fontSize: 12,
  },
  mediaRemove: {
    color: COLORS.error,
    fontWeight: '900',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 14,
    padding: 15,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 18,
  },
  buttonDisabled: {
    backgroundColor: '#B3D4FF',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Dashboard Specific Styles
  scoreCardContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: 18,
  },
  gridRow1: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    gap: 12,
  },
  gridRow2: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: 18,
    gap: 12,
  },
  orangeCardWrapper: {
    flex: 1.8,
  },
  battleCardWrapper: {
    flex: 1,
  },
  halfCardWrapper: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
  },
  seeAllText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: 24,
    gap: 8,
  },
  pillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingVertical: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e1d33',
  },
});

export default HomeView;
