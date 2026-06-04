import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogoMark from './src/components/LogoMark';
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
import SettingsView from './src/views/SettingsView';

type ActiveQuiz = {
  state: QuizState;
  mode: GameMode;
  battleRoom?: BattleRoyaleRoom;
};

const Stack = createNativeStackNavigator();

const App = () => {
  const [account, setAccount] = React.useState<UserAccount | null>(null);
  const [activeQuiz, setActiveQuiz] = React.useState<ActiveQuiz | null>(null);
  const [restoringSession, setRestoringSession] = React.useState(true);
  const [savingScore, setSavingScore] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AuthController.restoreSession()
      .then(savedAccount => {
        if (mounted && savedAccount) setAccount(savedAccount);
      })
      .finally(() => {
        if (mounted) setRestoringSession(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthenticated = (nextAccount: UserAccount) => {
    setAccount(nextAccount);
  };

  const handleSignOut = async () => {
    await AuthController.signOut();
    setAccount(null);
    setActiveQuiz(null);
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
        timeLimitSeconds:
          room.config.mode === 'timed_mcq'
            ? room.config.timeLimitSeconds
            : undefined,
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
      await AuthController.setCurrentAccount(result.account);
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

  if (restoringSession || savingScore) {
    return (
      <View style={styles.loadingContainer}>
        <LogoMark
          compact
          subtitle={
            restoringSession
              ? 'Restauration de ta session...'
              : 'Sauvegarde du score...'
          }
        />
        <ActivityIndicator color="#21E7FF" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!account ? (
          <Stack.Screen name="Auth">
            {props => <AuthView {...props} onAuthenticated={handleAuthenticated} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home">
              {props => (
                <HomeView
                  {...props}
                  account={account}
                  onAccountUpdated={setAccount}
                  onBattle={() => props.navigation.navigate('Battle')}
                  onLeaderboard={() => props.navigation.navigate('Leaderboard')}
                  onQuizReady={quiz => setActiveQuiz({ state: quiz, mode: 'solo' })}
                  onSignOut={handleSignOut}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Battle">
              {props => (
                <BattleRoyaleView
                  {...props}
                  account={account}
                  onBack={() => props.navigation.goBack()}
                  onStartBattle={handleBattleStart}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Leaderboard">
              {props => (
                <LeaderboardView
                  {...props}
                  onBack={() => props.navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Settings">
              {props => (
                <SettingsView
                  {...props}
                  onBack={() => props.navigation.goBack()}
                />
              )}
            </Stack.Screen>
            {activeQuiz && (
              <Stack.Screen name="Quiz">
                {props => (
                  <QuizView
                    {...props}
                    initialQuiz={activeQuiz.state}
                    mode={activeQuiz.mode}
                    onComplete={handleQuizComplete}
                    onExit={() => {
                      setActiveQuiz(null);
                    }}
                  />
                )}
              </Stack.Screen>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
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
