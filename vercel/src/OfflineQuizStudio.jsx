import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMediaPayloadFromFile,
  categoryLabel,
  formatBytes,
  MEDIA_ACCEPT,
} from './utils/mediaPayload.web.js';
import {
  getPanelAdminKey,
  getStoredIdToken,
  PANEL_KEY_CHANGED_EVENT,
  postPanelApi,
} from './panelApi.js';

const MAX_QUESTIONS = 50;

const PROGRESS_STEPS = [
  { until: 18, label: 'Préparation de la requête…' },
  { until: 42, label: 'Analyse du thème et du support…' },
  { until: 72, label: 'Génération des questions…' },
  { until: 88, label: 'Validation du format JSON…' },
  { until: 96, label: 'Finalisation…' },
];

const labelForProgress = value => {
  const step = PROGRESS_STEPS.find(item => value < item.until);
  return step?.label || 'Presque terminé…';
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
  const [provider, setProvider] = useState('mistral');
  const [adminKey, setAdminKey] = useState(() => getPanelAdminKey());
  const [mediaMeta, setMediaMeta] = useState(null);
  const [mediaPayload, setMediaPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [acceptFilter, setAcceptFilter] = useState('any');
  const progressTimerRef = useRef(null);
  const feedbackRef = useRef(null);

  useEffect(() => {
    const syncAdminKey = () => setAdminKey(getPanelAdminKey());
    syncAdminKey();
    window.addEventListener('focus', syncAdminKey);
    window.addEventListener(PANEL_KEY_CHANGED_EVENT, syncAdminKey);
    return () => {
      window.removeEventListener('focus', syncAdminKey);
      window.removeEventListener(PANEL_KEY_CHANGED_EVENT, syncAdminKey);
    };
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(timeoutMs => {
    stopProgressTimer();
    const startedAt = Date.now();
    setProgress(2);
    setProgressLabel(PROGRESS_STEPS[0].label);
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / timeoutMs, 1);
      const eased = 1 - (1 - ratio) ** 1.35;
      const next = Math.min(96, Math.max(2, Math.round(eased * 96)));
      setProgress(next);
      setProgressLabel(labelForProgress(next));
    }, 180);
  }, [stopProgressTimer]);

  useEffect(() => () => stopProgressTimer(), [stopProgressTimer]);
  const previewCount = result?.questions?.length ?? 0;

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

  const scrollToFeedback = () => {
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const runGenerate = async event => {
    event?.preventDefault?.();

    const cleanTheme = theme.trim();
    const panelAdminKey = getPanelAdminKey();

    if (!cleanTheme && !mediaPayload) {
      const msg =
        'Indique un thème dans le champ texte ou charge un fichier (audio, image, PDF…).';
      setError(msg);
      setStatusMessage('');
      scrollToFeedback();
      return;
    }
    if (!panelAdminKey) {
      const msg =
        'Clé admin absente. Paramètres → Cle admin panel → Enregistrer (valeur = ADMIN_PANEL_KEY sur Vercel).';
      setError(msg);
      setStatusMessage('');
      scrollToFeedback();
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('Envoi de la requête à l’API QuizBit…');
    setResult(null);
    let succeeded = false;

    const timeoutMs =
      mediaPayload?.category === 'audio' || mediaPayload?.category === 'video'
        ? 120000
        : count > 20
          ? 90000
          : 60000;

    startProgressTimer(timeoutMs);
    scrollToFeedback();

    let requestBody;
    try {
      requestBody = {
        prompt: cleanTheme || 'Quiz basé sur le support fourni',
        count: Math.min(MAX_QUESTIONS, Math.max(1, count)),
        provider,
        choiceCount,
        questionType,
        openAnswerMode,
        panelAdminKey,
        source: 'offline-studio',
      };
      if (mediaPayload) {
        requestBody.mediaPayload = mediaPayload;
      }
    } catch (err) {
      stopProgressTimer();
      setLoading(false);
      setError(err.message || 'Impossible de préparer la requête.');
      scrollToFeedback();
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      setStatusMessage(`Génération en cours (${provider})…`);

      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const hint =
          response.status === 401
            ? ' Vérifie que ADMIN_PANEL_KEY et VITE_ADMIN_PANEL_KEY sont identiques sur Vercel.'
            : '';
        throw new Error((data.message || `HTTP ${response.status}`) + hint);
      }
      if (!Array.isArray(data.questions) || !data.questions.length) {
        throw new Error(
          'L’IA n’a renvoyé aucune question valide. Réduis le nombre, passe en format mixte ou choisis Mistral.',
        );
      }

      stopProgressTimer();
      setProgress(92);
      setProgressLabel('Enregistrement dans la banque…');
      setStatusMessage('Questions reçues, enregistrement optionnel…');
      setResult(data);

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

      setProgress(100);
      setProgressLabel('Questionnaire prêt');
      setStatusMessage(
        `${data.questions.length} question(s) générées — export JSON disponible à droite.`,
      );
      succeeded = true;
    } catch (err) {
      stopProgressTimer();
      setProgress(0);
      setProgressLabel('');
      const msg =
        err.name === 'AbortError'
          ? 'Délai dépassé. Réduis le nombre de questions ou utilise un fichier plus court.'
          : err.message || 'Génération impossible.';
      setError(msg);
      setStatusMessage('');
      scrollToFeedback();
    } finally {
      setLoading(false);
      if (succeeded) {
        setTimeout(() => {
          setProgress(0);
          setProgressLabel('');
        }, 1200);
      }
    }
  };

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

  const hasInput = Boolean(theme.trim() || mediaPayload);
  const readyToGenerate = hasInput && Boolean(adminKey) && !loading;

  return (
    <div className="offline-studio">
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

          <form className="offline-generate-form" onSubmit={runGenerate}>
            <div ref={feedbackRef} className="offline-feedback">
              {!hasInput ? (
                <p className="offline-hint">
                  Étape requise : saisis un thème ou ajoute un fichier ci-dessus.
                </p>
              ) : null}
              {hasInput && !adminKey ? (
                <div className="ai-error">
                  Clé admin absente. <strong>Paramètres</strong> → colle{' '}
                  <code>ADMIN_PANEL_KEY</code> (Vercel) → <strong>Enregistrer la clé</strong>.
                </div>
              ) : null}
              {statusMessage ? (
                <p className="offline-status" role="status">
                  {statusMessage}
                </p>
              ) : null}
              {error ? <div className="ai-error">{error}</div> : null}
              {loading ? (
                <div className="offline-progress" role="progressbar" aria-valuenow={progress}>
                  <div className="offline-progress-track">
                    <div
                      className="offline-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="offline-progress-meta">
                    <strong>{progress}%</strong>
                    <span>{progressLabel}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="ai-actions">
              <button
                type="submit"
                className={`btn primary${loading ? ' is-loading' : ''}${readyToGenerate ? '' : ' btn-dim'}`}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? `Génération… ${progress}%` : 'Générer le questionnaire'}
              </button>
            </div>
          </form>
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
