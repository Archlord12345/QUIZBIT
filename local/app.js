/* eslint-env browser */
/* eslint-disable no-alert */
const STORAGE_KEY = 'quizbit-local-admin-v1';
const API_BASE_STORAGE_KEY = 'quizbit-local-api-base';

const defaultApiBase = () =>
  window.QUIZBIT_LOCAL_API ||
  (window.location.port === '4173'
    ? 'http://localhost:3000'
    : window.location.origin);

const normalizePanelApiBase = raw => {
  const value = String(raw || '').trim();
  if (!value) return defaultApiBase();
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/+$/, '');
  }
  const host = value.replace(/^\/+|\/+$/g, '');
  if (host.includes(':')) {
    return `http://${host}`.replace(/\/+$/, '');
  }
  return `http://${host}:3000`.replace(/\/+$/, '');
};

function getApiBase() {
  try {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (saved?.trim()) {
      return normalizePanelApiBase(saved);
    }
  } catch (error) {
    console.warn(error);
  }
  return normalizePanelApiBase(defaultApiBase());
}

const initialState = {
  quizzes: [],
  users: [],
  scores: [],
  battleRooms: [],
};

let state = loadState();
let currentPage = 'dashboard';
let editing = null;
let ollamaHealth = null;
/** Quiz charge pour le prochain salon ({ label, theme, questions }). */
let salonQuizDraft = null;

const pages = [
  ['dashboard', 'Dashboard'],
  ['quizzes', 'Quiz'],
  ['users', 'Joueurs'],
  ['scores', 'Scores'],
  ['battleRooms', 'Salons'],
  ['tools', 'Import / Export'],
  ['settings', 'Parametres'],
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : { ...initialState };
  } catch (error) {
    console.error(error);
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  pushStateToServer().catch(() => undefined);
}

async function pullStateFromServer() {
  try {
    const response = await fetch(`${getApiBase()}/api/admin/state`);
    const data = await response.json();
    if (data.ok && data.state) {
      state = { ...initialState, ...data.state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    }
  } catch (error) {
    console.warn('Sync serveur indisponible, localStorage utilise.', error);
  }
  return false;
}

async function pushStateToServer() {
  const response = await fetch(`${getApiBase()}/api/admin/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Sync serveur impossible.');
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setPage(page) {
  currentPage = page;
  render();
}

function mutate(nextState) {
  state = nextState;
  saveState();
  render();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span>QuizBit</span><small>Mode offline</small></div>
        <nav>${pages
          .map(
            ([id, label]) => `
              <button class="nav-button ${
                currentPage === id ? 'active' : ''
              }" data-page="${id}">
                <span>${label}</span>
              </button>`,
          )
          .join('')}</nav>
      </aside>
      <main class="main qb-page">
        ${renderHeader()}
        <div class="notice"><strong>Mode offline.</strong> Serveur API: <code>${getApiBase()}</code>. ${renderOllamaNotice()} Les donnees sont synchronisees avec l app mobile. Importe un quiz JSON exporte depuis Vercel pour enrichir la banque locale.</div>
        ${renderPage()}
      </main>
    </div>
    ${editing ? renderCrudEditor() : ''}
  `;

  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => setPage(button.dataset.page));
  });
  bindPageActions();
  if (currentPage === 'settings') {
    refreshOllamaHealth('ollama-settings-status');
  }
  if (currentPage === 'quizzes') {
    refreshOllamaHealth('ollama-status');
  }
}

function renderOllamaNotice() {
  if (!ollamaHealth) {
    return 'Ollama: verification en cours... ';
  }
  if (ollamaHealth.available) {
    return `Ollama actif (<code>${escapeHtml(ollamaHealth.model)}</code>). `;
  }
  if (ollamaHealth.enabled) {
    return `Ollama configure (<code>${escapeHtml(ollamaHealth.model)}</code>) — chargement au demarrage. `;
  }
  return 'Ollama desactive. ';
}

