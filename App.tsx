import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Real View Imports
import HomeView from './src/views/HomeView';
import AuthView from './src/views/AuthView';
import QuizView from './src/views/QuizView';
import SettingsView from './src/views/SettingsView';
import { COLORS } from './src/utils/theme';

// Controller & Type Imports
import AuthController, { UserAccount } from './src/controllers/AuthController';
import ScoreController from './src/controllers/ScoreController';
import BattleRoyaleController from './src/controllers/BattleRoyaleController';
import { requestAppPermissions } from './src/utils/appPermissions';
import { isSoloQuizSuccessful } from './src/utils/gameRewards';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<UserAccount | null>(null);

  useEffect(() => {
    requestAppPermissions();
  }, []);

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
                          const { account: updated } =
                            await ScoreController.recordScore(
                              account,
                              completedQuiz.theme || room.config.theme,
                              finalScore,
                              'battle_royale',
                            );
                          setAccount(updated);
                          try {
                            const finishResult =
                              await BattleRoyaleController.finishPlayer(
                                room,
                                account,
                                finalScore,
                              );
                            if (finishResult.account) {
                              await AuthController.applyAccountUpdate(
                                finishResult.account,
                              );
                              setAccount(finishResult.account);
                            }
                            return { cupAwarded: finishResult.cupAwarded };
                          } catch (finishErr) {
                            console.error('finishPlayer error:', finishErr);
                          }
                          return { cupAwarded: false };
                        }

                        const soloSuccess = isSoloQuizSuccessful(completedQuiz);
                        const { account: updated } =
                          await ScoreController.recordScore(
                            account,
                            completedQuiz.theme,
                            finalScore,
                            'solo',
                            { awardCup: soloSuccess },
                          );
                        setAccount(updated);
                        return { cupAwarded: soloSuccess };
                      } catch (err) {
                        console.error('onComplete error:', err);
                        return { cupAwarded: false };
                      }
                    }}
                    onExit={() => props.navigation.navigate('Home')}
                  />
                );
              }}
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
    backgroundColor: COLORS.background,
  },
});
