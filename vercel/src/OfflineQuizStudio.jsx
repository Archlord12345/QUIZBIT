import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  buildMediaPayloadFromFile,
  categoryLabel,
  formatBytes,
  MEDIA_ACCEPT,
} from './utils/mediaPayload.web.js';
import { getPanelAdminKey, getStoredIdToken, postPanelApi } from './panelApi.js';

const env = import.meta.env;
const BUILD_PANEL_KEY =
  env.VITE_ADMIN_PANEL_KEY || env.REACT_APP_ADMIN_PANEL_KEY || '';
const SESSION_KEY = 'quizbit_panel_admin_key';
const MAX_QUESTIONS = 50;

const readSessionKey = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
};

const downloadFile = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function ModePill({ mode }) {
  return (
    <span className={`mode-pill ${mode === 'open' ? 'open' : 'mcq'}`}>
      {mode === 'open' ? 'QRO' : 'QCM'}
    </span>
  );
}

function QuestionPreviewList({ questions }) {
  if (!questions?.length) {
    return <p className="offline-empty">Aucune question dans l&apos;aperçu.</p>;
  }
  return (
    <div className="question-list">
      {questions.map((question, index) => (
        <div className="question-card" key={question.id || index}>
          <div className="question-top">
            <strong>#{index + 1}</strong>
            <ModePill mode={question.type === 'open' ? 'open' : 'mcq'} />
          </div>
          <p>{question.text}</p>
          <div className="answer-line">
            Réponse : <strong>{question.answer}</strong>
          </div>
          {question.options?.length ? (
            <div className="choice-list">
              {question.options.map((opt, i) => (
                <span
                  key={i}
                  className={opt === question.answer ? 'choice good' : 'choice'}
                >
                  {opt}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function OfflineQuizStudio() {
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(8);
  const [choiceCount, setChoiceCount] = useState(4);
  const [questionType, setQuestionType] = useState('mixed');
  const [openAnswerMode, setOpenAnswerMode] = useState('flexible');
  const [provider, setProvider] = useState('auto');
  const [mediaMeta, setMediaMeta] = useState(null);
  const [mediaPayload, setMediaPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [acceptFilter, setAcceptFilter] = useState('any');
  const [sessionKey, setSessionKey] = useState(readSessionKey);

  const panelAdminKey = useMemo(
    () => (BUILD_PANEL_KEY || sessionKey).trim(),
    [sessionKey],
  );
  const keyFromBuild = Boolean(BUILD_PANEL_KEY.trim());
  const previewCount = result?.questions?.length ?? 0;

  const persistSessionKey = value => {
    const clean = value.trim();
    setSessionKey(clean);
    try {
      if (clean) sessionStorage.setItem(SESSION_KEY, clean);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore private mode
    }
  };

  const pickFile = filter => {
    setAcceptFilter(filter);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const onFileSelected = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const payload = await buildMediaPayloadFromFile(file);
      setMediaPayload(payload);
      setMediaMeta({
        name: file.name,
        size: file.size,
        category: payload.category,
        mimeType: payload.mimeType,
      });
      if (!theme.trim()) {
        const base = file.name.replace(/\.[^.]+$/, '').trim();
        setTheme(base || 'Quiz depuis support');
      }
    } catch (err) {
      setError(err.message || 'Fichier non supporté.');
      setMediaPayload(null);
      setMediaMeta(null);
    }
  };

  const clearMedia = () => {
    setMediaPayload(null);
    setMediaMeta(null);
  };

  const generate = useCallback(async () => {
    const cleanTheme = theme.trim();
    if (!cleanTheme && !mediaPayload) {
      setError('Indique un thème ou charge un fichier (audio, vidéo, image, PDF, texte).');
      return;
    }
    if (!panelAdminKey) {
      setError(
        'Clé admin requise : définis VITE_ADMIN_PANEL_KEY au build Vercel, ou saisis la clé ci-dessous (identique à ADMIN_PANEL_KEY).',
      );
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutMs =
        mediaPayload?.category === 'audio' || mediaPayload?.category === 'video'
          ? 120000
          : count > 20
          ? 90000
          : 60000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: cleanTheme || 'Quiz basé sur le support fourni',
          count: Math.min(MAX_QUESTIONS, Math.max(1, count)),
          provider,
          choiceCount,
          questionType,
          openAnswerMode,
          panelAdminKey,
          source: 'offline-studio',
          mediaPayload: mediaPayload || undefined,
        }),
      });
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      if (!Array.isArray(data.questions) || !data.questions.length) {
        throw new Error(
          'L’IA n’a renvoyé aucune question valide. Réduis le nombre, change le format (mixte) ou réessaie avec Gemini.',
        );
      }
      setResult(data);

      if (getPanelAdminKey()) {
        try {
          await postPanelApi('admin-save-quiz', {
            theme: cleanTheme || 'Quiz importé',
            questions: data.questions,
            provider: data.provider,
            model: data.model,
            format: 'quizbit-quiz-v1',
            source: 'offline-studio',
            idToken: getStoredIdToken() || undefined,
          });
        } catch (saveErr) {
          console.warn('Sauvegarde Firestore quiz:', saveErr);
        }
      }
    } catch (err) {
      setError(
        err.name === 'AbortError'
          ? 'Délai dépassé. Réduis le nombre de questions ou utilise un fichier plus court.'
          : err.message || 'Génération impossible.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    theme,
    mediaPayload,
    count,
    provider,
    choiceCount,
    questionType,
    openAnswerMode,
    panelAdminKey,
  ]);

  const buildExportPayload = () => {
    if (!result?.questions?.length) return null;
    return {
      format: 'quizbit-quiz-v1',
      version: 1,
      createdAt: new Date().toISOString(),
      theme: theme.trim() || 'Quiz importé',
      provider: result.provider,
      model: result.model,
      questionType,
      openAnswerMode,
      sourceMedia: mediaMeta
        ? {
            fileName: mediaMeta.name,
            category: mediaMeta.category,
            mimeType: mediaMeta.mimeType,
            size: mediaMeta.size,
          }
        : null,
      questions: result.questions,
      offlineReady: true,
    };
  };

  const exportJson = () => {
    const payload = buildExportPayload();
    if (!payload) return;
    downloadFile(
      `quizbit-offline-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const copyJson = async () => {
    const payload = buildExportPayload();
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  const canGenerate = Boolean((theme.trim() || mediaPayload) && !loading && panelAdminKey);

  return (
    <div className="offline-studio">
      <section className="panel glass-panel offline-intro">
        <p>
          Questionnaires <strong>quizbit-quiz-v1</strong> pour le panel local et l&apos;app
          hors ligne. Supports : audio, vidéo, image, PDF, texte (max {MAX_QUESTIONS}{' '}
          questions).
        </p>
        {keyFromBuild ? (
          <div className="ai-note">Clé admin détectée au build (VITE_ADMIN_PANEL_KEY).</div>
        ) : panelAdminKey ? (
          <div className="ai-note">Clé admin en session (valide pour cette fenêtre).</div>
        ) : (
          <div className="offline-key-box">
            <label className="offline-field">
              Clé admin panel
              <input
                type="password"
                value={sessionKey}
                onChange={e => persistSessionKey(e.target.value)}
                placeholder="Même valeur que ADMIN_PANEL_KEY sur Vercel"
                autoComplete="off"
              />
            </label>
            <p className="offline-key-hint">
              Sans <code>VITE_ADMIN_PANEL_KEY</code> au déploiement, saisis ici la clé
              définie dans les variables Vercel (<code>ADMIN_PANEL_KEY</code>), puis
              clique Générer.
            </p>
          </div>
        )}
      </section>

      <div className="offline-grid">
        <section className="panel glass-panel">
          <h2>1. Thème et support</h2>
          <label className="offline-field">
            Thème / consigne
            <textarea
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="Ex: Mathématiques maternelle, histoire du Mali, analyse de cet audio..."
              rows={3}
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept={MEDIA_ACCEPT[acceptFilter] || MEDIA_ACCEPT.any}
            onChange={onFileSelected}
          />

          <div
            className="offline-dropzone"
            onDragOver={e => e.preventDefault()}
            onDrop={async e => {
              e.preventDefault();
              const file = e.dataTransfer?.files?.[0];
              if (!file) return;
              setError('');
              try {
                const payload = await buildMediaPayloadFromFile(file);
                setMediaPayload(payload);
                setMediaMeta({
                  name: file.name,
                  size: file.size,
                  category: payload.category,
                  mimeType: payload.mimeType,
                });
              } catch (err) {
                setError(err.message || 'Fichier non supporté.');
              }
            }}
          >
            <p>Glisse un fichier ou choisis le type :</p>
            <div className="offline-media-buttons">
              <button type="button" className="btn small" onClick={() => pickFile('audio')}>
                Audio
              </button>
              <button type="button" className="btn small" onClick={() => pickFile('image')}>
                Image
              </button>
              <button type="button" className="btn small" onClick={() => pickFile('video')}>
                Vidéo
              </button>
              <button type="button" className="btn small" onClick={() => pickFile('document')}>
                PDF / Doc
              </button>
              <button type="button" className="btn ghost small" onClick={() => pickFile('any')}>
                Tous types
              </button>
            </div>
          </div>

          {mediaMeta ? (
            <div className="offline-file-badge">
              <strong>
                {categoryLabel(mediaMeta.category)} · {mediaMeta.name}
              </strong>
              <span>
                {mediaMeta.mimeType} · {formatBytes(mediaMeta.size)}
              </span>
              <button type="button" className="btn ghost small" onClick={clearMedia}>
                Retirer
              </button>
            </div>
          ) : null}

          <h3>Options du quiz</h3>
          <div className="offline-options-grid">
            <label>
              Questions (1–{MAX_QUESTIONS})
              <input
                type="number"
                min={1}
                max={MAX_QUESTIONS}
                value={count}
                onChange={e =>
                  setCount(
                    Math.min(
                      MAX_QUESTIONS,
                      Math.max(1, Number(e.target.value) || 5),
                    ),
                  )
                }
              />
            </label>
            <label>
              Choix QCM
              <input
                type="number"
                min={2}
                max={5}
                value={choiceCount}
                onChange={e => setChoiceCount(Number(e.target.value) || 4)}
              />
            </label>
            <label>
              Format
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value)}
              >
                <option value="mixed">Mixte</option>
                <option value="mcq">QCM uniquement</option>
                <option value="open">Ouvert uniquement</option>
              </select>
            </label>
            <label>
              QRO
              <select
                value={openAnswerMode}
                onChange={e => setOpenAnswerMode(e.target.value)}
              >
                <option value="flexible">Souple</option>
                <option value="exact">Nom exact</option>
              </select>
            </label>
            <label>
              IA
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="auto">Auto (Gemini → Mistral)</option>
                <option value="gemini">Gemini (recommandé médias)</option>
                <option value="mistral">Mistral</option>
              </select>
            </label>
          </div>

          <div className="ai-actions">
            <button
              type="button"
              className="btn primary"
              disabled={!canGenerate}
              onClick={generate}
            >
              {loading ? 'Génération…' : 'Générer le questionnaire'}
            </button>
          </div>
          {error ? <div className="ai-error">{error}</div> : null}
        </section>

        <section className="panel glass-panel">
          <div className="offline-preview-head">
            <h2>2. Aperçu et export</h2>
            <span className="offline-count-badge">{previewCount} question(s)</span>
          </div>
          {result ? (
            <div className="ai-result">
              <div className="ai-model">
                {result.provider} / {result.model}
              </div>
              {result.offlineNote ? (
                <div className="ai-note">{result.offlineNote}</div>
              ) : null}
              <div className="ai-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={!previewCount}
                  onClick={exportJson}
                >
                  Télécharger JSON offline
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={!previewCount}
                  onClick={copyJson}
                >
                  Copier JSON
                </button>
              </div>
              <details className="offline-json-hint">
                <summary>Import panel local</summary>
                <pre>{`Outils → Importer quiz Vercel JSON\nformat: quizbit-quiz-v1`}</pre>
              </details>
              <QuestionPreviewList questions={result.questions} />
            </div>
          ) : (
            <p className="offline-empty">
              Génère un quiz pour voir l&apos;aperçu. Export compatible{' '}
              <code>npm run local:server</code> et mode offline de l&apos;app.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