async function refreshOllamaHealth(statusId) {
  const status = statusId ? document.getElementById(statusId) : null;
  if (status) status.textContent = 'Verification Ollama...';
  try {
    const response = await fetch(`${getApiBase()}/api/health`);
    const data = await response.json();
    ollamaHealth = data.ollama || null;
    if (status) {
      if (ollamaHealth?.available) {
        status.textContent = `Ollama pret — ${ollamaHealth.model}`;
      } else if (ollamaHealth?.enabled) {
        status.textContent = `Ollama configure (${ollamaHealth.model}) — relance npm start si indisponible.`;
      } else {
        status.textContent = 'Ollama desactive sur ce serveur.';
      }
    }
    if (currentPage === 'dashboard') {
      render();
    }
  } catch (error) {
    ollamaHealth = null;
    if (status) {
      status.textContent = error.message || 'Ollama: serveur local injoignable.';
    }
  }
}

function renderHeader() {
  const label = pages.find(([id]) => id === currentPage)?.[1] || 'Dashboard';
  return `
    <header class="header">
      <div>
        <p class="eyebrow">QuizBit · Panel local</p>
        <h1>${label}</h1>
        <p>Administration locale pour developpement, demo et tests hors cloud — meme univers visuel que l app mobile.</p>
      </div>
    </header>
  `;
}

function renderPage() {
  if (currentPage === 'dashboard') return renderDashboard();
  if (currentPage === 'quizzes') return renderQuizzes();
  if (currentPage === 'users') return renderUsers();
  if (currentPage === 'scores') return renderScores();
  if (currentPage === 'battleRooms') return renderBattleRooms();
  if (currentPage === 'settings') return renderSettings();
  return renderTools();
}

function renderSettings() {
  const current = getApiBase();
  const saved = localStorage.getItem(API_BASE_STORAGE_KEY) || '';
  return `
    <section class="card">
      <h2>Parametres · Serveur API</h2>
      <p class="hint-box">
        URL utilisee par ce panel et pour synchroniser les donnees (defaut: origine actuelle ou
        <code>http://localhost:3000</code>).
      </p>
      <label class="field-label" for="api-base-input">URL du serveur</label>
      <input
        id="api-base-input"
        type="url"
        value="${escapeHtml(saved || current)}"
        placeholder="http://192.168.1.42:3000"
      />
      <div class="actions" style="margin-top:12px">
        <button class="button" type="button" id="save-api-base">Enregistrer l URL</button>
        <button class="button secondary" type="button" id="reset-api-base">Revenir au defaut</button>
      </div>
      <p class="hint-box">URL active: <code>${escapeHtml(current)}</code></p>
    </section>
    <section class="card">
      <h2>Ollama · IA locale</h2>
      <p class="hint-box">
        Genere des quiz sans cloud via Ollama (<code>OLLAMA_MODEL</code>,
        defaut <code>smollm2:135m-instruct-q4_1</code>).
      </p>
      <div class="actions">
        <button class="button" type="button" id="test-ollama-settings">Tester Ollama</button>
        <button class="button secondary" type="button" id="setup-ollama-hint">Commande d installation</button>
      </div>
      <p id="ollama-settings-status" class="hint-box">Statut non verifie.</p>
    </section>
  `;
}

function renderDashboard() {
  const bestScore = state.scores.reduce(
    (best, score) => Math.max(best, Number(score.score) || 0),
    0,
  );
  return `
    <section class="grid">
      ${statCard('Quiz', state.quizzes.length)}
      ${statCard('Joueurs', state.users.length)}
      ${statCard('Scores', state.scores.length)}
      ${statCard('Salons', state.battleRooms.length)}
      ${statCard('Best Score', bestScore)}
    </section>
  `;
}

function statCard(label, value) {
  return `<div class="card"><strong>${label}</strong><div class="stat-value">${value}</div></div>`;
}

