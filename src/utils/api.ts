import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { Platform } from 'react-native';

type RuntimeConfig = Record<string, string | undefined>;
type ApiMode = 'local' | 'remote';

const API_MODE_KEY = 'quizbit.apiMode';
const OFFLINE_HOST_KEY = 'quizbit.offlineApiHost';

const defaultOfflineHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const defaultOfflinePort = '3000';

const friendlyApiMessage = (message: string, path: string): string => {
  if (message === 'CONFIGURATION_NOT_FOUND') {
    return [
      'Firebase Auth n est pas configure sur le serveur distant.',
      'Active Firebase Authentication et le fournisseur Email/Mot de passe dans Firebase Console.',
    ].join(' ');
  }
  if (/Failed to fetch|Network request failed|NetworkError/i.test(message)) {
    return `Serveur injoignable (${API_BASE_URL}${path}). Verifie le mode offline et l IP du serveur local.`;
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

export const getOfflineApiHost = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(OFFLINE_HOST_KEY);
  if (saved?.trim()) return saved.trim();
  return readRuntimeValue('OFFLINE_API_HOST') || defaultOfflineHost;
};

export const setOfflineApiHost = async (host: string) => {
  await AsyncStorage.setItem(OFFLINE_HOST_KEY, host.trim());
};

export const buildLocalApiUrl = async () => {
  const host = await getOfflineApiHost();
  const port = readRuntimeValue('OFFLINE_API_PORT') || defaultOfflinePort;
  return `http://${host}:${port}`.replace(/\/$/, '');
};

export const getApiMode = async (): Promise<ApiMode> => {
  const mode = await AsyncStorage.getItem(API_MODE_KEY);
  return mode === 'local' ? 'local' : 'remote';
};

export const getApiBaseUrl = async (): Promise<string> => {
  const mode = await getApiMode();
  if (mode === 'local') {
    return buildLocalApiUrl();
  }
  return (
    readRuntimeValue('VERCEL_API_BASE_URL') || 'https://quizbit-admin.vercel.app'
  ).replace(/\/$/, '');
};

export const setApiMode = async (mode: ApiMode) => {
  await AsyncStorage.setItem(API_MODE_KEY, mode);
};

export let API_BASE_URL = (
  readRuntimeValue('VERCEL_API_BASE_URL') || 'https://quizbit-admin.vercel.app'
).replace(/\/$/, '');

getApiBaseUrl().then(url => {
  API_BASE_URL = url;
});

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
