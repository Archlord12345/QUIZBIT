import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { LayoutDashboard, Users, MessageSquare, Settings, Database, Activity, CheckCircle, XCircle } from 'lucide-react';

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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`;
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
    // Mistral usually requires a proxy or specific headers, but for a ping:
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
          <NavItem icon={<Database size={20} />} label="Questions" />
          <NavItem icon={<Users size={20} />} label="Users" />
          <NavItem icon={<MessageSquare size={20} />} label="AI Config" />
          <NavItem icon={<Settings size={20} />} label="Settings" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#F4F5F7' }}>
        {currentPage === 'dashboard' ? (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Global Dashboard</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Manage your AI quiz platform and monitor tournaments.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <StatCard title="Total Players" value="1,284" color="#36B37E" />
              <StatCard title="Quizzes Created" value="45,902" color="#00B8D9" />
              <StatCard title="Active Tournaments" value="12" color="#FFAB00" />
              <StatCard title="AI Generations" value="128k" color="#0052CC" />
            </div>

            <div style={{ marginTop: '40px', backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>Recent Questions Generated (AI)</h3>
              <p style={{ color: '#6B778C' }}>Connect your Firestore to see real-time data.</p>
            </div>
          </>
        ) : (
          <>
            <header style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', color: '#0747A6', margin: 0 }}>Settings & Diagnostics</h2>
              <p style={{ color: '#6B778C', marginTop: '5px' }}>Verify your API connections and system health.</p>
            </header>

            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '20px' }}>API Connectivity Tests</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <TestRow 
                  label="Firebase Firestore" 
                  onTest={testFirebase} 
                  loading={loading.firebase} 
                  result={testResults.firebase} 
                />
                <TestRow 
                  label="Google Gemini API" 
                  onTest={testGemini} 
                  loading={loading.gemini} 
                  result={testResults.gemini} 
                />
                <TestRow 
                  label="Mistral AI API" 
                  onTest={testMistral} 
                  loading={loading.mistral} 
                  result={testResults.mistral} 
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 15px',
        cursor: 'pointer',
        borderRadius: '8px',
        marginBottom: '8px',
        backgroundColor: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        transition: 'all 0.2s',
        color: active ? 'white' : 'rgba(255, 255, 255, 0.7)'
      }}
    >
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
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px', color: result.status === 'success' ? '#36B37E' : '#FF5630' }}>
            {result.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span style={{ marginLeft: '8px', fontSize: '14px' }}>{result.message}</span>
          </div>
        )}
      </div>
      <button 
        onClick={onTest} 
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#0052CC',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {loading ? <Activity size={16} className="animate-spin" /> : null}
        Test Connection
      </button>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', borderLeft: `6px solid ${color}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ color: '#6B778C', fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#172B4D' }}>{value}</div>
    </div>
  );
}

export default App;
