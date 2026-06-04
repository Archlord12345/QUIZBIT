/* eslint-env browser */
/* eslint-disable no-alert */
const STORAGE_KEY = 'quizbit-local-admin-v1';
const API_BASE =
  window.QUIZBIT_LOCAL_API ||
  (window.location.port === '4173'
    ? 'http://localhost:3000'
    : window.location.origin);

const initialState = {
  quizzes: [],
  users: [],
  scores: [],
  battleRooms: [],
};

let state = loadState();
let currentPage = 'dashboard';

const pages = [
  ['dashboard', 'Dashboard'],
  ['quizzes', 'Quiz'],
  ['users', 'Joueurs'],
  ['scores', 'Scores'],
  ['battleRooms', 'Battle Rooms'],
  ['tools', 'Import / Export'],
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
    const response = await fetch(`${API_BASE}/api/admin/state`);
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
  const response = await fetch(`${API_BASE}/api/admin/state`, {
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
        <div class="brand"><span>QuizBit</span><small>Offline Studio</small></div>
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
      <main class="main">
        ${renderHeader()}
        <div class="notice"><strong>Mode offline.</strong> Serveur API: <code>${API_BASE}</code>. Les donnees sont synchronisees avec l app mobile. Importe un quiz JSON exporte depuis Vercel pour enrichir la banque locale.</div>
        ${renderPage()}
      </main>
    </div>
  `;

  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => setPage(button.dataset.page));
  });
  bindPageActions();
}

function renderHeader() {
  const label = pages.find(([id]) => id === currentPage)?.[1] || 'Dashboard';
  return `
    <header class="header">
      <div>
        <h1>${label}</h1>
        <p>Administration locale rapide pour developpement, demo et tests hors cloud.</p>
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
  return renderTools();
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
      ${statCard('Battle Rooms', state.battleRooms.length)}
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
      <h2>Creer un quiz local</h2>
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
      <td><button class="button danger" data-delete-quiz="${
        quiz.id
      }">Supprimer</button></td>
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
      <td><button class="button danger" data-delete-user="${
        user.id
      }">Supprimer</button></td>
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
      <td><button class="button danger" data-delete-score="${
        score.id
      }">Supprimer</button></td>
    `,
    )}
  `;
}

function renderBattleRooms() {
  return `
    <section class="card">
      <h2>Creer battle room</h2>
      <div class="form-grid">
        <input id="battle-theme" placeholder="Theme" />
        <input id="battle-players" type="number" min="2" value="10" placeholder="Max joueurs" />
        <input id="battle-questions" type="number" min="3" value="5" placeholder="Questions" />
        <input id="battle-elimination" type="number" min="0" value="20" placeholder="Score elimination" />
      </div>
      <button class="button" id="add-battle">Ajouter battle room</button>
    </section>
    ${table(
      ['Code', 'Theme', 'Max', 'Questions', 'Elimination', 'Status', 'Actions'],
      state.battleRooms,
      room => `
      <td><strong>${room.code}</strong></td>
      <td>${escapeHtml(room.config.theme)}</td>
      <td>${room.config.maxPlayers}</td>
      <td>${room.config.questionCount}</td>
      <td>${room.config.eliminationScore}</td>
      <td>${room.status}</td>
      <td><button class="button danger" data-delete-battle="${
        room.id
      }">Supprimer</button></td>
    `,
    )}
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
  document.getElementById('add-quiz')?.addEventListener('click', addQuiz);
  document.getElementById('add-user')?.addEventListener('click', addUser);
  document.getElementById('add-score')?.addEventListener('click', addScore);
  document
    .getElementById('add-battle')
    ?.addEventListener('click', addBattleRoom);
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

function addBattleRoom() {
  const theme =
    document.getElementById('battle-theme').value.trim() || 'Culture generale';
  mutate({
    ...state,
    battleRooms: [
      {
        id: uid('battle'),
        code: Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: 'waiting',
        players: [],
        config: {
          theme,
          maxPlayers: Math.max(
            2,
            Number(document.getElementById('battle-players').value) || 10,
          ),
          questionCount: Math.max(
            3,
            Number(document.getElementById('battle-questions').value) || 5,
          ),
          eliminationScore: Math.max(
            0,
            Number(document.getElementById('battle-elimination').value) || 20,
          ),
        },
        createdAt: new Date().toISOString(),
      },
      ...state.battleRooms,
    ],
  });
}

function removeById(key, id) {
  mutate({ ...state, [key]: state[key].filter(item => item.id !== id) });
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

pullStateFromServer().finally(() => render());