function renderQuizzes() {
  return `
    <section class="card">
      <h2>Generer avec Ollama (IA locale)</h2>
      <p class="hint-box">
        Modele par defaut: <code>smollm2:135m-instruct-q4_1</code> (~98 Mo).
        Charge automatiquement au demarrage via <code>npm run local:serve</code>.
      </p>
      <div class="form-grid">
        <input id="ollama-theme" placeholder="Theme (ex. Histoire de France)" />
        <input id="ollama-count" type="number" min="1" max="10" value="5" placeholder="Questions" />
        <select id="ollama-type">
          <option value="mixed">Mixte</option>
          <option value="mcq">QCM</option>
          <option value="open">Ouvertes</option>
        </select>
      </div>
      <div class="actions">
        <button class="button" type="button" id="generate-ollama-quiz">Generer via Ollama</button>
        <button class="button secondary" type="button" id="test-ollama">Tester Ollama</button>
      </div>
      <p id="ollama-status" class="hint-box"></p>
    </section>
    <section class="card">
      <h2>Creer un quiz local (manuel)</h2>
      <div class="form-grid">
        <input id="quiz-theme" placeholder="Theme" />
        <input id="quiz-count" type="number" min="1" value="5" placeholder="Nombre questions" />
      </div>
      <button class="button" id="add-quiz">Ajouter quiz</button>
    </section>
    ${table(
      ['Theme', 'Questions', 'Date', 'Actions'],
      state.quizzes,
      quiz => `
      <td>${escapeHtml(quiz.theme)}</td>
      <td>${quiz.questions.length}</td>
      <td>${new Date(quiz.createdAt).toLocaleString()}</td>
      <td class="row-actions">
        <button class="button secondary" data-edit-quiz="${quiz.id}">Modifier</button>
        <button class="button danger" data-delete-quiz="${quiz.id}">Supprimer</button>
      </td>
    `,
    )}
  `;
}

function renderUsers() {
  return `
    <section class="card">
      <h2>Ajouter joueur local</h2>
      <div class="form-grid">
        <input id="user-name" placeholder="Pseudo" />
        <input id="user-email" placeholder="Email" />
      </div>
      <button class="button" id="add-user">Ajouter joueur</button>
    </section>
    ${table(
      ['Pseudo', 'Email', 'Parties', 'Total', 'Best', 'Actions'],
      state.users,
      user => `
      <td>${escapeHtml(user.displayName)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${user.gamesPlayed}</td>
      <td>${user.totalScore}</td>
      <td>${user.bestScore}</td>
      <td class="row-actions">
        <button class="button secondary" data-edit-user="${user.id}">Modifier</button>
        <button class="button danger" data-delete-user="${user.id}">Supprimer</button>
      </td>
    `,
    )}
  `;
}

function renderScores() {
  const rows = [...state.scores].sort(
    (a, b) => Number(b.score) - Number(a.score),
  );
  return `
    <section class="card">
      <h2>Ajouter score</h2>
      <div class="form-grid">
        <select id="score-user">${state.users.map(
          user =>
            `<option value="${user.id}">${escapeHtml(
              user.displayName,
            )}</option>`,
        )}</select>
        <input id="score-theme" placeholder="Theme" />
        <input id="score-value" type="number" min="0" value="0" placeholder="Score" />
        <select id="score-mode"><option value="solo">Solo</option><option value="battle_royale">Battle Royale</option></select>
      </div>
      <button class="button" id="add-score">Ajouter score</button>
    </section>
    ${table(
      ['Joueur', 'Theme', 'Score', 'Mode', 'Date', 'Actions'],
      rows,
      score => `
      <td>${escapeHtml(score.displayName)}</td>
      <td>${escapeHtml(score.theme)}</td>
      <td><strong>${score.score}</strong></td>
      <td><span class="badge ${
        score.mode === 'battle_royale' ? 'battle' : 'solo'
      }">${score.mode}</span></td>
      <td>${new Date(score.createdAt).toLocaleString()}</td>
      <td class="row-actions">
        <button class="button secondary" data-edit-score="${score.id}">Modifier</button>
        <button class="button danger" data-delete-score="${score.id}">Supprimer</button>
      </td>
    `,
    )}
  `;
}

function renderSalonQuizStatus() {
  if (!salonQuizDraft?.questions?.length) {
    return 'Aucun quiz charge — banque locale utilisee au demarrage de la partie.';
  }
  return `Quiz charge : <strong>${escapeHtml(salonQuizDraft.label)}</strong> — ${salonQuizDraft.questions.length} question(s) pretes pour ce salon.`;
}

