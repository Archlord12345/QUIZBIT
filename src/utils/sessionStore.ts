import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserAccount } from '../controllers/AuthController';

const SESSION_KEY = 'quizbit.currentAccount.v1';

export const saveSession = async (account: UserAccount) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(account));
};

export const loadSession = async (): Promise<UserAccount | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const account = JSON.parse(raw) as UserAccount;
    if (!account?.id || !account?.email || !account?.idToken) {
      await clearSession();
      return null;
    }
    return account;
  } catch {
    await clearSession();
    return null;
  }
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};
