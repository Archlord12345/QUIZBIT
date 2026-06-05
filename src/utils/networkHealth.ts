import { Platform } from 'react-native';
import { getApiBaseUrl, getApiMode } from './api';

export type ApiHealth = {
  ok: boolean;
  url: string;
  mode: 'local' | 'remote';
  message: string;
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs = 10000,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const checkApiHealth = async (): Promise<ApiHealth> => {
  const url = await getApiBaseUrl();
  const mode = await getApiMode();
  const healthPath =
    mode === 'local' ? `${url}/api/health` : `${url}/api/firebase-auth`;

  try {
    const response = await fetchWithTimeout(healthPath, { method: 'GET' });
    if (response.ok) {
      return {
        ok: true,
        url,
        mode,
        message:
          mode === 'local'
            ? 'Serveur local accessible.'
            : 'API QuizBit accessible.',
      };
    }
    return {
      ok: false,
      url,
      mode,
      message: `Serveur repondu avec HTTP ${response.status} (${url}).`,
    };
  } catch (error) {
    const hint =
      mode === 'local'
        ? Platform.OS === 'android' && url.includes('10.0.2.2')
          ? 'Sur un vrai telephone, remplace 10.0.2.2 par l IP Wi-Fi du PC (ex. http://192.168.1.42:3000) dans Parametres, puis Enregistrer. Lance: cd local && npm start'
          : 'Verifie que le serveur local tourne (cd local && npm start) et que le telephone est sur le meme Wi-Fi.'
        : 'Verifie ta connexion Internet et desactive le mode offline dans Parametres de connexion.';

    const detail =
      error instanceof Error && error.name === 'AbortError'
        ? 'Delai depasse (10 s).'
        : error instanceof Error
          ? error.message
          : 'Erreur reseau';

    return {
      ok: false,
      url,
      mode,
      message: `Serveur injoignable (${url}). ${detail} ${hint}`,
    };
  }
};
