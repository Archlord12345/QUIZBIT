import Config from 'react-native-config';

type RuntimeConfig = Record<string, string | undefined>;

const friendlyApiMessage = (message: string, path: string): string => {
  if (message === 'CONFIGURATION_NOT_FOUND') {
    return [
      'Firebase Auth n est pas configure sur le serveur distant.',
      'Active Firebase Authentication et le fournisseur Email/Mot de passe dans Firebase Console.',
    ].join(' ');
  }
  if (/Failed to fetch|Network request failed|NetworkError/i.test(message)) {
    return `Serveur distant injoignable (${API_BASE_URL}${path}). Verifie VERCEL_API_BASE_URL et le deploiement Vercel.`;
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

export const API_BASE_URL = (
  readRuntimeValue('VERCEL_API_BASE_URL') || 'https://quizbit-admin.vercel.app'
).replace(/\/$/, '');

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