function renderBattleRooms() {
  const quizOptions = state.quizzes
    .map(
      quiz =>
        `<option value="${escapeHtml(quiz.id)}">${escapeHtml(quiz.theme)} (${quiz.questions.length} q.)</option>`,
    )
    .join('');
  return `
    <section class="card">
      <h2>Creer un salon</h2>
      <p class="hint-box">
        Cree un lobby battle offline. Charge un quiz JSON (export Vercel / Studio) ou choisis une banque locale.
        Les joueurs rejoignent via l app mobile en mode offline avec le code du salon.
      </p>
      <div class="form-grid">
        <div class="form-field">
          <label class="qb-label" for="battle-theme">Theme du salon</label>
          <input
            id="battle-theme"
            placeholder="Ex. Culture generale, Histoire..."
            value="${escapeHtml(salonQuizDraft?.theme || '')}"
          />
        </div>
        <div class="form-field">
          <label class="qb-label" for="battle-players">Max joueurs</label>
          <input id="battle-players" type="number" min="2" max="100" value="10" />
        </div>
        <div class="form-field">
          <label class="qb-label" for="battle-questions">Questions jouees</label>
          <input id="battle-questions" type="number" min="3" max="20" value="5" />
        </div>
        <div class="form-field">
          <label class="qb-label" for="battle-elimination">Score elimination</label>
          <input id="battle-elimination" type="number" min="0" value="20" />
        </div>
        <div class="form-field">
          <label class="qb-label" for="battle-mode">Mode de jeu</label>
          <select id="battle-mode">
            <option value="classic">Mode classique</option>
            <option value="timed_mcq">QCM chrono</option>
          </select>
        </div>
      </div>
      <h3 class="section-subtitle">Quiz du salon</h3>
      <div class="form-grid">
        <div class="form-field">
          <label class="qb-label" for="battle-quiz-select">Banque locale</label>
          <select id="battle-quiz-select">
            <option value="">— Choisir dans la banque locale —</option>
            ${quizOptions}
          </select>
        </div>
        <div class="form-field">
          <span class="qb-label">Fichier JSON</span>
          <label class="file-button">
            Charger un JSON quiz
            <input id="battle-quiz-file" type="file" accept="application/json,.json" />
          </label>
        </div>
        <div class="form-field">
          <span class="qb-label">Actions quiz</span>
          <button type="button" class="button secondary" id="battle-quiz-clear">
            Effacer le quiz
          </button>
        </div>
      </div>
      <p id="salon-quiz-status" class="hint-box">${renderSalonQuizStatus()}</p>
      <button class="button" id="add-battle">Creer le salon</button>
    </section>
    <section class="card">
      <h2>Salons actifs</h2>
      ${table(
        ['Code', 'Theme', 'Quiz', 'Joueurs', 'Questions', 'Statut', 'Actions'],
        state.battleRooms,
        room => `
      <td><strong>${room.code}</strong></td>
      <td>${escapeHtml(room.config?.theme || '')}</td>
      <td>${room.questions?.length ? `${room.questions.length} q. JSON` : room.quizSource ? escapeHtml(room.quizSource) : 'Banque auto'}</td>
      <td>${(room.players || []).length}/${room.config?.maxPlayers || '?'}</td>
      <td>${room.config?.questionCount ?? '—'}</td>
      <td><span class="badge ${room.status === 'active' ? 'battle' : 'solo'}">${room.status || 'waiting'}</span></td>
      <td class="row-actions">
        <button class="button secondary" data-edit-battle="${room.id}">Modifier</button>
        <button class="button danger" data-delete-battle="${room.id}">Supprimer</button>
      </td>
    `,
      )}
    </section>
  `;
}

function renderTools() {
  return `
    <section class="card">
      <h2>Import / Export</h2>
      <div class="actions">
        <button class="button" id="export-json">Exporter tout le local</button>
        <button class="button secondary" id="import-json">Importer depuis le texte</button>
        <label class="file-button">
          Importer quiz Vercel JSON
          <input id="import-quiz-file" type="file" accept="application/json,.json" />
        </label>
        <button class="button secondary" id="sync-server">Synchroniser avec le serveur</button>
        <button class="button danger" id="reset-local">Reset local</button>
      </div>
      <p class="hint-box">Compte demo mobile: <strong>demo@local.quizbit</strong> / <strong>demo123</strong></p>
      <p class="hint-box">Genere des quiz riches (audio, PDF…) sur le panel Vercel → section <strong>Studio JSON Offline</strong>, puis importe le fichier ici.</p>
      <textarea id="json-box" placeholder="Colle ici un export complet local ou un quiz JSON exporté depuis le panel Vercel"></textarea>
    </section>
  `;
}

