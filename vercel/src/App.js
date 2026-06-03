import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, orderBy, count } from 'firebase/firestore';
import { LayoutDashboard, Users, MessageSquare, Settings, Database, Activity, CheckCircle, XCircle, Search } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyB3-z7Zsu8dki3nUuiqHRAlJmbFRk1l5TY",
  authDomain: "quizbit-cecc1.firebaseapp.com",
  projectId: "quizbit-cecc1",
  storageBucket: "quizbit-cecc1.firebasestorage.app",
  messagingSenderId: "80759305815",
  appId: "1:80759305815:web:e8630b7d06e4965bdad512",
  measurementId: "G-4T8SFQHM4G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GEMINI_KEY = "AIzaSyC2BFG1aCUtrNTPX4J_paX3LeNREg_Lpk8";
const MISTRAL_KEY = "mRojCOQOb7lUy82kZ8lixtQwMG4vau5d";

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [stats, setStats] = useState({ players: 0, quizzes: 0 });
  const [quizzes, setQuizzes] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchStats();
    if (currentPage === 'questions') fetchQuizzes();
    if (currentPage === 'users') fetchUsers();
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const quizSnap = await getDocs(collection(db, 'quizzes'));
      const userSnap = await getDocs(collection(db, 'users'));
      setStats({ quizzes: quizSnap.size, players: userSnap.size });
    } catch (e) { console.error(e); }
  };

  const fetchQuizzes = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    try {
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, data: false }));
  };

  const fetchUsers = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(50)));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, data: false }));
  };

  const testFirebase = async () => {
    setLoading(prev => ({ ...prev, firebase: true }));
    try {
      const q = query(collection(db, 'quizzes'), limit(1));
      await getDocs(q);
      setTestResults(prev => ({ ...prev, firebase: { status: 'success', message: 'Connection Firestore OK' } }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, firebase: { status: 'error', message: e.message } }));
    }
    setLoading(prev => ({ ...prev, firebase: false }));
  };

  const testGemini = async () => {
    setLoading(prev => ({ ...prev, gemini: true }));
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
      });
      if (response.ok) {
        setTestResults(prev => ({ ...prev, gemini: { status: 'success', message: 'API Gemini OK' } }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      setTestResults(prev => ({ ...prev, gemini: { status: 'error', message: e.message } }));
    }
    setLoading(prev => ({ ...prev, gemini: false }));
  };

  const testMistral = async () => {
    setLoading(prev => ({ ...prev, mistral: true }));
    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${MISTRAL_KEY}` }
      });
      if (response.ok) {
        setTestResults(prev => ({ ...prev, mistral: { status: 'success', message: 'API Mistral OK' } }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      setTestResults(prev => ({ ...prev, mistral: { status: 'error', message: e.message } }));
    }
    setLoading(prev => ({ ...prev, mistral: false }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', color: '#172B4D', fontFamily: 'system-ui' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#0052CC', color: 'white', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px', fontWeight: 'bold' }}>QuizBit Admin</h1>
        <nav>
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
          <NavItem icon={<Database size={20} />} label="Questions" active={currentPage === 'questions'} onClick={() => setCurrentPage('questions')} />
          <NavItem icon={<Users size={20} />} label="Users" active={currentPage === 'users'} onClick={() => setCurrentPage('users')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Config" />
          <NavItem icon={<Settings size={20} />} label="Settings" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#F4F5F7' }}>
        {currentPage === 'dashboard' && (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Global Dashboard</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Manage your AI quiz platform and monitor tournaments.</p>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <StatCard title="Total Players" value={stats.players} color="#36B37E" />
              <StatCard title="Quizzes Generated" value={stats.quizzes} color="#00B8D9" />
              <StatCard title="Active Tournaments" value="0" color="#FFAB00" />
              <StatCard title="System Health" value="100%" color="#0052CC" />
            </div>
          </>
        )}

        {currentPage === 'questions' && (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Quiz Database</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Recent AI-generated quizzes in Firestore.</p>
            </header>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#F9FAFB' }}>
                  <tr>
                    <th style={thStyle}>Theme</th>
                    <th style={thStyle}>Questions</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={tdStyle}>{q.theme}</td>
                      <td style={tdStyle}>{q.questions?.length || 0} items</td>
                      <td style={tdStyle}>{new Date(q.createdAt).toLocaleDateString()}</td>
                      <td style={tdStyle}><button style={btnSmall}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {currentPage === 'users' && (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Leaderboard</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Global player performance tracking.</p>
            </header>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#F9FAFB' }}>
                  <tr>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Played</th>
                    <th style={thStyle}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={tdStyle}>{u.username}</td>
                      <td style={tdStyle}>{u.totalScore} pts</td>
                      <td style={tdStyle}>{u.gamesPlayed} games</td>
                      <td style={tdStyle}>{new Date(u.lastActive).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {currentPage === 'settings' && (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Settings & Diagnostics</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Verify your API connections and system health.</p>
            </header>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '20px' }}>API Connectivity Tests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <TestRow label="Firebase Firestore" onTest={testFirebase} loading={loading.firebase} result={testResults.firebase} />
                <TestRow label="Google Gemini API" onTest={testGemini} loading={loading.gemini} result={testResults.gemini} />
                <TestRow label="Mistral AI API" onTest={testMistral} loading={loading.mistral} result={testResults.mistral} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '15px', textAlign: 'left', color: '#6B778C', fontWeight: '600', fontSize: '14px', textTransform: 'uppercase' };
const tdStyle = { padding: '15px', color: '#172B4D', fontSize: '15px' };
const btnSmall = { padding: '5px 12px', backgroundColor: '#F0F2F5', border: '1px solid #DFE1E6', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };

function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', marginBottom: '8px', backgroundColor: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent', color: active ? 'white' : 'rgba(255, 255, 255, 0.7)' }}>
      {icon}
      <span style={{ marginLeft: '12px', fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
  );
}

function TestRow({ label, onTest, loading, result }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: '600', width: '150px' }}>{label}</div>
        {result && <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px', color: result.status === 'success' ? '#36B37E' : '#FF5630' }}>{result.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}<span style={{ marginLeft: '8px', fontSize: '14px' }}>{result.message}</span></div>}
      </div>
      <button onClick={onTest} disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#0052CC', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {loading ? <Activity size={16} /> : null} Test Connection
      </button>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', borderLeft: `6px solid ${color}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ color: '#6B778C', fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#172B4D' }}>{value}</div>
    </div>
  );
}

export default App;
