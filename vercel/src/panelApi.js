const env = import.meta.env;

const SESSION_PANEL_KEY = 'quizbit_panel_admin_key';
const SESSION_ID_TOKEN = 'quizbit_admin_id_token';

export const PANEL_KEY_CHANGED_EVENT = 'quizbit-panel-key-changed';
export const FIRESTORE_SESSION_EVENT = 'quizbit-firestore-session-changed';

const notifyFirestoreSession = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FIRESTORE_SESSION_EVENT));
  }
};

export const getBuildPanelKey = () =>
  env.VITE_ADMIN_PANEL_KEY || env.REACT_APP_ADMIN_PANEL_KEY || '';

export const getPanelAdminKey = () => {
  const fromBuild = getBuildPanelKey().trim();
  if (fromBuild) return fromBuild;
  try {
    return sessionStorage.getItem(SESSION_PANEL_KEY) || '';
  } catch {
    return '';
  }
};

export const setSessionPanelKey = value => {
  try {
    const clean = String(value || '').trim();
    if (clean) sessionStorage.setItem(SESSION_PANEL_KEY, clean);
    else sessionStorage.removeItem(SESSION_PANEL_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(PANEL_KEY_CHANGED_EVENT));
    }
  } catch {
    // ignore
  }
};

export const getStoredIdToken = () => {
  try {
    return sessionStorage.getItem(SESSION_ID_TOKEN) || '';
  } catch {
    return '';
  }
};

export const setStoredIdToken = value => {
  try {
    const clean = String(value || '').trim();
    if (clean) sessionStorage.setItem(SESSION_ID_TOKEN, clean);
    else sessionStorage.removeItem(SESSION_ID_TOKEN);
    notifyFirestoreSession();
  } catch {
    // ignore
  }
};

export const hasFirestoreSession = () => Boolean(getStoredIdToken());

export const postPanelApi = async (route, body = {}) => {
  const panelAdminKey = getPanelAdminKey();
  if (!panelAdminKey) {
    throw new Error(
      'Cle admin panel manquante (VITE_ADMIN_PANEL_KEY ou saisie dans Parametres / Studio).',
    );
  }

  const response = await fetch(`/api/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      panelAdminKey,
      idToken: body.idToken || getStoredIdToken() || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};