function renderCrudEditor() {
  const label =
    editing.entity === 'quizzes'
      ? 'quiz'
      : editing.entity === 'users'
      ? 'joueur'
      : editing.entity === 'scores'
      ? 'score'
      : 'battle room';
  return `
    <div class="crud-overlay">
      <section class="card crud-modal">
        <h2>Modifier ${label}</h2>
        <p class="hint-box">Edite le JSON (sans le champ <code>id</code>).</p>
        <textarea id="crud-json" rows="16" spellcheck="false">${escapeHtml(
          editing.json,
        )}</textarea>
        <div class="actions" style="margin-top:12px">
          <button class="button" type="button" id="crud-save">Enregistrer</button>
          <button class="button secondary" type="button" id="crud-cancel">Annuler</button>
        </div>
      </section>
    </div>
  `;
}

function table(headers, rows, rowRenderer) {
  return `
    <div class="table-wrap" style="margin-top:18px">
      <table>
        <thead><tr>${headers
          .map(header => `<th>${header}</th>`)
          .join('')}</tr></thead>
        <tbody>
          ${
            rows.length
              ? rows.map(row => `<tr>${rowRenderer(row)}</tr>`).join('')
              : `<tr><td class="empty" colspan="${headers.length}">Aucune donnee.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function bindPageActions() {
  document.getElementById('save-api-base')?.addEventListener('click', () => {
    const input = document.getElementById('api-base-input');
    const value = input?.value?.trim() || '';
    if (!value) {
      alert('Indique une URL (ex. http://localhost:3000).');
      return;
    }
    localStorage.setItem(API_BASE_STORAGE_KEY, normalizePanelApiBase(value));
    alert(`Serveur enregistre: ${getApiBase()}`);
    render();
  });
  document.getElementById('reset-api-base')?.addEventListener('click', () => {
    localStorage.removeItem(API_BASE_STORAGE_KEY);
    alert(`URL par defaut: ${getApiBase()}`);
    render();
  });

  document
    .getElementById('generate-ollama-quiz')
    ?.addEventListener('click', generateQuizWithOllama);
  document.getElementById('test-ollama')?.addEventListener('click', testOllamaApi);
  document
    .getElementById('test-ollama-settings')
    ?.addEventListener('click', () => testOllamaApi('ollama-settings-status'));
  document.getElementById('setup-ollama-hint')?.addEventListener('click', () => {
    alert('Dans le dossier local/: npm run setup:ollama');
  });
  document.getElementById('add-quiz')?.addEventListener('click', addQuiz);
  document.getElementById('add-user')?.addEventListener('click', addUser);
  document.getElementById('add-score')?.addEventListener('click', addScore);
  document
    .getElementById('add-battle')
    ?.addEventListener('click', addBattleRoom);
  document
    .getElementById('battle-quiz-select')
    ?.addEventListener('change', event =>
      selectSalonQuizFromBank(event.target.value),
    );
  document
    .getElementById('battle-quiz-file')
    ?.addEventListener('change', importSalonQuizFile);
  document
    .getElementById('battle-quiz-clear')
    ?.addEventListener('click', clearSalonQuizDraft);
  document.getElementById('export-json')?.addEventListener('click', exportJson);
  document.getElementById('import-json')?.addEventListener('click', importJson);
  document.getElementById('reset-local')?.addEventListener('click', resetLocal);
  document
    .getElementById('sync-server')
    ?.addEventListener('click', () =>
      pushStateToServer()
        .then(() => alert('Donnees synchronisees avec le serveur offline.'))
        .catch(error => alert(error.message)),
    );
  document
    .getElementById('import-quiz-file')
    ?.addEventListener('change', importQuizFile);

  document
    .querySelectorAll('[data-edit-quiz]')
    .forEach(button =>
      button.addEventListener('click', () =>
        openEdit('quizzes', button.dataset.editQuiz),
      ),
    );
  document
    .querySelectorAll('[data-edit-user]')
    .forEach(button =>
      button.addEventListener('click', () =>
        openEdit('users', button.dataset.editUser),
      ),
    );
  document
    .querySelectorAll('[data-edit-score]')
    .forEach(button =>
      button.addEventListener('click', () =>
        openEdit('scores', button.dataset.editScore),
      ),
    );
  document
    .querySelectorAll('[data-edit-battle]')
    .forEach(button =>
      button.addEventListener('click', () =>
        openEdit('battleRooms', button.dataset.editBattle),
      ),
    );
  document
    .querySelectorAll('[data-delete-quiz]')
    .forEach(button =>
      button.addEventListener('click', () =>
        removeById('quizzes', button.dataset.deleteQuiz),
      ),
    );
  document
    .querySelectorAll('[data-delete-user]')
    .forEach(button =>
      button.addEventListener('click', () =>
        removeById('users', button.dataset.deleteUser),
      ),
    );
  document
    .querySelectorAll('[data-delete-score]')
    .forEach(button =>
      button.addEventListener('click', () =>
        removeById('scores', button.dataset.deleteScore),
      ),
    );
  document
    .querySelectorAll('[data-delete-battle]')
    .forEach(button =>
      button.addEventListener('click', () =>
        removeById('battleRooms', button.dataset.deleteBattle),
      ),
    );
  document.getElementById('crud-save')?.addEventListener('click', saveEdit);
  document.getElementById('crud-cancel')?.addEventListener('click', () => {
    editing = null;
    render();
  });
}

async function applyCrud(action, entity, id, data) {
  try {
    const response = await fetch(`${getApiBase()}/api/admin/crud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, entity, id, data }),
    });
    const result = await response.json();
    if (response.ok && result.ok && result.state) {
      state = { ...initialState, ...result.state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      editing = null;
      render();
      return true;
    }
    if (!response.ok) {
      throw new Error(result.message || 'CRUD serveur impossible.');
    }
  } catch (error) {
    console.warn('CRUD serveur indisponible, fallback local.', error);
  }
  return false;
}

function openEdit(entity, id) {
  const item = state[entity].find(row => row.id === id);
  if (!item) return;
  const { id: _id, ...rest } = item;
  editing = { entity, id, json: JSON.stringify(rest, null, 2) };
  render();
}

async function saveEdit() {
  if (!editing) return;
  let data;
  try {
    data = JSON.parse(document.getElementById('crud-json').value);
  } catch (error) {
    alert(`JSON invalide: ${error.message}`);
    return;
  }
  const applied = await applyCrud('update', editing.entity, editing.id, data);
  if (applied) return;
  const list = [...state[editing.entity]];
  const index = list.findIndex(item => item.id === editing.id);
  if (index < 0) return;
  list[index] = { ...list[index], ...data, id: editing.id };
  const next = { ...state, [editing.entity]: list };
  if (editing.entity === 'scores') {
    next.users = recalcUsersFromScores(next.users, next.scores);
  }
  editing = null;
  mutate(next);
}

function recalcUsersFromScores(users, scores) {
  const byUser = new Map(
    users.map(user => [
      user.id,
      { ...user, gamesPlayed: 0, totalScore: 0, bestScore: 0 },
    ]),
  );
  for (const score of scores) {
    const user = byUser.get(score.userId);
    if (!user) continue;
    const value = Number(score.score) || 0;
    user.gamesPlayed += 1;
    user.totalScore += value;
    user.bestScore = Math.max(user.bestScore, value);
  }
  return Array.from(byUser.values());
}

async function testOllamaApi(statusId = 'ollama-status') {
  const status = document.getElementById(statusId);
  if (status) status.textContent = 'Test Ollama en cours...';
  try {
    const response = await fetch(`${getApiBase()}/api/test-ollama`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    if (status) {
      status.textContent = data.message || 'Ollama OK';
    } else {
      alert(data.message || 'Ollama OK');
    }
  } catch (error) {
    const message = error.message || 'Ollama indisponible';
    if (status) status.textContent = message;
    else alert(message);
  }
}

async function generateQuizWithOllama() {
  const theme =
    document.getElementById('ollama-theme')?.value?.trim() ||
    document.getElementById('quiz-theme')?.value?.trim() ||
    'Culture generale';
  const count = Math.max(
    1,
    Math.min(10, Number(document.getElementById('ollama-count')?.value) || 5),
  );
  const questionType = document.getElementById('ollama-type')?.value || 'mixed';
  const status = document.getElementById('ollama-status');
  if (status) status.textContent = 'Generation Ollama en cours...';
  try {
    const response = await fetch(`${getApiBase()}/api/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: theme,
        count,
        provider: 'ollama',
        questionType,
        choiceCount: 4,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.questions)) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    const quiz = {
      id: uid('quiz'),
      theme,
      format: 'quizbit-quiz-v1',
      provider: data.provider || 'ollama',
      model: data.model || 'ollama',
      questions: data.questions,
      createdAt: new Date().toISOString(),
    };
    mutate({ ...state, quizzes: [quiz, ...state.quizzes] });
    if (status) {
      status.textContent = `Quiz genere (${data.provider}/${data.model}) — ${data.questions.length} question(s).`;
    }
  } catch (error) {
    if (status) {
      status.textContent = error.message || 'Generation Ollama impossible.';
    } else {
      alert(error.message || 'Generation Ollama impossible.');
    }
  }
}

