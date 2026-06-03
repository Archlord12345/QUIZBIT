import React from 'react';
import { initializeApp } from 'firebase/app';
import { LayoutDashboard, Users, MessageSquare, Settings, Database } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyB3-z7Zsu8dki3nUuiqHRAlJmbFRk1l5TY",
  authDomain: "quizbit-cecc1.firebaseapp.com",
  projectId: "quizbit-cecc1",
  storageBucket: "quizbit-cecc1.firebasestorage.app",
  messagingSenderId: "80759305815",
  appId: "1:80759305815:web:e8630b7d06e4965bdad512",
  measurementId: "G-4T8SFQHM4G"
};

initializeApp(firebaseConfig);

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', color: '#172B4D' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#0052CC', color: 'white', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '40px' }}>QuizBit Admin</h1>
        <nav>
          <div style={navItemStyle}><LayoutDashboard size={20} /> <span style={{ marginLeft: '10px' }}>Dashboard</span></div>
          <div style={navItemStyle}><Database size={20} /> <span style={{ marginLeft: '10px' }}>Questions</span></div>
          <div style={navItemStyle}><Users size={20} /> <span style={{ marginLeft: '10px' }}>Users</span></div>
          <div style={navItemStyle}><MessageSquare size={20} /> <span style={{ marginLeft: '10px' }}>AI Config</span></div>
          <div style={navItemStyle}><Settings size={20} /> <span style={{ marginLeft: '10px' }}>Settings</span></div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', color: '#0747A6' }}>Global Dashboard</h2>
          <p style={{ color: '#6B778C' }}>Manage your AI quiz platform and monitor tournaments.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <StatCard title="Total Players" value="1,284" color="#36B37E" />
          <StatCard title="Quizzes Created" value="45,902" color="#00B8D9" />
          <StatCard title="Active Tournaments" value="12" color="#FFAB00" />
          <StatCard title="AI Generations" value="128k" color="#0052CC" />
        </div>

        <div style={{ marginTop: '40px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Recent Questions Generated (AI)</h3>
          <p style={{ color: '#6B778C' }}>Connect your Firestore to see real-time data.</p>
        </div>
      </div>
    </div>
  );
}

const navItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px',
  cursor: 'pointer',
  borderRadius: '4px',
  marginBottom: '5px',
  transition: 'background 0.2s'
};

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', borderLeft: `5px solid ${color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ color: '#6B778C', fontSize: '14px', marginBottom: '5px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#172B4D' }}>{value}</div>
    </div>
  );
}

export default App;
