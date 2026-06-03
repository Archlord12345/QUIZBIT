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
  LayoutDashboard,
  MessageSquare,
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

const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 9000;

const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
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
    width: 250,
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
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 4px 14px rgba(9, 30, 66, 0.08)',
  },
  tableWrap: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(9, 30, 66, 0.08)',
  },
  table: {
    width: '100%',
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
};

const safeDate = value => {
  if (!value) return 'N/A';
  const date =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
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

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({ stats: true });
  const [error, setError] = useState('');
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

  const refreshCurrentPage = useCallback(() => {
    fetchStats();
    setQuizzes([]);
    setUsers([]);
    setScores([]);
    setBattleRooms([]);
    setCurrentPage(page => page);
  }, [fetchStats]);

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
      </aside>

      <main style={styles.main}>
        <Header
          loading={loading.stats || loading.data}
          onRefresh={refreshCurrentPage}
          title={
            navItems.find(item => item.id === currentPage)?.label || 'Dashboard'
          }
        />
        {error ? <Banner message={error} tone="error" /> : null}
        {!firebaseEnabled ? (
          <Banner message="Firebase n'est pas configure. Les donnees cloud ne peuvent pas etre chargees." />
        ) : null}

        {currentPage === 'dashboard' ? <Dashboard stats={stats} /> : null}
        {currentPage === 'questions' ? <QuestionsTable rows={quizzes} /> : null}
        {currentPage === 'users' ? <UsersTable rows={users} /> : null}
        {currentPage === 'scores' ? <ScoresTable rows={scores} /> : null}
        {currentPage === 'battle' ? (
          <BattleRoomsTable rows={battleRooms} />
        ) : null}
        {currentPage === 'settings' ? (
          <SettingsPage
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

const Header = memo(({ loading, onRefresh, title }) => (
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
        Monitoring cloud, comptes, quiz, scores et battles.
      </p>
    </div>
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
  </header>
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

const Dashboard = memo(({ stats }) => (
  <div style={styles.grid}>
    <StatCard title="Players" value={stats.players} color="#36B37E" />
    <StatCard title="Quizzes" value={stats.quizzes} color="#00B8D9" />
    <StatCard title="Scores" value={stats.scores} color="#FFAB00" />
    <StatCard title="Battle Rooms" value={stats.battleRooms} color="#6554C0" />
  </div>
));

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

const QuestionsTable = memo(({ rows }) => (
  <DataTable headers={['Theme', 'Questions', 'Date', 'Mode']}>
    {rows.length === 0 ? <EmptyRow colSpan={4} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.theme || 'N/A'}</td>
        <td style={styles.td}>{row.questions?.length || 0}</td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
        <td style={styles.td}>{row.mode || 'solo'}</td>
      </tr>
    ))}
  </DataTable>
));

const UsersTable = memo(({ rows }) => (
  <DataTable headers={['Username', 'Email', 'Total Score', 'Best', 'Played']}>
    {rows.length === 0 ? <EmptyRow colSpan={5} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.displayName || row.username || 'Player'}</td>
        <td style={styles.td}>{row.email || 'N/A'}</td>
        <td style={styles.td}>{row.totalScore || 0}</td>
        <td style={styles.td}>{row.bestScore || 0}</td>
        <td style={styles.td}>{row.gamesPlayed || 0}</td>
      </tr>
    ))}
  </DataTable>
));

const ScoresTable = memo(({ rows }) => (
  <DataTable headers={['Player', 'Theme', 'Score', 'Mode', 'Date']}>
    {rows.length === 0 ? <EmptyRow colSpan={5} /> : null}
    {rows.map(row => (
      <tr key={row.id}>
        <td style={styles.td}>{row.displayName || 'Player'}</td>
        <td style={styles.td}>{row.theme || 'N/A'}</td>
        <td style={{ ...styles.td, fontWeight: 900 }}>{row.score || 0}</td>
        <td style={styles.td}>
          <span
            style={{
              ...styles.pill,
              backgroundColor:
                row.mode === 'battle_royale' ? '#EAE6FF' : '#E3FCEF',
              color: row.mode === 'battle_royale' ? '#403294' : '#006644',
            }}
          >
            {row.mode || 'solo'}
          </span>
        </td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
      </tr>
    ))}
  </DataTable>
));

const BattleRoomsTable = memo(({ rows }) => (
  <DataTable headers={['Code', 'Theme', 'Players', 'Status', 'Created']}>
    {rows.length === 0 ? <EmptyRow colSpan={5} /> : null}
    {rows.map(row => (
      <tr key={row.id || row.code}>
        <td style={{ ...styles.td, fontWeight: 900 }}>{row.code || row.id}</td>
        <td style={styles.td}>{row.config?.theme || 'N/A'}</td>
        <td style={styles.td}>{row.players?.length || 0}</td>
        <td style={styles.td}>{row.status || 'waiting'}</td>
        <td style={styles.td}>{safeDate(row.createdAt)}</td>
      </tr>
    ))}
  </DataTable>
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
    loading,
    onTestCloudinary,
    onTestFirebase,
    onTestGemini,
    onTestMistral,
    results,
  }) => (
    <div style={{ ...styles.card, maxWidth: 760 }}>
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
  ),
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