function addQuiz() {
  const theme =
    document.getElementById('quiz-theme').value.trim() || 'Culture generale';
  const count = Math.max(
    1,
    Number(document.getElementById('quiz-count').value) || 5,
  );
  mutate({
    ...state,
    quizzes: [
      {
        id: uid('quiz'),
        theme,
        questions: Array.from({ length: count }, (_, index) => ({
          id: uid('question'),
          text: `Question locale ${index + 1} sur ${theme}`,
          answer: 'A',
          options: ['A', 'B', 'C', 'D'],
          type: 'mcq',
        })),
        createdAt: new Date().toISOString(),
      },
      ...state.quizzes,
    ],
  });
}

function addUser() {
  const displayName =
    document.getElementById('user-name').value.trim() || 'Player';
  const email =
    document.getElementById('user-email').value.trim() ||
    `${displayName.toLowerCase()}@local`;
  mutate({
    ...state,
    users: [
      {
        id: uid('user'),
        displayName,
        email,
        gamesPlayed: 0,
        totalScore: 0,
        bestScore: 0,
      },
      ...state.users,
    ],
  });
}

function addScore() {
  if (!state.users.length) return alert('Ajoute d abord un joueur.');
  const userId = document.getElementById('score-user').value;
  const user = state.users.find(item => item.id === userId);
  const score = Math.max(
    0,
    Number(document.getElementById('score-value').value) || 0,
  );
  const theme = document.getElementById('score-theme').value.trim() || 'Local';
  const mode = document.getElementById('score-mode').value;
  const updatedUsers = state.users.map(item =>
    item.id === userId
      ? {
          ...item,
          gamesPlayed: item.gamesPlayed + 1,
          totalScore: item.totalScore + score,
          bestScore: Math.max(item.bestScore, score),
        }
      : item,
  );
  mutate({
    ...state,
    users: updatedUsers,
    scores: [
      {
        id: uid('score'),
        userId,
        displayName: user.displayName,
        theme,
        score,
        mode,
        createdAt: new Date().toISOString(),
      },
      ...state.scores,
    ],
  });
}

