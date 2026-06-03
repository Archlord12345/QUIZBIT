import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Activity,
  CheckCircle,
  Database,
  Download,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Users,
  XCircle,
} from 'lucide-react';

const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    'AIzaSyB3-z7Zsu8dki3nUuiqHRAlJmbFRk1l5TY',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    'quizbit-cecc1.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'quizbit-cecc1',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    'quizbit-cecc1.firebasestorage.app',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '80759305815',
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    '1:80759305815:web:e8630b7d06e4965bdad512',
  measurementId:
    process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-4T8SFQHM4G',
};

const PAGE_SIZE = 75;
const REQUEST_TIMEOUT_MS = 9000;

const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
const firebaseApp = firebaseEnabled ? initializeApp(firebaseConfig) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    color: '#172B4D',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#0052CC',
    color: 'white',
    padding: 20,
    position: 'sticky',
    top: 0,
    height: '100vh',
    boxSizing: 'border-box',
  },
  main: {
    flex: 1,
    padding: 40,
    overflowY: 'auto',
    backgroundColor: '#F4F5F7',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 14px',
    marginBottom: 8,
    borderRadius: 10,
    border: 0,
    color: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
    gap: 20,
    alignItems: 'start',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 4px 14px rgba(9, 30, 66, 0.08)',
  },
  tableWrap: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'auto',
    boxShadow: '0 4px 14px rgba(9, 30, 66, 0.08)',
  },
  table: {
    width: '100%',
    minWidth: 860,
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    color: '#6B778C',
    fontSize: 12,
    letterSpacing: 0.5,
    padding: 14,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  td: {
    borderBottom: '1px solid #E5E7EB',
    padding: 14,
    verticalAlign: 'top',
  },
  pill: {
    borderRadius: 999,
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 800,
    padding: '4px 10px',
  },
  button: {
    border: 0,
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 800,
    padding: '10px 14px',
  },
  input: {
    border: '1px solid #DFE1E6',
    borderRadius: 10,
    fontSize: 14,
    padding: '11px 12px',
  },
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
  if (!response.ok || !data.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data.message || 'Test OK';
};

const normalize = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const recordMatches = (record, search) =>
  !search || normalize(JSON.stringify(record)).includes(normalize(search));

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

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({ stats: true });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
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

  const setLoadingFlag = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const fetchStats = useCallback(async () => {
    if (!db) return;
    setLoadingFlag('stats', true);
    setError('');
    try {
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
      console.error(err);
      setError('Impossible de charger les statistiques Firestore.');
    } finally {
      setLoadingFlag('stats', false);
    }
  }, [setLoadingFlag]);

  const fetchCollection = useCallback(
    async ({ key, collectionName, orderField, setter }) => {
      if (!db) return;
      setLoadingFlag('data', true);
      setError('');
      try {
        const request = query(
          collection(db, collectionName),
          orderBy(orderField, 'desc'),
          limit(PAGE_SIZE),
        );
        const snap = await getDocs(request);
        setter(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
        setError(`Impossible de charger ${key}.`);
      } finally {
        setLoadingFlag('data', false);
      }
    },
    [setLoadingFlag],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setSearch('');
    setSelectedRecord(null);
    if (currentPage === 'questions') {
      fetchCollection({
        key: 'les quiz',
        collectionName: 'quizzes',
        orderField: 'createdAt',
        setter: setQuizzes,
      });
    }
    if (currentPage === 'users') {
      fetchCollection({
        key: 'les utilisateurs',
        collectionName: 'users',
        orderField: 'totalScore',
        setter: setUsers,
      });
    }
    if (currentPage === 'scores') {
      fetchCollection({
        key: 'les scores',
        collectionName: 'scores',
        orderField: 'score',
        setter: setScores,
      });
    }
    if (currentPage === 'battle') {
      fetchCollection({
        key: 'les battle rooms',
        collectionName: 'battleRooms',
        orderField: 'createdAt',
        setter: setBattleRooms,
      });
    }
  }, [currentPage, fetchCollection]);

  const navItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
      },
      { id: 'questions', label: 'Questions', icon: <Database size={20} /> },
      { id: 'users', label: 'Users', icon: <Users size={20} /> },
      { id: 'scores', label: 'Scores', icon: <Activity size={20} /> },
      {
        id: 'battle',
        label: 'Battle Rooms',
        icon: <MessageSquare size={20} />,
      },
      { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
    [],
  );

  const pageRows = useMemo(
    () => ({
      dashboard: [],
      questions: quizzes,
      users,
      scores,
      battle: battleRooms,
      settings: [],
    }),
    [battleRooms, quizzes, scores, users],
  );

  const currentRows = pageRows[currentPage] || [];
  const filteredRows = useMemo(
    () => currentRows.filter(row => recordMatches(row, search)),
    [currentRows, search],
  );

  const analytics = useMemo(() => {
    const battleScores = scores.filter(score => score.mode === 'battle_royale');
    const soloScores = scores.filter(score => score.mode !== 'battle_royale');
    const topScores = [...scores]
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
      .slice(0, 5);
    const recentActivity = [
      ...scores.map(score => ({
        id: `score-${score.id}`,
        type: 'Score',
        label: `${score.displayName || 'Player'}: ${score.score || 0} pts`,
        date: score.createdAt,
      })),
      ...quizzes.map(quiz => ({
        id: `quiz-${quiz.id}`,
        type: 'Quiz',
        label: quiz.theme || 'Quiz sans theme',
        date: quiz.createdAt,
      })),
      ...battleRooms.map(room => ({
        id: `room-${room.id || room.code}`,
        type: 'Battle',
        label: `${room.code || 'Room'} - ${room.status || 'waiting'}`,
        date: room.createdAt,
      })),
    ]
      .sort((left, right) => dateMs(right.date) - dateMs(left.date))
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

  const refreshCurrentPage = useCallback(() => {
    fetchStats();
    if (currentPage === 'questions') {
      fetchCollection({
        key: 'les quiz',
        collectionName: 'quizzes',
        orderField: 'createdAt',
        setter: setQuizzes,
      });
    }
    if (currentPage === 'users') {
      fetchCollection({
        key: 'les utilisateurs',
        collectionName: 'users',
        orderField: 'totalScore',
        setter: setUsers,
      });
    }
    if (currentPage === 'scores') {
      fetchCollection({
        key: 'les scores',
        collectionName: 'scores',
        orderField: 'score',
        setter: setScores,
      });
    }
    if (currentPage === 'battle') {
      fetchCollection({
        key: 'les battle rooms',
        collectionName: 'battleRooms',
        orderField: 'createdAt',
        setter: setBattleRooms,
      });
    }
  }, [currentPage, fetchCollection, fetchStats]);

  const exportRows = useCallback(
    format => {
      const rows = currentPage === 'dashboard' ? [stats] : filteredRows;
      const filename = `quizbit-${currentPage}-${new Date()
        .toISOString()
        .slice(0, 10)}`;
      if (format === 'csv') {
        downloadFile(`${filename}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
      } else {
        downloadFile(
          `${filename}.json`,
          JSON.stringify(rows, null, 2),
          'application/json;charset=utf-8',
        );
      }
    },
    [currentPage, filteredRows, stats],
  );

  const testFirebase = useCallback(async () => {
    setLoadingFlag('firebase', true);
    try {
      if (!db) throw new Error('Firebase non configure.');
      await withTimeout(
        getCountFromServer(collection(db, 'users')),
        'Firebase',
      );
      setTestResults(prev => ({
        ...prev,
        firebase: { status: 'success', message: 'Connection Firestore OK' },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        firebase: { status: 'error', message: err.message },
      }));
    } finally {
      setLoadingFlag('firebase', false);
    }
  }, [setLoadingFlag]);

  const testGemini = useCallback(async () => {
    setLoadingFlag('gemini', true);
    try {
      const message = await testServerEndpoint('/api/test-gemini');
      setTestResults(prev => ({
        ...prev,
        gemini: { status: 'success', message },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        gemini: { status: 'error', message: err.message },
      }));
    } finally {
      setLoadingFlag('gemini', false);
    }
  }, [setLoadingFlag]);

  const testMistral = useCallback(async () => {
    setLoadingFlag('mistral', true);
    try {
      const message = await testServerEndpoint('/api/test-mistral');
      setTestResults(prev => ({
        ...prev,
        mistral: { status: 'success', message },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        mistral: { status: 'error', message: err.message },
      }));
    } finally {
      setLoadingFlag('mistral', false);
    }
  }, [setLoadingFlag]);

  const testCloudinary = useCallback(async () => {
    setLoadingFlag('cloudinary', true);
    try {
      const message = await testServerEndpoint('/api/test-cloudinary');
      setTestResults(prev => ({
        ...prev,
        cloudinary: { status: 'success', message },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        cloudinary: { status: 'error', message: err.message },
      }));
    } finally {
      setLoadingFlag('cloudinary', false);
    }
  }, [setLoadingFlag]);

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <h1 style={{ fontSize: 24, marginBottom: 32 }}>QuizBit Admin</h1>
        <nav>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              active={currentPage === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => setCurrentPage(item.id)}
            />
          ))}
        </nav>
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 12,
            marginTop: 28,
          }}
        >
          Donnees Firestore reelles uniquement. Aucun seed mock depuis ce panel.
        </div>
      </aside>

      <main style={styles.main}>
        <Header
          loading={loading.stats || loading.data}
          onExportCsv={() => exportRows('csv')}
          onExportJson={() => exportRows('json')}
          onRefresh={refreshCurrentPage}
          showExport={currentPage !== 'settings'}
          title={
            navItems.find(item => item.id === currentPage)?.label || 'Dashboard'
          }
        />
        {error ? <Banner message={error} tone="error" /> : null}
        {!firebaseEnabled ? (
          <Banner message="Firebase n'est pas configure. Les donnees cloud ne peuvent pas etre chargees." />
        ) : null}

        {currentPage !== 'dashboard' && currentPage !== 'settings' ? (
          <Toolbar
            count={filteredRows.length}
            search={search}
            total={currentRows.length}
            onSearch={setSearch}
          />
        ) : null}

        {currentPage === 'dashboard' ? (
          <Dashboard analytics={analytics} stats={stats} />
        ) : null}
        {currentPage === 'questions' ? (
          <PageWithDetails
            details={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          >
            <QuestionsTable rows={filteredRows} onSelect={setSelectedRecord} />
          </PageWithDetails>
        ) : null}
        {currentPage === 'users' ? (
          <PageWithDetails
            details={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          >
            <UsersTable rows={filteredRows} onSelect={setSelectedRecord} />
          </PageWithDetails>
        ) : null}
        {currentPage === 'scores' ? (
          <PageWithDetails
            details={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          >
            <ScoresTable rows={filteredRows} onSelect={setSelectedRecord} />
          </PageWithDetails>
        ) : null}
        {currentPage === 'battle' ? (
          <PageWithDetails
            details={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          >
            <BattleRoomsTable
              rows={filteredRows}
              onSelect={setSelectedRecord}
            />
          </PageWithDetails>
        ) : null}
        {currentPage === 'settings' ? (
          <SettingsPage
            firebaseConfig={firebaseConfig}
            firebaseEnabled={firebaseEnabled}
            loading={loading}
            results={testResults}
            onTestFirebase={testFirebase}
            onTestGemini={testGemini}
            onTestMistral={testMistral}
            onTestCloudinary={testCloudinary}
          />
        ) : null}
      </main>
    </div>
  );
}

const Header = memo(
  ({ loading, onExportCsv, onExportJson, onRefresh, showExport, title }) => (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 26,
      }}
    >
      <div>
        <h2 style={{ color: '#0747A6', fontSize: 28, margin: 0 }}>{title}</h2>
        <p style={{ color: '#6B778C', marginTop: 6 }}>
          Monitoring cloud, comptes, quiz, scores, battles et diagnostics.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {showExport ? (
          <>
            <button
              onClick={onExportCsv}
              style={{ ...styles.button, backgroundColor: '#36B37E' }}
            >
              <Download size={16} style={{ verticalAlign: 'middle' }} /> CSV
            </button>
            <button
              onClick={onExportJson}
              style={{ ...styles.button, backgroundColor: '#6554C0' }}
            >
              JSON
            </button>
          </>
        ) : null}
        <button
          disabled={loading}
          onClick={onRefresh}
          style={{
            ...styles.button,
            alignSelf: 'flex-start',
            backgroundColor: loading ? '#97A0AF' : '#0052CC',
          }}
        >
          {loading ? 'Chargement...' : 'Rafraichir'}
        </button>
      </div>
    </header>
  ),
);

const Toolbar = memo(({ count, onSearch, search, total }) => (
  <div
    style={{
      ...styles.card,
      alignItems: 'center',
      display: 'flex',
      gap: 14,
      justifyContent: 'space-between',
      marginBottom: 18,
      padding: 16,
    }}
  >
    <div style={{ alignItems: 'center', display: 'flex', flex: 1, gap: 10 }}>
      <Search color="#6B778C" size={18} />
      <input
        value={search}
        onChange={event => onSearch(event.target.value)}
        placeholder="Rechercher dans les donnees chargees..."
        style={{ ...styles.input, flex: 1 }}
      />
    </div>
    <strong style={{ color: '#6B778C' }}>
      {count}/{total} lignes
    </strong>
  </div>
));

const NavItem = memo(({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      ...styles.navButton,
      backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'transparent',
    }}
  >
    {icon}
    {label}
  </button>
));

const Banner = memo(({ message, tone = 'warn' }) => (
  <div
    style={{
      ...styles.card,
      backgroundColor: tone === 'error' ? '#FFEBE6' : '#FFF7D6',
      color: tone === 'error' ? '#BF2600' : '#172B4D',
      marginBottom: 20,
    }}
  >
    {message}
  </div>
));

const Dashboard = memo(({ analytics, stats }) => (
  <div style={{ display: 'grid', gap: 20 }}>
    <div style={styles.grid}>
      <StatCard title="Players" value={stats.players} color="#36B37E" />
      <StatCard title="Quizzes" value={stats.quizzes} color="#00B8D9" />
      <StatCard title="Scores" value={stats.scores} color="#FFAB00" />
      <StatCard
        title="Battle Rooms"
        value={stats.battleRooms}
        color="#6554C0"
      />
      <StatCard
        title="Avg Score"
        value={analytics.averageScore}
        color="#0747A6"
      />
    </div>
    <div style={styles.twoColumn}>
      <Panel title="Activite recente">
        <CompactList rows={analytics.recentActivity} />
      </Panel>
      <Panel title="Top scores">
        <CompactList
          rows={analytics.topScores.map(score => ({
            id: score.id,
            type: score.mode === 'battle_royale' ? 'Battle' : 'Solo',
            label: `${score.displayName || 'Player'} - ${score.score || 0} pts`,
            date: score.createdAt,
          }))}
        />
      </Panel>
    </div>
    <div style={styles.grid}>
      <StatCard
        title="Solo Scores"
        value={analytics.soloScores}
        color="#36B37E"
      />
      <StatCard
        title="Battle Scores"
        value={analytics.battleScores}
        color="#6554C0"
      />
      <StatCard
        title="Rooms Waiting"
        value={analytics.waitingRooms}
        color="#FFAB00"
      />
      <StatCard
        title="Rooms Active"
        value={analytics.activeRooms}
        color="#00B8D9"
      />
      <StatCard
        title="Rooms Finished"
        value={analytics.finishedRooms}
        color="#97A0AF"
      />
    </div>
  </div>
));

const Panel = memo(({ children, title }) => (
  <section style={styles.card}>
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {children}
  </section>
));

const CompactList = memo(({ rows }) => {
  if (!rows.length) {
    return <div style={{ color: '#6B778C' }}>Aucune donnee chargee.</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map(row => (
        <div
          key={row.id}
          style={{
            borderBottom: '1px solid #E5E7EB',
            display: 'grid',
            gap: 4,
            paddingBottom: 10,
          }}
        >
          <strong>{row.label}</strong>
          <span style={{ color: '#6B778C', fontSize: 12 }}>
            {row.type} - {safeDate(row.date)}
          </span>
        </div>
      ))}
    </div>
  );
});

const StatCard = memo(({ color, title, value }) => (
  <div style={styles.card}>
    <div style={{ color: '#6B778C', fontSize: 13, fontWeight: 800 }}>
      {title}
    </div>
    <div style={{ color, fontSize: 38, fontWeight: 900, marginTop: 8 }}>
      {value}
    </div>
  </div>
));

const PageWithDetails = memo(({ children, details, onClose }) => (
  <div style={details ? styles.twoColumn : undefined}>
    {children}
    {details ? <DetailsPanel record={details} onClose={onClose} /> : null}
  </div>
));

const DetailsPanel = memo(({ onClose, record }) => (
  <aside style={{ ...styles.card, position: 'sticky', top: 20 }}>
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Details</h3>
      <button
        onClick={onClose}
        style={{
          ...styles.button,
          backgroundColor: '#97A0AF',
          padding: '7px 10px',
        }}
      >
        Fermer
      </button>
    </div>
    <pre
      style={{
        backgroundColor: '#F4F5F7',
        borderRadius: 10,
        fontSize: 12,
        maxHeight: 520,
        overflow: 'auto',
        padding: 14,
        whiteSpace: 'pre-wrap',
      }}
    >
      {JSON.stringify(record, null, 2)}
    </pre>
  </aside>
));

const EmptyRow = memo(({ colSpan }) => (
  <tr>
    <td
      colSpan={colSpan}
      style={{ ...styles.td, color: '#6B778C', textAlign: 'center' }}
    >
      Aucune donnee.
    </td>
  </tr>
));

const QuestionsTable = memo(({ onSelect, rows }) => (
  <DataTable headers={['Theme', 'Questions', 'Date', 'Mode', 'Actions']}>
    {rows.length === 0 ? <EmptyRow colSpan={5} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.theme || 'N/A'}</td>
        <td style={styles.td}>{row.questions?.length || 0}</td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
        <td style={styles.td}>{row.mode || 'solo'}</td>
        <td style={styles.td}>
          <ActionButton onClick={() => onSelect(row)} label="Voir" />
        </td>
      </tr>
    ))}
  </DataTable>
));

const UsersTable = memo(({ onSelect, rows }) => (
  <DataTable
    headers={[
      'Username',
      'Email',
      'Total Score',
      'Best',
      'Played',
      'Avatar',
      'Actions',
    ]}
  >
    {rows.length === 0 ? <EmptyRow colSpan={7} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.displayName || row.username || 'Player'}</td>
        <td style={styles.td}>{row.email || 'N/A'}</td>
        <td style={styles.td}>{row.totalScore || 0}</td>
        <td style={styles.td}>{row.bestScore || 0}</td>
        <td style={styles.td}>{row.gamesPlayed || 0}</td>
        <td style={styles.td}>{row.avatarUrl ? 'Oui' : 'Non'}</td>
        <td style={styles.td}>
          <ActionButton onClick={() => onSelect(row)} label="Voir" />
        </td>
      </tr>
    ))}
  </DataTable>
));

const ScoresTable = memo(({ onSelect, rows }) => (
  <DataTable headers={['Player', 'Theme', 'Score', 'Mode', 'Date', 'Actions']}>
    {rows.length === 0 ? <EmptyRow colSpan={6} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.displayName || 'Player'}</td>
        <td style={styles.td}>{row.theme || 'N/A'}</td>
        <td style={{ ...styles.td, fontWeight: 900 }}>{row.score || 0}</td>
        <td style={styles.td}>
          <ModePill mode={row.mode} />
        </td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
        <td style={styles.td}>
          <ActionButton onClick={() => onSelect(row)} label="Voir" />
        </td>
      </tr>
    ))}
  </DataTable>
));

const BattleRoomsTable = memo(({ onSelect, rows }) => (
  <DataTable
    headers={[
      'Code',
      'Theme',
      'Players',
      'Status',
      'Winner',
      'Created',
      'Actions',
    ]}
  >
    {rows.length === 0 ? <EmptyRow colSpan={7} /> : null}
    {rows.map(row => (
      <tr key={row.id || row.code}>
        <td style={{ ...styles.td, fontWeight: 900 }}>{row.code || row.id}</td>
        <td style={styles.td}>{row.config?.theme || 'N/A'}</td>
        <td style={styles.td}>{row.players?.length || 0}</td>
        <td style={styles.td}>{row.status || 'waiting'}</td>
        <td style={styles.td}>{row.winnerId || 'N/A'}</td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
        <td style={styles.td}>
          <ActionButton onClick={() => onSelect(row)} label="Voir" />
        </td>
      </tr>
    ))}
  </DataTable>
));

const ActionButton = memo(({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      ...styles.button,
      backgroundColor: '#0052CC',
      padding: '8px 11px',
    }}
  >
    {label}
  </button>
));

const ModePill = memo(({ mode }) => (
  <span
    style={{
      ...styles.pill,
      backgroundColor: mode === 'battle_royale' ? '#EAE6FF' : '#E3FCEF',
      color: mode === 'battle_royale' ? '#403294' : '#006644',
    }}
  >
    {mode || 'solo'}
  </span>
));

const DataTable = memo(({ children, headers }) => (
  <div style={styles.tableWrap}>
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map(header => (
            <th key={header} style={styles.th}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
));

const SettingsPage = memo(
  ({
    firebaseConfig,
    firebaseEnabled,
    loading,
    onTestCloudinary,
    onTestFirebase,
    onTestGemini,
    onTestMistral,
    results,
  }) => (
    <div style={{ display: 'grid', gap: 20, maxWidth: 920 }}>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Diagnostics</h3>
        <TestRow
          label="Firebase Firestore"
          loading={loading.firebase}
          onTest={onTestFirebase}
          result={results.firebase}
        />
        <TestRow
          label="Google Gemini API"
          loading={loading.gemini}
          onTest={onTestGemini}
          result={results.gemini}
        />
        <TestRow
          label="Mistral AI API"
          loading={loading.mistral}
          onTest={onTestMistral}
          result={results.mistral}
        />
        <TestRow
          label="Cloudinary Upload"
          loading={loading.cloudinary}
          onTest={onTestCloudinary}
          result={results.cloudinary}
        />
      </div>
      <ConfigurationChecklist
        firebaseConfig={firebaseConfig}
        firebaseEnabled={firebaseEnabled}
        results={results}
      />
    </div>
  ),
);

const ConfigurationChecklist = memo(
  ({ firebaseConfig, firebaseEnabled, results }) => {
    const rows = [
      [
        'Firebase client',
        firebaseEnabled,
        firebaseConfig.projectId || 'projectId manquant',
      ],
      [
        'Gemini server route',
        results.gemini?.status === 'success',
        results.gemini?.message || 'Non teste',
      ],
      [
        'Mistral server route',
        results.mistral?.status === 'success',
        results.mistral?.message || 'Non teste',
      ],
      [
        'Cloudinary server route',
        results.cloudinary?.status === 'success',
        results.cloudinary?.message || 'Non teste',
      ],
    ];
    return (
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Configuration</h3>
        <DataTable headers={['Service', 'Status', 'Detail']}>
          {rows.map(([label, ok, detail]) => (
            <tr key={label}>
              <td style={styles.td}>{label}</td>
              <td style={styles.td}>{ok ? 'OK' : 'A verifier'}</td>
              <td style={styles.td}>{detail}</td>
            </tr>
          ))}
        </DataTable>
        <p style={{ color: '#6B778C', lineHeight: 1.6 }}>
          Les secrets Gemini, Mistral et Cloudinary doivent etre configures dans
          Vercel comme variables serveur. Les variables Firebase client doivent
          etre prefixees par REACT_APP_ pour le bundle admin.
        </p>
      </div>
    );
  },
);

const TestRow = memo(({ label, loading, onTest, result }) => (
  <div
    style={{
      alignItems: 'center',
      borderBottom: '1px solid #E5E7EB',
      display: 'grid',
      gap: 14,
      gridTemplateColumns: '1fr auto 1.5fr',
      padding: '14px 0',
    }}
  >
    <strong>{label}</strong>
    <button
      disabled={loading}
      onClick={onTest}
      style={{
        ...styles.button,
        backgroundColor: loading ? '#97A0AF' : '#0052CC',
      }}
    >
      {loading ? 'Test...' : 'Tester'}
    </button>
    <span
      style={{
        alignItems: 'center',
        color: result?.status === 'success' ? '#36B37E' : '#FF5630',
        display: 'flex',
        gap: 8,
      }}
    >
      {result?.status === 'success' ? <CheckCircle size={18} /> : null}
      {result?.status === 'error' ? <XCircle size={18} /> : null}
      {result?.message || 'Non teste'}
    </span>
  </div>
));

export default App;
