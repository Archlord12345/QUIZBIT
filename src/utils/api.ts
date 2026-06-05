import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { Platform } from 'react-native';

type RuntimeConfig = Record<string, string | undefined>;
type ApiMode = 'local' | 'remote';

const API_MODE_KEY = 'quizbit.apiMode';
const OFFLINE_HOST_KEY = 'quizbit.offlineApiHost';
const OFFLINE_API_URL_KEY = 'quizbit.offlineApiUrl';

const defaultOfflineHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const defaultOfflinePort = '3000';

const normalizeApiBaseUrl = (value: string): string =>
  value.trim().replace(/\/+$/, '');

/** URL complète (http://host:port) ou hôte seul (10.0.2.2, 192.168.x.x). */
export const normalizeOfflineServerInput = (raw: string): string => {
  const value = raw.trim();
  if (!value) {
    return `http://${defaultOfflineHost}:${defaultOfflinePort}`;
  }
  if (/^https?:\/\//i.test(value)) {
    return normalizeApiBaseUrl(value);
  }
  const withoutSlashes = value.replace(/^\/+|\/+$/g, '');
  if (withoutSlashes.includes(':')) {
    return normalizeApiBaseUrl(`http://${withoutSlashes}`);
  }
  const port = readRuntimeValue('OFFLINE_API_PORT') || defaultOfflinePort;
  return `http://${withoutSlashes}:${port}`;
};

const buildNetworkErrorMessage = async (path: string): Promise<string> => {
  const baseUrl = await getApiBaseUrl();
  const mode = await getApiMode();
  if (mode === 'local') {
    const offlineHint =
      Platform.OS === 'android' && baseUrl.includes('10.0.2.2')
        ? 'Sur telephone reel, utilise l IP Wi-Fi du PC (ex. http://192.168.1.42:3000) dans Parametres, pas 10.0.2.2.'
        : 'Lance le serveur local: cd local && npm start. Meme Wi-Fi que le telephone.';
    return `Serveur local injoignable (${baseUrl}${path}). ${offlineHint}`;
  }
  return [
    `Serveur distant injoignable (${baseUrl}${path}).`,
    'Verifie Internet et desactive le mode offline dans Parametres de connexion.',
  ].join(' ');
};

const friendlyApiMessage = async (
  message: string,
  path: string,
): Promise<string> => {
  if (message === 'CONFIGURATION_NOT_FOUND') {
    return [
      'Firebase Auth n est pas configure sur le serveur distant.',
      'Active Firebase Authentication et le fournisseur Email/Mot de passe dans Firebase Console.',
    ].join(' ');
  }
  if (
    /Connexion requise|Session Firebase invalide|Token Firebase manquant|Session manquante/i.test(
      message,
    )
  ) {
    return 'Session expiree ou invalide. Deconnecte-toi puis reconnecte-toi.';
  }
  if (
    /Failed to fetch|Network request failed|NetworkError|abort|Aborted/i.test(
      message,
    )
  ) {
    return buildNetworkErrorMessage(path);
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

export const getOfflineApiUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(OFFLINE_API_URL_KEY);
  if (saved?.trim()) {
    return normalizeOfflineServerInput(saved);
  }
  const host = await getOfflineApiHost();
  const port = readRuntimeValue('OFFLINE_API_PORT') || defaultOfflinePort;
  return normalizeOfflineServerInput(`${host}:${port}`);
};

export const setOfflineApiUrl = async (url: string) => {
  const normalized = normalizeOfflineServerInput(url);
  await AsyncStorage.setItem(OFFLINE_API_URL_KEY, normalized);
  const withoutScheme = normalized.replace(/^https?:\/\//i, '');
  const hostOnly = withoutScheme.split('/')[0]?.split(':')[0] || defaultOfflineHost;
  await AsyncStorage.setItem(OFFLINE_HOST_KEY, hostOnly);
  if ((await getApiMode()) === 'local') {
    API_BASE_URL = normalized;
  }
};

export const buildLocalApiUrl = async () => getOfflineApiUrl();

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
  API_BASE_URL = await getApiBaseUrl();
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
      await friendlyApiMessage(
        data?.message || `API ${path} HTTP ${response.status}`,
        path,
      ),
    );
  }
  return data as T;
};
