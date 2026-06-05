import React, { useCallback, useEffect, useMemo, useState } from 'react';
import logoUrl from './assets/logo.png';
import { initializeApp } from 'firebase/app';
import {
  collection,
  getCountFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Database,
  Download,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Users,
  FileJson,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import OfflineQuizStudio from './OfflineQuizStudio.jsx';
import {
  PAGE_COLLECTION,
  defaultDocument,
  deleteFirestoreRecord,
  isCrudPage,
  upsertFirestoreRecord,
} from './adminCrud.js';
import {
  FIRESTORE_SESSION_EVENT,
  getPanelAdminKey,
  getStoredIdToken,
  postPanelApi,
  setSessionPanelKey,
  setStoredIdToken,
} from './panelApi.js';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || '',
  authDomain:
    env.REACT_APP_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId:
    env.REACT_APP_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket:
    env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    '',
  messagingSenderId:
    env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ||
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '',
  appId: env.REACT_APP_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || '',
  measurementId:
    env.REACT_APP_FIREBASE_MEASUREMENT_ID ||
    env.VITE_FIREBASE_MEASUREMENT_ID ||
    '',
};

const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 9000;
const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
/** Client Firestore uniquement si pas de clé admin au build (sinon API serveur). */
const panelUsesServerApi = Boolean(getPanelAdminKey());
let firebaseApp = null;
let firestoreDb = null;
const getFirestoreDb = () => {
  if (!firebaseEnabled || panelUsesServerApi) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
  }
  return firestoreDb;
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'offline-studio', label: 'Studio JSON Offline', icon: FileJson },
  { id: 'questions', label: 'Quiz & Questions', icon: Database },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'scores', label: 'Scores', icon: Activity },
  { id: 'battle', label: 'Battle Rooms', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const COLLECTIONS = {
  questions: { name: 'quizzes', order: 'createdAt', label: 'quiz' },
  users: { name: 'users', order: 'totalScore', label: 'utilisateurs' },
  scores: { name: 'scores', order: 'score', label: 'scores' },
  battle: { name: 'battleRooms', order: 'createdAt', label: 'battle rooms' },
};

const safeDate = value => {
  if (!value) return 'N/A';
  const date =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

const dateMs = value => {
  if (!value) return 0;
  const date =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout`)),
        REQUEST_TIMEOUT_MS,
      ),
    ),
  ]);

const testServerEndpoint = async endpoint => {
  const response = await withTimeout(fetch(endpoint), endpoint);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok)
    throw new Error(data.message || `HTTP ${response.status}`);
  return data.message || 'Test OK';
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

const toCsv = rows => {
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach(key => keys.add(key));
      return keys;
    }, new Set()),
  );
  const escapeCell = value => {
    const raw =
      typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    return `"${raw.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(key => escapeCell(row[key])).join(',')),
  ].join('\n');
};

const questionStats = questions => {
  const list = Array.isArray(questions) ? questions : [];
  return list.reduce(
    (acc, question) => {
      if (question?.type === 'open') acc.open += 1;
      else if (question?.type === 'mcq') acc.mcq += 1;
      else acc.invalid += 1;
      if (Array.isArray(question?.options) && question.options.length > 5)
        acc.tooManyChoices += 1;
      return acc;
    },
    { mcq: 0, open: 0, invalid: 0, tooManyChoices: 0 },
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState({ stats: true });
  const [error, setError] = useState('');
  const [firestoreNotice, setFirestoreNotice] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [stats, setStats] = useState({
    players: 0,
    quizzes: 0,
    scores: 0,
    battleRooms: 0,
  });
  const [quizzes, setQuizzes] = useState([]);
  const [users, setUsers] = useState([]);
  const [scores, setScores] = useState([]);
  const [battleRooms, setBattleRooms] = useState([]);
  const [crudModal, setCrudModal] = useState(null);
  const [crudBusy, setCrudBusy] = useState(false);

  const setLoadingFlag = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFirestoreApiResult = useCallback(data => {
    if (data.firestoreReady === false) {
      setFirestoreNotice(
        data.message ||
          'Firestore non connecte : Parametres → Acces Firestore → Connecter.',
      );
      return true;
    }
    setFirestoreNotice('');
    return false;
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingFlag('stats', true);
    setError('');
    try {
      if (getPanelAdminKey()) {
        const data = await postPanelApi('admin-firestore-stats');
        if (applyFirestoreApiResult(data)) {
          setStats(data.stats || { players: 0, quizzes: 0, scores: 0, battleRooms: 0 });
          return;
        }
        setStats(data.stats);
        return;
      }
      const db = getFirestoreDb();
      if (!db) {
        setError(
          'Lecture Firestore client désactivée. Configure VITE_ADMIN_PANEL_KEY sur Vercel.',
        );
        return;
      }
      const [quizSnap, userSnap, scoreSnap, roomSnap] = await Promise.all([
        getCountFromServer(collection(db, 'quizzes')),
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'scores')),
        getCountFromServer(collection(db, 'battleRooms')),
      ]);
      setStats({
        quizzes: quizSnap.data().count,
        players: userSnap.data().count,
        scores: scoreSnap.data().count,
        battleRooms: roomSnap.data().count,
      });
    } catch (err) {
      const msg = err.message || 'Impossible de charger les statistiques Firestore.';
      if (
        !/Firestore|panel manquant|Acces Firestore|Connecter Firestore/i.test(msg)
      ) {
        console.error(err);
      }
      setError(
        /Firestore|panel manquant|Acces Firestore/i.test(msg)
          ? `${msg} Ouvre le menu Parametres et clique sur « Connecter Firestore ».`
          : msg,
      );
    } finally {
      setLoadingFlag('stats', false);
    }
  }, [applyFirestoreApiResult, setLoadingFlag]);

  const fetchCollection = useCallback(
    async page => {
      const config = COLLECTIONS[page];
      if (!config) return;
      setLoadingFlag('data', true);
      setError('');
      try {
        if (getPanelAdminKey()) {
          const data = await postPanelApi('admin-firestore-list', {
            collection: config.name,
          });
          if (applyFirestoreApiResult(data)) {
            if (page === 'questions') setQuizzes([]);
            if (page === 'users') setUsers([]);
            if (page === 'scores') setScores([]);
            if (page === 'battle') setBattleRooms([]);
            return;
          }
          const rows = data.rows || [];
          if (page === 'questions') setQuizzes(rows);
          if (page === 'users') setUsers(rows);
          if (page === 'scores') setScores(rows);
          if (page === 'battle') setBattleRooms(rows);
          return;
        }

        const db = getFirestoreDb();
        if (!db) {
          setError(
            'Lecture Firestore client désactivée. Configure VITE_ADMIN_PANEL_KEY sur Vercel.',
          );
          return;
        }
        let snap;
        try {
          snap = await getDocs(
            query(
              collection(db, config.name),
              orderBy(config.order, 'desc'),
              limit(PAGE_SIZE),
            ),
          );
        } catch {
          snap = await getDocs(
            query(collection(db, config.name), limit(PAGE_SIZE)),
          );
        }
        const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (page === 'questions') setQuizzes(rows);
        if (page === 'users') setUsers(rows);
        if (page === 'scores') setScores(rows);
        if (page === 'battle') setBattleRooms(rows);
      } catch (err) {
        console.error(err);
        setError(err.message || `Impossible de charger ${config.label}.`);
      } finally {
        setLoadingFlag('data', false);
      }
    },
    [applyFirestoreApiResult, setLoadingFlag],
  );

  useEffect(() => {
    if (currentPage === 'offline-studio') return;
    fetchStats();
  }, [fetchStats, currentPage]);

  useEffect(() => {
    const onFirestoreSession = () => {
      if (currentPage !== 'offline-studio') {
        fetchStats();
        if (
          currentPage !== 'dashboard' &&
          currentPage !== 'settings' &&
          currentPage !== 'offline-studio'
        ) {
          fetchCollection(currentPage);
        }
      }
    };
    window.addEventListener(FIRESTORE_SESSION_EVENT, onFirestoreSession);
    return () =>
      window.removeEventListener(FIRESTORE_SESSION_EVENT, onFirestoreSession);
  }, [currentPage, fetchStats, fetchCollection]);

  useEffect(() => {
    setGlobalFilter('');
    setSelectedRecord(null);
    if (
      currentPage === 'offline-studio' ||
      currentPage === 'dashboard' ||
      currentPage === 'settings'
    ) {
      return;
    }
    fetchCollection(currentPage);
  }, [currentPage, fetchCollection]);

  const currentRows = useMemo(() => {
    if (currentPage === 'questions') return quizzes;
    if (currentPage === 'users') return users;
    if (currentPage === 'scores') return scores;
    if (currentPage === 'battle') return battleRooms;
    return [];
  }, [battleRooms, currentPage, quizzes, scores, users]);

  const analytics = useMemo(() => {
    const battleScores = scores.filter(score => score.mode === 'battle_royale');
    const soloScores = scores.filter(score => score.mode !== 'battle_royale');
    const topScores = [...scores]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);
    const recentActivity = [
      ...scores.map(score => ({
        type: 'Score',
        label: `${score.displayName || 'Player'} - ${score.score || 0} pts`,
        date: score.createdAt,
      })),
      ...quizzes.map(quiz => ({
        type: 'Quiz',
        label: quiz.theme || 'Quiz',
        date: quiz.createdAt,
      })),
      ...battleRooms.map(room => ({
        type: 'Battle',
        label: `${room.code || room.id} - ${room.status || 'waiting'}`,
        date: room.createdAt,
      })),
    ]
      .sort((a, b) => dateMs(b.date) - dateMs(a.date))
      .slice(0, 8);
    return {
      battleScores: battleScores.length,
      soloScores: soloScores.length,
      topScores,
      recentActivity,
      activeRooms: battleRooms.filter(room => room.status === 'active').length,
      waitingRooms: battleRooms.filter(room => room.status === 'waiting')
        .length,
      finishedRooms: battleRooms.filter(room => room.status === 'finished')
        .length,
      averageScore: scores.length
        ? Math.round(
            scores.reduce((sum, row) => sum + Number(row.score || 0), 0) /
              scores.length,
          )
        : 0,
    };
  }, [battleRooms, quizzes, scores]);

  const refreshData = useCallback(() => {
    fetchStats();
    if (isCrudPage(currentPage)) fetchCollection(currentPage);
  }, [currentPage, fetchCollection, fetchStats]);

  const openCrudCreate = useCallback(() => {
    if (!isCrudPage(currentPage)) return;
    setCrudModal({
      mode: 'create',
      page: currentPage,
      id: null,
      json: JSON.stringify(defaultDocument(currentPage), null, 2),
      error: '',
    });
  }, [currentPage]);

  const openCrudEdit = useCallback(
    record => {
      if (!isCrudPage(currentPage) || !record) return;
      const { id, ...rest } = record;
      setCrudModal({
        mode: 'edit',
        page: currentPage,
        id,
        json: JSON.stringify(rest, null, 2),
        error: '',
      });
    },
    [currentPage],
  );

  const handleCrudDelete = useCallback(
    async record => {
      const collection = PAGE_COLLECTION[currentPage];
      if (!collection || !record?.id) return;
      const label =
        record.theme || record.displayName || record.code || record.id;
      if (!window.confirm(`Supprimer « ${label} » ?`)) return;
      setCrudBusy(true);
      setError('');
      try {
        await deleteFirestoreRecord(collection, record.id);
        if (selectedRecord?.id === record.id) setSelectedRecord(null);
        refreshData();
      } catch (err) {
        setError(err.message || 'Suppression impossible.');
      } finally {
        setCrudBusy(false);
      }
    },
    [currentPage, refreshData, selectedRecord],
  );

  const handleCrudSave = useCallback(async () => {
    if (!crudModal) return;
    let document;
    try {
      document = JSON.parse(crudModal.json);
    } catch {
      setCrudModal(prev => ({ ...prev, error: 'JSON invalide.' }));
      return;
    }
    const collection = PAGE_COLLECTION[crudModal.page];
    if (!collection) return;
    setCrudBusy(true);
    setCrudModal(prev => ({ ...prev, error: '' }));
    try {
      await upsertFirestoreRecord(
        collection,
        document,
        crudModal.mode === 'edit' ? crudModal.id : undefined,
      );
      setCrudModal(null);
      refreshData();
    } catch (err) {
      setCrudModal(prev => ({
        ...prev,
        error: err.message || 'Enregistrement impossible.',
      }));
    } finally {
      setCrudBusy(false);
    }
  }, [crudModal, refreshData]);

  const exportRows = useCallback(
    format => {
      const filename = `quizbit-${currentPage}-${new Date()
        .toISOString()
        .slice(0, 10)}`;
      const rows = currentPage === 'dashboard' ? [stats] : currentRows;
      if (format === 'csv')
        downloadFile(`${filename}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
      else
        downloadFile(
          `${filename}.json`,
          JSON.stringify(rows, null, 2),
          'application/json;charset=utf-8',
        );
    },
    [currentPage, currentRows, stats],
  );

  const runDiagnostic = useCallback(
    async (key, action) => {
      setLoadingFlag(key, true);
      try {
        const message = await action();
        setTestResults(prev => ({
          ...prev,
          [key]: { status: 'success', message },
        }));
      } catch (err) {
        setTestResults(prev => ({
          ...prev,
          [key]: { status: 'error', message: err.message },
        }));
      } finally {
        setLoadingFlag(key, false);
      }
    },
    [setLoadingFlag],
  );

  const diagnostics = {
    firebase: () =>
      runDiagnostic('firebase', async () => {
        if (getPanelAdminKey()) {
          const data = await postPanelApi('admin-firestore-stats');
          if (data.firestoreReady === false) {
            throw new Error(
              data.message ||
                'Firestore non connecte (Parametres → Connecter Firestore).',
            );
          }
          return `Firestore OK via API (${data.stats.players} joueurs, ${data.stats.quizzes} quiz)`;
        }
        const db = getFirestoreDb();
        if (!db) throw new Error('Firebase client désactivé (utilisez l’API admin).');
        await withTimeout(
          getCountFromServer(collection(db, 'users')),
          'Firebase',
        );
        return 'Connection Firestore OK (client)';
      }),
    auth: () =>
      runDiagnostic('auth', () => testServerEndpoint('/api/firebase-auth')),
    gemini: () =>
      runDiagnostic('gemini', () => testServerEndpoint('/api/test-gemini')),
    mistral: () =>
      runDiagnostic('mistral', () => testServerEndpoint('/api/test-mistral')),
    cloudinary: () =>
      runDiagnostic('cloudinary', () =>
        testServerEndpoint('/api/test-cloudinary'),
      ),
  };

  useEffect(() => {
    if (currentPage === 'settings') {
      runDiagnostic('mistral', () => testServerEndpoint('/api/test-mistral'));
    }
  }, [currentPage, runDiagnostic]);

  return (
    <div className="admin-shell">
      <Sidebar currentPage={currentPage} onPage={setCurrentPage} />
      <main className="admin-main qb-page">
        <Topbar
          loading={loading.stats || loading.data}
          page={currentPage}
          title={
            NAV_ITEMS.find(item => item.id === currentPage)?.label ||
            'Dashboard'
          }
          showCreate={isCrudPage(currentPage)}
          onCreate={openCrudCreate}
          onExportCsv={() => exportRows('csv')}
          onExportJson={() => exportRows('json')}
          onRefresh={refreshData}
        />
        {error ? <Banner tone="error">{error}</Banner> : null}
        {firestoreNotice && !error ? (
          <Banner>{firestoreNotice}</Banner>
        ) : null}
        {!firebaseEnabled ? (
          <Banner>
            Firebase client non configure (variables VITE_FIREBASE_* au build).
          </Banner>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.section
            key={currentPage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {currentPage === 'dashboard' && (
              <Dashboard stats={stats} analytics={analytics} />
            )}
            {currentPage === 'offline-studio' && <OfflineQuizStudio />}
            {currentPage !== 'dashboard' &&
              currentPage !== 'settings' &&
              currentPage !== 'offline-studio' && (
              <DataPage
                crudBusy={crudBusy}
                onDelete={handleCrudDelete}
                onEdit={openCrudEdit}
                page={currentPage}
                rows={currentRows}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                selectedRecord={selectedRecord}
                setSelectedRecord={setSelectedRecord}
              />
            )}
            {currentPage === 'settings' && (
              <SettingsPage
                firebaseConfig={firebaseConfig}
                firebaseEnabled={firebaseEnabled}
                loading={loading}
                results={testResults}
                diagnostics={diagnostics}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </main>
      {crudModal ? (
        <CrudModal
          busy={crudBusy}
          modal={crudModal}
          onClose={() => setCrudModal(null)}
          onSave={handleCrudSave}
          setJson={value =>
            setCrudModal(prev => ({ ...prev, json: value, error: '' }))
          }
        />
      ) : null}
    </div>
  );
}

function Sidebar({ currentPage, onPage }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="brand">
        <div className="brand-logo">
          <img src={logoUrl} alt="QuizBit logo" />
        </div>
        <div>
          <strong>QuizBit</strong>
          <span>Panel cloud</span>
        </div>
      </div>
      <nav className="nav-list">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onPage(item.id)}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-note">
        Palette alignee sur l app mobile (#050816, cyan #21E7FF, accent #2D7DFF).
      </div>
    </aside>
  );
}

function Topbar({
  loading,
  onCreate,
  onExportCsv,
  onExportJson,
  onRefresh,
  page,
  showCreate,
  title,
}) {
  const isOfflineStudio = page === 'offline-studio';
  const showExport = page !== 'settings' && !isOfflineStudio;
  const showRefresh = !isOfflineStudio;
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          {isOfflineStudio ? 'QuizBit · Studio offline' : 'QuizBit control center'}
        </p>
        <h1>{title}</h1>
      </div>
      {showExport || showRefresh || showCreate ? (
        <div className="topbar-actions">
          {showCreate ? (
            <button className="btn ghost" onClick={onCreate}>
              <Plus size={16} /> Nouveau
            </button>
          ) : null}
          {showExport ? (
            <button className="btn ghost" onClick={onExportCsv}>
              <Download size={16} /> CSV
            </button>
          ) : null}
          {showExport ? (
            <button className="btn ghost" onClick={onExportJson}>
              JSON
            </button>
          ) : null}
          {showRefresh ? (
            <button className="btn primary" disabled={loading} onClick={onRefresh}>
              {loading ? 'Chargement...' : 'Rafraichir'}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function Banner({ children, tone = 'warn' }) {
  return <div className={`banner ${tone}`}>{children}</div>;
}

function Dashboard({ analytics, stats }) {
  const kpis = [
    ['Players', stats.players, '#22c55e'],
    ['Quizzes', stats.quizzes, '#21e7ff'],
    ['Scores', stats.scores, '#f59e0b'],
    ['Battle Rooms', stats.battleRooms, '#8b5cf6'],
    ['Avg Score', analytics.averageScore, '#2d7dff'],
  ];
  const roomData = [
    { name: 'Waiting', value: analytics.waitingRooms, color: '#f59e0b' },
    { name: 'Active', value: analytics.activeRooms, color: '#21e7ff' },
    { name: 'Finished', value: analytics.finishedRooms, color: '#94a3b8' },
  ];
  const scoreData = analytics.topScores.map(score => ({
    name: score.displayName || 'Player',
    score: Number(score.score || 0),
  }));

  return (
    <div className="dashboard-grid">
      <div className="kpi-grid">
        {kpis.map(([label, value, color], index) => (
          <Kpi
            key={label}
            label={label}
            value={value}
            color={color}
            index={index}
          />
        ))}
      </div>
      <Panel title="Top scores" className="wide">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={scoreData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,.18)"
            />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                background: '#0b1230',
                border: '1px solid rgba(33,231,255,.2)',
                color: '#fff',
              }}
            />
            <Bar dataKey="score" fill="#21e7ff" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Battle rooms">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={roomData}
              dataKey="value"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={5}
            >
              {roomData.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#0b1230',
                border: '1px solid rgba(33,231,255,.2)',
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Activity" className="wide">
        <div className="activity-list">
          {analytics.recentActivity.length ? (
            analytics.recentActivity.map((row, index) => (
              <motion.div
                className="activity-row"
                key={`${row.type}-${row.label}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <span>{row.type}</span>
                <strong>{row.label}</strong>
                <small>{safeDate(row.date)}</small>
              </motion.div>
            ))
          ) : (
            <EmptyState label="Aucune activite chargee." />
          )}
        </div>
      </Panel>
      <Panel title="Score split">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={[
              { name: 'Solo', value: analytics.soloScores },
              { name: 'Battle', value: analytics.battleScores },
            ]}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#21e7ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                background: '#0b1230',
                border: '1px solid rgba(33,231,255,.2)',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function Kpi({ color, index, label, value }) {
  return (
    <motion.div
      className="kpi-card glass-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </motion.div>
  );
}

