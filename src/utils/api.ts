import Config from 'react-native-config';

type RuntimeConfig = Record<string, string | undefined>;

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
    throw new Error(data?.message || `API ${path} HTTP ${response.status}`);
  }
  return data as T;
};
