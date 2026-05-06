import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import MentorDashboard from './components/MentorDashboard';
import AdminDashboard from './components/AdminDashboard';
import Chat from './components/Chat';
import AIAssistant from './components/AIAssistant';
import MentorProfile from './components/MentorProfile';

const API = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [pageData, setPageData] = useState(null); // extra data passed alongside page change
  const [booting, setBooting] = useState(true);

  // On startup, verify the stored token and get fresh user data from the server.
  // This guarantees user.id is always correct (fixes the chat alignment bug).
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setBooting(false); return; }
    axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setBooting(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('dashboard');
    setPageData(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPage('dashboard');
    setPageData(null);
  };

  const handleNavigate = (newPage, data = null) => {
    setPage(newPage);
    setPageData(data);
  };

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <p style={{ color: '#78716C' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'mentor') {
    return <MentorDashboard user={user} onLogout={handleLogout} />;
  }

  // Student pages
  if (page === 'chat') return <Chat user={user} onBack={() => setPage('dashboard')} />;
  if (page === 'ai') return <AIAssistant user={user} onBack={() => setPage('dashboard')} />;
  if (page === 'mentor-profile') return <MentorProfile user={user} mentorId={pageData} onBack={() => setPage('dashboard')} />;

  return <StudentDashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
}

export default App;
