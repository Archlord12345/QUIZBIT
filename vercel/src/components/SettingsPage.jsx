import React, { useEffect, useState } from 'react';
import {
  FIRESTORE_SESSION_EVENT,
  getPanelAdminKey,
  getStoredIdToken,
  setSessionPanelKey,
  setStoredIdToken,
} from '../panelApi.js';
import { downloadFile } from '../lib/format.js';
import { Panel } from './ui.jsx';
import { QuizPreview } from './QuizPreview.jsx';

const env = import.meta.env;

export function SettingsPage({
  diagnostics,
  firebaseConfig,
  firebaseEnabled,
  loading,
  results,
}) {
  const configRows = [
    [
      'Firebase client',
      firebaseEnabled,
      firebaseConfig.projectId || 'projectId manquant',
    ],
    [
      'Mistral route',
      results.mistral?.status === 'success',
      results.mistral?.message || 'Non teste',
    ],
    [
      'Firebase Auth serveur',
      results.auth?.status === 'success',
      results.auth?.message || 'Non teste',
    ],
    [
      'Gemini route',
      results.gemini?.status === 'success',
      results.gemini?.message || 'Non teste',
    ],
    [
      'Cloudinary route',
      results.cloudinary?.status === 'success',
      results.cloudinary?.message || 'Non teste',
    ],
  ];
  return (
    <div className="settings-grid">
      <Panel title="Diagnostics">
        <TestRow
          label="Firebase Firestore"
          loading={loading.firebase}
          onTest={diagnostics.firebase}
          result={results.firebase}
        />
        <TestRow
          label="Firebase Auth serveur"
          loading={loading.auth}
          onTest={diagnostics.auth}
          result={results.auth}
        />
        <TestRow
          label="Mistral AI API"
          loading={loading.mistral}
          onTest={diagnostics.mistral}
          result={results.mistral}
        />
        <TestRow
          label="Google Gemini API"
          loading={loading.gemini}
          onTest={diagnostics.gemini}
          result={results.gemini}
        />
        <TestRow
          label="Cloudinary Upload"
          loading={loading.cloudinary}
          onTest={diagnostics.cloudinary}
          result={results.cloudinary}
        />
      </Panel>
      <Panel title="Configuration">
        {configRows.map(([label, ok, detail]) => (
          <div className="config-row" key={label}>
            <strong>{label}</strong>
            <span className={ok ? 'status ok' : 'status warn'}>
              {ok ? 'OK' : 'A verifier'}
            </span>
            <small>{detail}</small>
          </div>
        ))}
      </Panel>
      <FirestoreAccessPanel onConnected={diagnostics.firebase} />
      <AiPromptTester />
    </div>
  );
}