function Panel({ children, className = '', title }) {
  return (
    <section className={`panel glass-panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DataPage({
  crudBusy,
  globalFilter,
  onDelete,
  onEdit,
  page,
  rows,
  selectedRecord,
  setGlobalFilter,
  setSelectedRecord,
}) {
  const columns = useMemo(
    () =>
      getColumns(page, {
        crudBusy,
        onDelete,
        onEdit,
        onSelect: setSelectedRecord,
      }),
    [crudBusy, onDelete, onEdit, page, setSelectedRecord],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) =>
      JSON.stringify(row.original)
        .toLowerCase()
        .includes(String(filterValue).toLowerCase()),
  });

  return (
    <div
      className={selectedRecord ? 'data-layout with-details' : 'data-layout'}
    >
      <div>
        <div className="toolbar glass-panel">
          <Search size={18} />
          <input
            value={globalFilter ?? ''}
            onChange={event => setGlobalFilter(event.target.value)}
            placeholder="Rechercher dans les donnees chargees..."
          />
          <span>
            {table.getFilteredRowModel().rows.length}/{rows.length} lignes
          </span>
        </div>
        <div className="table-card glass-panel">
          <table>
            <thead>
              {table.getHeaderGroups().map(group => (
                <tr key={group.id}>
                  {group.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState label="Aucune donnee." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedRecord && (
        <DetailsPanel
          crudBusy={crudBusy}
          onClose={() => setSelectedRecord(null)}
          onDelete={onDelete}
          onEdit={onEdit}
          record={selectedRecord}
        />
      )}
    </div>
  );
}

function getColumns(page, { crudBusy, onDelete, onEdit, onSelect }) {
  const action = info => {
    const record = info?.row?.original;
    if (!record) return null;
    return (
      <div className="row-actions">
        <button className="btn small" onClick={() => onSelect(record)}>
          Voir
        </button>
        <button
          className="btn small ghost"
          disabled={crudBusy}
          onClick={() => onEdit(record)}
          title="Modifier"
        >
          <Pencil size={14} />
        </button>
        <button
          className="btn small danger"
          disabled={crudBusy}
          onClick={() => onDelete(record)}
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };
  if (page === 'questions')
    return [
      {
        header: 'Theme',
        cell: info => <strong>{info.row.original.theme || 'N/A'}</strong>,
      },
      {
        header: 'Questions / reponses',
        cell: info => <QuizPreview questions={info.row.original.questions} />,
      },
      {
        header: 'Types',
        cell: info => (
          <QuestionCounters questions={info.row.original.questions} />
        ),
      },
      { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
      { header: 'Actions', cell: action },
    ];
  if (page === 'users')
    return [
      {
        header: 'User',
        cell: info => (
          <strong>
            {info.row.original.displayName ||
              info.row.original.username ||
              'Player'}
          </strong>
        ),
      },
      { header: 'Email', accessorKey: 'email' },
      { header: 'Total', cell: info => info.row.original.totalScore || 0 },
      { header: 'Best', cell: info => info.row.original.bestScore || 0 },
      { header: 'Played', cell: info => info.row.original.gamesPlayed || 0 },
      {
        header: 'Avatar',
        cell: info => (info.row.original.avatarUrl ? 'Oui' : 'Non'),
      },
      { header: 'Actions', cell: action },
    ];
  if (page === 'scores')
    return [
      {
        header: 'Player',
        cell: info => (
          <strong>{info.row.original.displayName || 'Player'}</strong>
        ),
      },
      { header: 'Theme', accessorKey: 'theme' },
      {
        header: 'Score',
        cell: info => <strong>{info.row.original.score || 0}</strong>,
      },
      {
        header: 'Mode',
        cell: info => <ModePill mode={info.row.original.mode} />,
      },
      { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
      { header: 'Actions', cell: action },
    ];
  return [
    {
      header: 'Code',
      cell: info => (
        <strong>{info.row.original.code || info.row.original.id}</strong>
      ),
    },
    { header: 'Theme', cell: info => info.row.original.config?.theme || 'N/A' },
    { header: 'Players', cell: info => info.row.original.players?.length || 0 },
    { header: 'Status', cell: info => info.row.original.status || 'waiting' },
    { header: 'Winner', cell: info => info.row.original.winnerId || 'N/A' },
    { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
    { header: 'Actions', cell: action },
  ];
}

function QuizPreview({ questions }) {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return <EmptyState label="Aucune question." />;
  return (
    <div className="question-list">
      {list.map((question, index) => (
        <QuestionCard
          key={question.id || `${question.text}-${index}`}
          index={index}
          question={question}
        />
      ))}
    </div>
  );
}

function QuestionCard({ index, question }) {
  const type = question?.type === 'open' ? 'open' : 'mcq';
  const options = Array.isArray(question?.options)
    ? question.options.filter(Boolean)
    : [];
  const answer = question?.answer || 'Reponse manquante';
  return (
    <div className="question-card">
      <div className="question-top">
        <strong>#{index + 1}</strong>
        <ModePill mode={type} />
        {options.length > 5 && (
          <span className="warning-text">Max 5 choix</span>
        )}
      </div>
      <p>{question?.text || 'Question manquante'}</p>
      <div className="answer-line">
        Reponse: <strong>{answer}</strong>
      </div>
      {type === 'mcq' ? (
        <div className="choice-list">
          {options.slice(0, 5).map((option, optionIndex) => (
            <span
              key={`${option}-${optionIndex}`}
              className={option === answer ? 'choice good' : 'choice'}
            >
              {optionIndex + 1}. {option}
            </span>
          ))}
        </div>
      ) : (
        <small>Reponse libre analysee par Gemini.</small>
      )}
    </div>
  );
}

function QuestionCounters({ questions }) {
  const stats = questionStats(questions);
  return (
    <div className="counter-stack">
      <ModePill mode="mcq" label={`QCM ${stats.mcq}`} />
      <ModePill mode="open" label={`Open ${stats.open}`} />
      {stats.tooManyChoices ? (
        <span className="warning-text">
          {stats.tooManyChoices} &gt; 5 choix
        </span>
      ) : null}
    </div>
  );
}

function ModePill({ label, mode }) {
  const text =
    label ||
    (mode === 'battle_royale'
      ? 'battle'
      : mode === 'open'
      ? 'ouverte'
      : mode === 'mcq'
      ? 'qcm'
      : 'solo');
  return <span className={`pill ${mode || 'solo'}`}>{text}</span>;
}

function DetailsPanel({ crudBusy, onClose, onDelete, onEdit, record }) {
  return (
    <aside className="details-panel glass-panel">
      <div className="details-head">
        <h2>Details</h2>
        <button className="btn small ghost" onClick={onClose}>
          Fermer
        </button>
      </div>
      <div className="details-actions">
        <button
          className="btn small ghost"
          disabled={crudBusy}
          onClick={() => onEdit(record)}
        >
          <Pencil size={14} /> Modifier
        </button>
        <button
          className="btn small danger"
          disabled={crudBusy}
          onClick={() => onDelete(record)}
        >
          <Trash2 size={14} /> Supprimer
        </button>
      </div>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </aside>
  );
}

function CrudModal({ busy, modal, onClose, onSave, setJson }) {
  const title =
    modal.mode === 'create'
      ? 'Creer un enregistrement'
      : `Modifier ${modal.id || ''}`;
  return (
    <div className="crud-overlay" role="dialog" aria-modal="true">
      <section className="crud-modal glass-panel">
        <div className="details-head">
          <h2>{title}</h2>
          <button className="btn small ghost" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
        <p className="crud-hint">
          Edite le document JSON (sans le champ <code>id</code> — il est gere
          automatiquement).
        </p>
        <textarea
          className="crud-json"
          disabled={busy}
          onChange={event => setJson(event.target.value)}
          rows={18}
          spellCheck={false}
          value={modal.json}
        />
        {modal.error ? <p className="crud-error">{modal.error}</p> : null}
        <div className="crud-actions">
          <button className="btn ghost" disabled={busy} onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={busy} onClick={onSave}>
            {busy ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsPage({
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
      <FirestoreAccessPanel />
      <AiPromptTester />
    </div>
  );
}

function FirestoreAccessPanel() {
  const [panelKey, setPanelKey] = useState(getPanelAdminKey());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const hasToken = Boolean(getStoredIdToken());

  const savePanelKey = () => {
    setSessionPanelKey(panelKey);
    setMessage('Cle panel enregistree pour cette session.');
  };

  const loginFirestore = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      setStoredIdToken(data.account?.idToken || '');
      setMessage(
        `Connecte en tant que ${data.account?.displayName || data.account?.email}.`,
      );
    } catch (err) {
      setMessage(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  const logoutFirestore = () => {
    setStoredIdToken('');
    setMessage('Session Firestore retiree.');
  };

  return (
    <Panel title="Acces Firestore (panel admin)">
      <div className="ai-tester">
        <div className="ai-note">
          Les lectures Firestore passent par l&apos;API avec ADMIN_PANEL_KEY. Sans
          PANEL_FIRESTORE_EMAIL/PASSWORD sur Vercel, connecte un compte Firebase
          ci-dessous (meme email que l&apos;app mobile, projet quizbit-cecc1).
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

function EmptyState({ label }) {
  return <span className="empty-state">{label}</span>;
}