function normalizeSalonQuestions(rawQuestions, limit) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .map((question, index) => ({
      id: question.id || uid('question'),
      text: String(question.text || '').trim() || `Question ${index + 1}`,
      answer: String(question.answer || '').trim(),
      options: Array.isArray(question.options)
        ? question.options.slice(0, 5)
        : undefined,
      exactAnswer: Boolean(question.exactAnswer),
      type: question.type === 'open' ? 'open' : 'mcq',
    }))
    .filter(question => question.text && question.answer)
    .slice(0, Math.max(3, Math.min(20, Number(limit) || 5)));
}

function setSalonQuizDraft(draft) {
  salonQuizDraft = draft;
  const status = document.getElementById('salon-quiz-status');
  if (status) {
    status.innerHTML = renderSalonQuizStatus();
  }
  const themeInput = document.getElementById('battle-theme');
  if (themeInput && draft?.theme && !themeInput.value.trim()) {
    themeInput.value = draft.theme;
  }
}

function selectSalonQuizFromBank(quizId) {
  if (!quizId) {
    setSalonQuizDraft(null);
    return;
  }
  const quiz = state.quizzes.find(item => item.id === quizId);
  if (!quiz?.questions?.length) {
    alert('Quiz introuvable ou sans questions.');
    return;
  }
  setSalonQuizDraft({
    label: quiz.theme,
    theme: quiz.theme,
    questions: quiz.questions,
  });
}

function importSalonQuizFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const normalized = normalizeImportedQuiz(parsed);
      if (!normalized?.questions?.length) {
        throw new Error('JSON invalide : tableau questions requis.');
      }
      setSalonQuizDraft({
        label: normalized.theme,
        theme: normalized.theme,
        questions: normalized.questions,
      });
    } catch (error) {
      alert(`Import salon impossible: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearSalonQuizDraft() {
  const select = document.getElementById('battle-quiz-select');
  if (select) select.value = '';
  setSalonQuizDraft(null);
}

function addBattleRoom() {
  const theme =
    document.getElementById('battle-theme').value.trim() ||
    salonQuizDraft?.theme ||
    'Culture generale';
  const questionCount = Math.max(
    3,
    Math.min(20, Number(document.getElementById('battle-questions').value) || 5),
  );
  const mode =
    document.getElementById('battle-mode')?.value === 'timed_mcq'
      ? 'timed_mcq'
      : 'classic';
  const host =
    state.users.find(user => user.id === 'offline-demo') || state.users[0];
  const questions = salonQuizDraft?.questions?.length
    ? normalizeSalonQuestions(salonQuizDraft.questions, questionCount)
    : [];
  if (salonQuizDraft?.questions?.length && !questions.length) {
    alert('Le quiz charge ne contient aucune question valide.');
    return;
  }
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  mutate({
    ...state,
    battleRooms: [
      {
        id: uid('battle'),
        code,
        status: 'waiting',
        hostId: host?.id || '',
        players: host
          ? [
              {
                userId: host.id,
                displayName: host.displayName,
                score: 0,
                eliminated: false,
                finished: false,
              },
            ]
          : [],
        chatMessages: [],
        questions,
        quizSource: salonQuizDraft?.label || '',
        config: {
          theme,
          mode,
          maxPlayers: Math.max(
            2,
            Number(document.getElementById('battle-players').value) || 10,
          ),
          questionCount,
          eliminationScore: Math.max(
            0,
            Number(document.getElementById('battle-elimination').value) || 20,
          ),
          timeLimitSeconds: 15,
        },
        createdAt: new Date().toISOString(),
      },
      ...state.battleRooms,
    ],
  });
  salonQuizDraft = null;
}

async function removeById(key, id) {
  const label =
    key === 'quizzes'
      ? 'ce quiz'
      : key === 'users'
      ? 'ce joueur'
      : key === 'scores'
      ? 'ce score'
      : 'cette battle room';
  if (!confirm(`Supprimer ${label} ?`)) return;
  const applied = await applyCrud('delete', key, id);
  if (applied) return;
  const next = {
    ...state,
    [key]: state[key].filter(item => item.id !== id),
  };
  if (key === 'scores') {
    next.users = recalcUsersFromScores(next.users, next.scores);
  }
  mutate(next);
}

function exportJson() {
  document.getElementById('json-box').value = JSON.stringify(state, null, 2);
}

function normalizeImportedQuiz(parsed) {
  if (!parsed || !Array.isArray(parsed.questions)) return null;
  return {
    id: parsed.id || uid('quiz'),
    theme: parsed.theme || parsed.prompt || 'Quiz importe',
    format: parsed.format || 'quizbit-quiz-v1',
    provider: parsed.provider || '',
    model: parsed.model || '',
    sourceMedia: parsed.sourceMedia || null,
    questions: parsed.questions.map((question, index) => ({
      id: question.id || uid('question'),
      text: question.text || `Question ${index + 1}`,
      answer: question.answer || '',
      options: Array.isArray(question.options) ? question.options.slice(0, 5) : undefined,
      exactAnswer: Boolean(question.exactAnswer),
      type: question.type === 'open' ? 'open' : 'mcq',
    })),
    createdAt: parsed.createdAt || new Date().toISOString(),
    importedFrom: parsed.format || 'json',
  };
}

function importParsedJson(parsed) {
  const quiz = normalizeImportedQuiz(parsed);
  if (quiz) {
    mutate({ ...state, quizzes: [quiz, ...state.quizzes] });
    return;
  }
  mutate({ ...initialState, ...parsed });
}

function importJson() {
  const box = document.getElementById('json-box');
  try {
    importParsedJson(JSON.parse(box.value));
  } catch (error) {
    alert(`JSON invalide: ${error.message}`);
  }
}

function importQuizFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importParsedJson(JSON.parse(String(reader.result || '{}')));
    } catch (error) {
      alert(`Fichier JSON invalide: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetLocal() {
  if (!confirm('Effacer toutes les donnees locales ?')) return;
  mutate({ ...initialState });
}

pullStateFromServer()
  .then(() => refreshOllamaHealth())
  .finally(() => render());
