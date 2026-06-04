import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

type RuntimeConfig = Record<string, string | undefined>;

const API_MODE_KEY = 'quizbit.apiMode';
const LOCAL_API_URL = 'http://localhost:3000'; // Assume local server runs on port 3000

const friendlyApiMessage = (message: string, path: string): string => {
  if (message === 'CONFIGURATION_NOT_FOUND') {
    return [
      'Firebase Auth n est pas configure sur le serveur distant.',
      'Active Firebase Authentication et le fournisseur Email/Mot de passe dans Firebase Console.',
    ].join(' ');
  }
  if (/Failed to fetch|Network request failed|NetworkError/i.test(message)) {
    return `Serveur injoignable (${API_BASE_URL}${path}).`;
  }
  return message;
};

const readRuntimeValue = (name: string): string => {
  const nativeConfig = Config as unknown as RuntimeConfig;
  const maybeProcess = (
    globalThis as unknown as { process?: { env?: Record<string, string> } }
  ).process;
  return nativeConfig[name] || maybeProcess?.env?.[name] || '';
};

export const getApiBaseUrl = async (): Promise<string> => {
  const mode = await AsyncStorage.getItem(API_MODE_KEY);
  if (mode === 'local') {
    return LOCAL_API_URL;
  }
  return (
    readRuntimeValue('VERCEL_API_BASE_URL') || 'https://quizbit-admin.vercel.app'
  ).replace(/\/$/, '');
};

export const setApiMode = async (mode: 'local' | 'remote') => {
  await AsyncStorage.setItem(API_MODE_KEY, mode);
};

export let API_BASE_URL = (
  readRuntimeValue('VERCEL_API_BASE_URL') || 'https://quizbit-admin.vercel.app'
).replace(/\/$/, '');

// Initialize URL on load (best effort, async)
getApiBaseUrl().then(url => { API_BASE_URL = url; });

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(
      friendlyApiMessage(
        data?.message || `API ${path} HTTP ${response.status}`,
        path,
      ),
    );
  }
  return data as T;
};
