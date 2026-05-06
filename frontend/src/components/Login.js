import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.logoArea}>
          <div style={s.logo}>P</div>
          <h1 style={s.appName}>PeerChat</h1>
          <p style={s.tagline}>Academic Support Platform</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={s.field}>
            <label style={s.label}>University Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.ac.uk"
              style={s.input}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={s.input}
              required
            />
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={s.hint}>
          Student: aisha@university.ac.uk &nbsp;·&nbsp; Mentor: james@university.ac.uk<br />
          Password for both: password123
        </p>
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #92400E 0%, #D97706 60%, #F59E0B 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  card: {
    background: '#FFFBEB',
    borderRadius: '18px',
    padding: '48px 40px',
    width: '380px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    border: '1px solid #FDE68A',
  },
  logoArea: { textAlign: 'center', marginBottom: '32px' },
  logo: {
    width: '56px', height: '56px',
    background: 'linear-gradient(135deg, #D97706, #92400E)',
    borderRadius: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', fontWeight: 'bold', color: '#fff',
    margin: '0 auto 12px',
  },
  appName: { margin: '0 0 4px', fontSize: '24px', color: '#1C1917', fontWeight: '700' },
  tagline: { margin: 0, color: '#78716C', fontSize: '14px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#44403C', fontSize: '14px' },
  input: {
    width: '100%', padding: '10px 14px',
    border: '1px solid #FDE68A', borderRadius: '8px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    background: '#FFFFFF',
  },
  error: { color: '#DC2626', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' },
  button: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #D97706, #92400E)',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px',
  },
  hint: { marginTop: '20px', fontSize: '11px', color: '#A8A29E', textAlign: 'center', lineHeight: '1.7' },
};

export default Login;
