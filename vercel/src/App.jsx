import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
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
  postPanelApi,
} from './panelApi.js';
import { COLLECTIONS, NAV_ITEMS } from './constants.js';
import {
  PAGE_SIZE,
  dateMs,
  downloadFile,
  testServerEndpoint,
  toCsv,
  withTimeout,
} from './lib/format.js';
import {
  firebaseConfig,
  firebaseEnabled,
  getFirestoreDb,
} from './lib/firestoreClient.js';
import { PanelSplash } from './components/PanelSplash.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { Banner } from './components/ui.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { DataPage } from './components/DataTable.jsx';
import { CrudModal } from './components/CrudModal.jsx';
import { SettingsPage } from './components/SettingsPage.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [booting, setBooting] = useState(true);
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
    if (currentPage === 'offline-studio' || currentPage === 'settings') {
      return;
    }
    if (currentPage === 'dashboard') {
      fetchCollection('users');
      fetchCollection('scores');
      fetchCollection('battle');
      fetchCollection('questions');
      return;
    }
    if (currentPage !== 'users') {
      fetchCollection('users');
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
        userId: score.userId,
        avatarUrl: score.avatarUrl,
        displayName: score.displayName || 'Player',
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
    if (currentPage === 'dashboard') {
      fetchCollection('users');
      fetchCollection('scores');
      fetchCollection('battle');
      fetchCollection('questions');
      return;
    }
    if (isCrudPage(currentPage)) {
      if (currentPage !== 'users') fetchCollection('users');
      fetchCollection(currentPage);
    }
  }, [currentPage, fetchCollection, fetchStats]);

  const usersById = useMemo(
    () => Object.fromEntries((users || []).map(user => [user.id, user])),
    [users],
  );

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
      const collectionName = PAGE_COLLECTION[currentPage];
      if (!collectionName || !record?.id) return;
      const label =
        record.theme || record.displayName || record.code || record.id;
      if (!window.confirm(`Supprimer « ${label} » ?`)) return;
      setCrudBusy(true);
      setError('');
      try {
        await deleteFirestoreRecord(collectionName, record.id);
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
    const collectionName = PAGE_COLLECTION[crudModal.page];
    if (!collectionName) return;
    setCrudBusy(true);
    setCrudModal(prev => ({ ...prev, error: '' }));
    try {
      await upsertFirestoreRecord(
        collectionName,
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
    if (currentPage !== 'settings') return;
    runDiagnostic('mistral', () => testServerEndpoint('/api/test-mistral'));
    if (getPanelAdminKey()) {
      diagnostics.firebase();
      diagnostics.auth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1300);
    return () => clearTimeout(timer);
  }, []);

  if (booting) {
    return <PanelSplash />;
  }

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
              <Dashboard
                analytics={analytics}
                stats={stats}
                users={users}
                usersById={usersById}
              />
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
                usersById={usersById}
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
