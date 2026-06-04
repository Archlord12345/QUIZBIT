import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Real View Imports
import HomeView from './src/views/HomeView';
import AuthView from './src/views/AuthView';
import QuizView from './src/views/QuizView';
import BattleRoyaleView from './src/views/BattleRoyaleView';
import LeaderboardView from './src/views/LeaderboardView';
import ProfileView from './src/views/ProfileView';
import SettingsView from './src/views/SettingsView';

// Controller & Type Imports
import AuthController, { UserAccount } from './src/controllers/AuthController';
import ScoreController from './src/controllers/ScoreController';
import BattleRoyaleController from './src/controllers/BattleRoyaleController';
import { QuizState } from './src/controllers/QuizController';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<UserAccount | null>(null);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const acc = await AuthController.restoreSession();
        if (acc) {
          await AuthController.setCurrentAccount(acc);
        }
        setAccount(acc);
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ee6845" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {account ? (
          <>
            <Stack.Screen name="Home">
              {(props) => (
                <HomeView
                  {...props}
                  account={account}
                  onAccountUpdated={(updatedAcc) => setAccount(updatedAcc)}
                  onSignOut={async () => {
                    await AuthController.signOut();
                    setAccount(null);
                  }}
                  onStartBattle={(room) => {
                    const quizState = {
                      theme: room.config.theme,
                      questions: room.questions || [],
                      hearts: 3,
                      score: 0,
                      currentIndex: 0,
                      timeLimitSeconds: room.config.mode === 'timed_mcq' ? room.config.timeLimitSeconds : undefined,
                    };
                    props.navigation.navigate('Quiz', { quiz: quizState, mode: 'battle_royale', room });
                  }}
                  onQuizReady={(quiz) => props.navigation.navigate('Quiz', { quiz, mode: 'solo' })}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Quiz">
              {(props) => {
                const { quiz, mode = 'solo', room } = (props.route.params as any) || {};
                return (
                  <QuizView
                    {...props}
                    initialQuiz={quiz}
                    mode={mode}
                    onComplete={async (finalScore, completedQuiz) => {
                      try {
                        if (mode === 'battle_royale' && room) {
                          await BattleRoyaleController.finishPlayer(
                            room,
                            account,
                            finalScore,
                          );
                          const refreshed = await AuthController.restoreSession();
                          if (refreshed) setAccount(refreshed);
                        } else {
                          const { account: updated } =
                            await ScoreController.recordScore(
                              account,
                              completedQuiz.theme,
                              finalScore,
                              'solo',
                            );
                          setAccount(updated);
                        }
                      } catch (err) {
                        console.error('onComplete error:', err);
                      }
                    }}
                    onExit={() => props.navigation.navigate('Home')}
                  />
                );
              }}
            </Stack.Screen>

            <Stack.Screen name="BattleRoyale">
              {(props) => (
                <BattleRoyaleView
                  {...props}
                  account={account}
                  onBack={() => props.navigation.goBack()}
                  onStartBattle={(room) => {
                    const quizState: QuizState = {
                      theme: room.config.theme,
                      questions: (room.questions || []) as any,
                      hearts: 3,
                      score: 0,
                      currentIndex: 0,
                      timeLimitSeconds: room.config.mode === 'timed_mcq' ? room.config.timeLimitSeconds : undefined,
                    };
                    props.navigation.navigate('Quiz', { quiz: quizState, mode: 'battle_royale', room });
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Leaderboard">
              {(props) => (
                <LeaderboardView
                  {...props}
                  account={account}
                  onBack={() => props.navigation.goBack()}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Profile">
              {(props) => (
                <ProfileView
                  {...props}
                  account={account}
                  onAccountUpdated={(updatedAcc) => setAccount(updatedAcc)}
                  onSignOut={async () => {
                    await AuthController.signOut();
                    setAccount(null);
                  }}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="Auth">
            {(props) => (
              <AuthView
                {...props}
                onAuthenticated={async acc => {
                  await AuthController.setCurrentAccount(acc);
                  setAccount(acc);
                }}
              />
            )}
          </Stack.Screen>
        )}
        
        {/* Settings view is always accessible for debug/config */}
        <Stack.Screen name="Settings">
          {(props) => (
            <SettingsView
              {...props}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f1122',
  },
});
