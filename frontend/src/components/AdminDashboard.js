import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

function AdminDashboard({ user, onLogout }) {
  const [queries, setQueries] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    const url = feedbackFilter === 'all'
      ? `${API}/api/admin/ai-queries`
      : `${API}/api/admin/ai-queries?feedback=${feedbackFilter}`;
    setLoading(true);
    axios.get(url, { headers })
      .then(res => setQueries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [feedbackFilter]);

  const filters = [
    { value: 'all',      label: 'All queries' },
    { value: 'positive', label: '👍 Helpful' },
    { value: 'negative', label: '👎 Not helpful' },
    { value: 'none',     label: 'No feedback yet' },
  ];

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLeft}>
            <div style={s.logoBox}>P</div>
            <span style={s.appName}>PeerChat</span>
            <span style={s.adminBadge}>Admin</span>
          </div>
          <div style={s.headerRight}>
            <span style={s.headerUser}>{user.name}</span>
            <button onClick={onLogout} style={s.logoutBtn}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        <h2 style={s.title}>AI Query Monitor</h2>
        <p style={s.sub}>All student questions submitted to the AI assistant, with their feedback ratings</p>

        <div style={s.filterRow}>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFeedbackFilter(f.value)}
              style={{ ...s.filterBtn, ...(feedbackFilter === f.value ? s.filterBtnActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={s.muted}>Loading…</p>
        ) : queries.length === 0 ? (
          <p style={s.muted}>No queries found for this filter.</p>
        ) : (
          <div>
            <p style={s.count}>{queries.length} {queries.length === 1 ? 'query' : 'queries'}</p>
            {queries.map(q => (
              <div key={q.query_id} style={s.card}>
                <div style={s.cardHeader}>
                  <div style={s.cardUser}>
                    <div style={s.avatar}>{q.user_name[0]}</div>
                    <div>
                      <span style={s.userName}>{q.user_name}</span>
                      <span style={s.userEmail}>{q.user_email}</span>
                    </div>
                  </div>
                  <div style={s.cardMeta}>
                    {q.feedback === 1  && <span style={s.badgePos}>👍 Helpful</span>}
                    {q.feedback === -1 && <span style={s.badgeNeg}>👎 Not helpful</span>}
                    {!q.feedback       && <span style={s.badgeNone}>No feedback</span>}
                    <span style={s.timestamp}>
                      {new Date(q.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div style={s.qRow}>
                  <span style={s.qLabel}>Question</span>
                  <p style={s.qText}>{q.question}</p>
                </div>

                <div style={s.qRow}>
                  <span style={s.qLabel}>AI Response</span>
                  <p style={s.aText}>{(q.response || '').length > 250 ? q.response.substring(0, 250) + '…' : q.response}</p>
                </div>

                {q.source_reference && (
                  <div style={s.source}>📎 Source: {q.source_reference}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  wrapper: { minHeight: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#1C1917', borderBottom: '1px solid #292524' },
  headerInner: { maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: { background: '#D97706', color: '#fff', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  appName: { fontWeight: '700', fontSize: '18px', color: '#FEF3C7' },
  adminBadge: { background: '#7F1D1D', color: '#FCA5A5', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerUser: { color: '#D6D3D1', fontSize: '14px' },
  logoutBtn: { background: 'none', border: '1px solid #44403C', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#A8A29E' },
  main: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px' },
  title: { margin: '0 0 6px', fontSize: '24px', fontWeight: '700', color: '#1C1917' },
  sub: { margin: '0 0 24px', fontSize: '14px', color: '#78716C' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: { padding: '7px 16px', background: '#fff', border: '1px solid #FDE68A', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#78716C', fontWeight: '500' },
  filterBtnActive: { background: '#FEF3C7', color: '#92400E', borderColor: '#D97706', fontWeight: '600' },
  muted: { color: '#A8A29E', fontSize: '14px', marginTop: '16px' },
  count: { fontSize: '12px', color: '#A8A29E', margin: '0 0 12px', fontWeight: '500' },
  card: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  cardUser: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '34px', height: '34px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 },
  userName: { fontWeight: '600', fontSize: '14px', color: '#1C1917', marginRight: '8px' },
  userEmail: { fontSize: '12px', color: '#A8A29E' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
  badgePos: { background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' },
  badgeNeg: { background: '#FEE2E2', color: '#991B1B', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' },
  badgeNone: { background: '#F3F4F6', color: '#6B7280', padding: '3px 10px', borderRadius: '10px', fontSize: '12px' },
  timestamp: { fontSize: '12px', color: '#A8A29E' },
  qRow: { marginBottom: '10px' },
  qLabel: { display: 'inline-block', fontSize: '10px', fontWeight: '700', color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  qText: { margin: 0, fontSize: '14px', fontWeight: '500', color: '#1C1917' },
  aText: { margin: 0, fontSize: '13px', color: '#78716C', lineHeight: '1.6' },
  source: { fontSize: '12px', color: '#92400E', background: '#FFFBEB', borderRadius: '6px', padding: '6px 10px', marginTop: '6px', fontStyle: 'italic' },
};

export default AdminDashboard;