function FirestoreAccessPanel({ onConnected }) {
  const [panelKey, setPanelKey] = useState(getPanelAdminKey());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredIdToken()));

  useEffect(() => {
    const syncSession = () => setHasToken(Boolean(getStoredIdToken()));
    window.addEventListener(FIRESTORE_SESSION_EVENT, syncSession);
    return () =>
      window.removeEventListener(FIRESTORE_SESSION_EVENT, syncSession);
  }, []);

  const savePanelKey = () => {
    const clean = panelKey.trim();
    if (!clean) {
      setMessage('Saisis la cle admin (identique a ADMIN_PANEL_KEY sur Vercel).');
      return;
    }
    setSessionPanelKey(clean);
    setMessage('Cle panel enregistree pour cette session.');
  };

  const loginFirestore = async () => {
    if (!getPanelAdminKey()) {
      setMessage(
        'Etape 1 : enregistre la cle admin panel avant de connecter Firestore.',
      );
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || password.length < 6) {
      setMessage('Email et mot de passe Firebase requis (6 caracteres min).');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      const token = data.account?.idToken || '';
      if (!token) {
        throw new Error('Connexion OK mais idToken Firebase manquant.');
      }
      setStoredIdToken(token);
      setHasToken(true);
      setPassword('');
      setMessage(
        `Connecte en tant que ${data.account?.displayName || data.account?.email}. Dashboard et CRUD Firestore actifs.`,
      );
      onConnected?.();
    } catch (err) {
      setMessage(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  const logoutFirestore = () => {
    setStoredIdToken('');
    setHasToken(false);
    setMessage('Session Firestore retiree.');
  };

  return (
    <Panel title="Acces Firestore (panel admin)">
      <div className="ai-tester">
        <div className="ai-note">
          <strong>Etape 1</strong> — Cle admin (ADMIN_PANEL_KEY sur Vercel).{' '}
          <strong>Etape 2</strong> — Compte Firebase du projet quizbit-cecc1
          (meme email/mot de passe que l&apos;app mobile). Alternative serveur :
          variables PANEL_FIRESTORE_EMAIL et PANEL_FIRESTORE_PASSWORD sur Vercel.
        </div>
        {hasToken ? (
          <p className="ai-note" style={{ color: 'var(--green)' }}>
            Session Firestore active pour ce navigateur.
          </p>
        ) : (
          <p className="ai-error" style={{ marginTop: 0 }}>
            Aucune session Firestore : le Dashboard et la sauvegarde des quiz
            echoueront tant que tu n&apos;as pas clique « Connecter Firestore ».
          </p>
        )}
        <label>
          Cle admin panel (session)
          <input
            type="password"
            value={panelKey}
            onChange={e => setPanelKey(e.target.value)}
            placeholder="Identique a ADMIN_PANEL_KEY"
          />
        </label>
        <button type="button" className="btn ghost" onClick={savePanelKey}>
          Enregistrer la cle
        </button>
        <label>
          Email Firebase (optionnel)
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@exemple.com"
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <div className="ai-actions">
          <button
            type="button"
            className="btn primary"
            disabled={loading}
            onClick={loginFirestore}
          >
            {loading ? 'Connexion…' : 'Connecter Firestore'}
          </button>
          {hasToken ? (
            <button type="button" className="btn ghost" onClick={logoutFirestore}>
              Deconnecter
            </button>
          ) : null}
        </div>
        {message ? <div className="ai-note">{message}</div> : null}
      </div>
    </Panel>
  );
}

function AiPromptTester() {
  const [prompt, setPrompt] = useState(
    'Créer un quiz sur les capitales africaines avec QCM et questions ouvertes',
  );
  const [count, setCount] = useState(5);
  const [loadingProvider, setLoadingProvider] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const loading = Boolean(loadingProvider);

  const exportGeneratedQuiz = () => {
    if (!result?.questions?.length) return;
    const payload = {
      createdAt: new Date().toISOString(),
      format: 'quizbit-quiz-v1',
      provider: result.provider,
      model: result.model,
      theme: prompt.trim(),
      questions: result.questions,
    };
    downloadFile(
      `quizbit-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const generate = async (provider = 'auto') => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    setLoadingProvider(provider);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          count,
          provider,
          panelAdminKey:
            env.VITE_ADMIN_PANEL_KEY || env.REACT_APP_ADMIN_PANEL_KEY || '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Generation impossible.');
    } finally {
      setLoadingProvider('');
    }
  };

  return (
    <Panel title="Test prompt IA">
      <div className="ai-tester">
        <div className="ai-note">
          Génère un quiz cloud, exporte-le en JSON, puis importe-le dans le panel local pour jouer ou tester offline.
        </div>
        <label>
          Prompt / thème
          <textarea
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder="Ex: Génère un quiz sur les planètes avec 3 QCM et 2 réponses ouvertes"
          />
        </label>
        <label>
          Nombre de questions
          <input
            min="1"
            max="20"
            type="number"
            value={count}
            onChange={event => setCount(Number(event.target.value || 5))}
          />
        </label>
        <div className="ai-actions">
          <button
            className="btn primary"
            disabled={loading || !prompt.trim()}
            onClick={() => generate('auto')}
          >
            {loadingProvider === 'auto'
              ? 'Generation...'
              : 'Tester (Mistral → Gemini)'}
          </button>
          <button
            className="btn ghost"
            disabled={loading || !prompt.trim()}
            onClick={() => generate('gemini')}
          >
            {loadingProvider === 'gemini'
              ? 'Gemini...'
              : 'Tester avec Gemini'}
          </button>
        </div>
        {error ? <div className="ai-error">{error}</div> : null}
        {result ? (
          <div className="ai-result">
            <div className="ai-model">
              Modèle: {result.provider ? `${result.provider} / ` : ''}
              {result.model}
            </div>
            <button className="btn ghost" onClick={exportGeneratedQuiz}>
              Exporter ce quiz JSON offline
            </button>
            {result.fallbackFrom ? (
              <div className="ai-note">
                {result.fallbackFrom === 'mistral'
                  ? 'Mistral indisponible (quota ou erreur), bascule automatique sur Gemini.'
                  : 'Gemini indisponible (quota ou erreur), bascule automatique sur Mistral.'}
              </div>
            ) : null}
            <QuizPreview questions={result.questions} />
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function TestRow({ label, loading, onTest, result }) {
  const status = result?.status || 'idle';
  const message = loading ? 'Test en cours...' : result?.message || 'Non teste';
  return (
    <div className="test-row" data-status={status}>
      <strong>{label}</strong>
      <button className="btn small" disabled={loading} onClick={onTest}>
        {loading ? 'Test...' : 'Tester'}
      </button>
      <span className={`result ${status}`}>
        <span className="result-dot" aria-hidden="true" />
        <span>{message}</span>
      </span>
    </div>
  );
}
