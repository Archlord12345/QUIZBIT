import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AuthController, { UserAccount } from './src/controllers/AuthController';
import BattleRoyaleController, {
  BattleRoyaleRoom,
} from './src/controllers/BattleRoyaleController';
import ScoreController, { GameMode } from './src/controllers/ScoreController';
import { QuizState } from './src/controllers/QuizController';
import AuthView from './src/views/AuthView';
import BattleRoyaleView from './src/views/BattleRoyaleView';
import HomeView from './src/views/HomeView';
import LeaderboardView from './src/views/LeaderboardView';
import QuizView from './src/views/QuizView';

type AppScreen = 'home' | 'battle' | 'leaderboard';

type ActiveQuiz = {
  state: QuizState;
  mode: GameMode;
  battleRoom?: BattleRoyaleRoom;
};

const App = () => {
  const [account, setAccount] = React.useState<UserAccount | null>(null);
  const [screen, setScreen] = React.useState<AppScreen>('home');
  const [activeQuiz, setActiveQuiz] = React.useState<ActiveQuiz | null>(null);
  const [savingScore, setSavingScore] = React.useState(false);

  const handleAuthenticated = (nextAccount: UserAccount) => {
    setAccount(nextAccount);
    setScreen('home');
  };

  const handleSignOut = async () => {
    await AuthController.signOut();
    setAccount(null);
    setActiveQuiz(null);
    setScreen('home');
  };

  const handleBattleStart = (room: BattleRoyaleRoom) => {
    if (!room.questions || room.questions.length === 0) {
      return;
    }

    setActiveQuiz({
      mode: 'battle_royale',
      battleRoom: room,
      state: {
        theme: room.config.theme,
        questions: room.questions,
        hearts: 1,
        score: 0,
        currentIndex: 0,
      },
    });
  };

  const handleQuizComplete = async (finalScore: number, quiz: QuizState) => {
    if (!account || !activeQuiz) {
      return;
    }

    setSavingScore(true);
    try {
      const result = await ScoreController.recordScore(
        account,
        quiz.theme,
        finalScore,
        activeQuiz.mode,
      );
      setAccount(result.account);

      if (activeQuiz.mode === 'battle_royale' && activeQuiz.battleRoom) {
        await BattleRoyaleController.finishPlayer(
          activeQuiz.battleRoom,
          account,
          finalScore,
        );
      }
    } finally {
      setSavingScore(false);
    }
  };

  if (!account) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  if (savingScore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="white" size="large" />
        <Text style={styles.loadingText}>Sauvegarde du score...</Text>
      </View>
    );
  }

  if (activeQuiz) {
    return (
      <QuizView
        initialQuiz={activeQuiz.state}
        mode={activeQuiz.mode}
        onComplete={handleQuizComplete}
        onExit={() => {
          setActiveQuiz(null);
          setScreen(activeQuiz.mode === 'battle_royale' ? 'battle' : 'home');
        }}
      />
    );
  }

  if (screen === 'battle') {
    return (
      <BattleRoyaleView
        account={account}
        onBack={() => setScreen('home')}
        onStartBattle={handleBattleStart}
      />
    );
  }

  if (screen === 'leaderboard') {
    return <LeaderboardView onBack={() => setScreen('home')} />;
  }

  return (
    <HomeView
      account={account}
      onAccountUpdated={setAccount}
      onBattle={() => setScreen('battle')}
      onLeaderboard={() => setScreen('leaderboard')}
      onQuizReady={quiz => setActiveQuiz({ state: quiz, mode: 'solo' })}
      onSignOut={handleSignOut}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0052CC',
    gap: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default App;
