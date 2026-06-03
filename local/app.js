/* eslint-env browser */
/* eslint-disable no-alert */
const STORAGE_KEY = 'quizbit-local-admin-v1';

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
        <div class="brand">QuizBit Local</div>
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
        <div class="notice">Panel 100% local: les donnees sont stockees dans le navigateur via localStorage.</div>
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
      <button class="button secondary" id="seed-demo">Ajouter demo</button>
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
        <button class="button" id="export-json">Exporter JSON</button>
        <button class="button secondary" id="import-json">Importer JSON</button>
        <button class="button danger" id="reset-local">Reset local</button>
      </div>
      <textarea id="json-box" placeholder="JSON local"></textarea>
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
  document.getElementById('seed-demo')?.addEventListener('click', seedDemo);
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

function importJson() {
  const box = document.getElementById('json-box');
  try {
    const parsed = JSON.parse(box.value);
    mutate({ ...initialState, ...parsed });
  } catch (error) {
    alert(`JSON invalide: ${error.message}`);
  }
}

function resetLocal() {
  if (!confirm('Effacer toutes les donnees locales ?')) return;
  mutate({ ...initialState });
}

function seedDemo() {
  const user = {
    id: uid('user'),
    displayName: 'Demo Player',
    email: 'demo@quizbit.local',
    gamesPlayed: 1,
    totalScore: 40,
    bestScore: 40,
  };
  mutate({
    ...state,
    users: [user, ...state.users],
    scores: [
      {
        id: uid('score'),
        userId: user.id,
        displayName: user.displayName,
        theme: 'Demo',
        score: 40,
        mode: 'solo',
        createdAt: new Date().toISOString(),
      },
      ...state.scores,
    ],
    battleRooms: [
      {
        id: uid('battle'),
        code: 'DEMO42',
        status: 'waiting',
        players: [],
        config: {
          theme: 'Demo Battle',
          maxPlayers: 10,
          questionCount: 5,
          eliminationScore: 20,
        },
        createdAt: new Date().toISOString(),
      },
      ...state.battleRooms,
    ],
  });
}

render();
