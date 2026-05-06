import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

function AIAssistant({ user, onBack }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // 1 | -1 | null

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${API}/api/ai/history`, { headers }).then(res => setHistory(res.data)).catch(() => {});
  }, []);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    setFeedback(null);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await axios.post(`${API}/api/ai/query`, { question: question.trim() }, { headers });
      setResult(res.data);
      setHistory(prev => [
        { question: question.trim(), response: res.data.response, source_reference: res.data.source_reference, timestamp: new Date() },
        ...prev,
      ].slice(0, 10));
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (value) => {
    if (!result?.query_id || feedback !== null) return;
    setFeedback(value);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    await axios.post(`${API}/api/ai/feedback/${result.query_id}`, { value }, { headers }).catch(() => {});
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(); }
  };

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back to Dashboard</button>
        <div style={s.headerTitle}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <h2 style={s.headerName}>AI Assistant</h2>
            <p style={s.headerSub}>Answers sourced from your course materials only</p>
          </div>
        </div>
        <div />
      </header>

      <main style={s.main}>
        <div style={s.disclaimer}>
          <strong>📚 Course-specific AI:</strong> This assistant only uses approved materials from your enrolled course.
          If your question is outside course content, it will tell you to contact your mentor instead.
        </div>

        <div style={s.inputCard}>
          <label style={s.inputLabel}>Ask a question about your course</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. What is a binary search tree? How does memory management work?"
            style={s.textarea}
            rows={3}
          />
          {error && <p style={s.error}>{error}</p>}
          <button onClick={askQuestion} style={s.askBtn} disabled={loading || !question.trim()}>
            {loading ? '🔍 Searching course materials…' : '🔍 Find Answer'}
          </button>
        </div>

        {result && (
          <div style={s.resultCard}>
            <div style={s.resultHeader}>
              <span style={s.resultLabel}>Answer</span>
              {result.materials_found
                ? <span style={s.foundBadge}>✓ Found in course materials</span>
                : <span style={s.notFoundBadge}>⚠ Not in course materials</span>}
            </div>

            <p style={s.resultQuestion}>Q: {result.question}</p>
            <p style={s.resultText}>{result.response}</p>

            {result.source_reference && (
              <div style={s.citation}>
                <strong>📎 Source:</strong> {result.source_reference}
              </div>
            )}

            {/* Feedback buttons */}
            <div style={s.feedbackRow}>
              <span style={s.feedbackLabel}>Was this helpful?</span>
              <button
                onClick={() => submitFeedback(1)}
                style={{ ...s.feedbackBtn, ...(feedback === 1 ? s.feedbackBtnActive : {}) }}
                disabled={feedback !== null}
                title="Helpful"
              >
                👍
              </button>
              <button
                onClick={() => submitFeedback(-1)}
                style={{ ...s.feedbackBtn, ...(feedback === -1 ? s.feedbackBtnActiveDown : {}) }}
                disabled={feedback !== null}
                title="Not helpful"
              >
                👎
              </button>
              {feedback !== null && (
                <span style={s.feedbackThanks}>
                  {feedback === 1 ? 'Thanks for the feedback!' : 'Thanks — your mentor can help further.'}
                </span>
              )}
            </div>

            {result.materials_found && (
              <div style={s.followUpArea}>
                <p style={s.followUpLabel}>Need more detail?</p>
                <button
                  style={s.followUpBtn}
                  onClick={() => { setQuestion(`Can you explain more about: ${result.question}`); setResult(null); setFeedback(null); }}
                >
                  Ask a follow-up question
                </button>
              </div>
            )}

            {!result.materials_found && (
              <div style={s.mentorTip}>
                💬 <strong>Tip:</strong> This topic isn't covered in the course materials.
                Go back to the dashboard and use <strong>Peer Support</strong> to ask your mentor directly.
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div style={s.historySection}>
            <h3 style={s.historyTitle}>Recent Questions</h3>
            {history.slice(0, 5).map((item, i) => (
              <div
                key={i}
                style={s.historyItem}
                onClick={() => { setQuestion(item.question); setResult(null); setFeedback(null); }}
              >
                <p style={s.historyQ}>{item.question}</p>
                <p style={s.historyA}>{(item.response || '').substring(0, 90)}{(item.response?.length || 0) > 90 ? '…' : ''}</p>
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
  header: { background: '#1C1917', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { background: 'none', border: 'none', color: '#FDE68A', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerName: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#FEF3C7' },
  headerSub: { margin: 0, fontSize: '12px', color: '#A8A29E' },
  main: { maxWidth: '700px', margin: '0 auto', padding: '24px' },
  disclaimer: { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#92400E', lineHeight: '1.6' },
  inputCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  inputLabel: { display: 'block', fontWeight: '600', color: '#1C1917', marginBottom: '10px', fontSize: '14px' },
  textarea: { width: '100%', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5', background: '#FFFBEB' },
  error: { color: '#DC2626', fontSize: '13px', margin: '8px 0 0' },
  askBtn: { marginTop: '12px', padding: '10px 24px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  resultCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  resultLabel: { fontWeight: '700', fontSize: '16px', color: '#1C1917' },
  foundBadge: { background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  notFoundBadge: { background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  resultQuestion: { margin: '0 0 12px', fontSize: '13px', color: '#78716C', fontStyle: 'italic' },
  resultText: { margin: '0 0 16px', fontSize: '15px', color: '#1C1917', lineHeight: '1.75', whiteSpace: 'pre-wrap' },
  citation: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400E', marginBottom: '16px', fontWeight: '500' },
  feedbackRow: { display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '14px', borderBottom: '1px solid #FEF3C7', marginBottom: '14px' },
  feedbackLabel: { fontSize: '13px', color: '#78716C', fontWeight: '500' },
  feedbackBtn: { background: 'none', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', padding: '4px 10px', lineHeight: 1 },
  feedbackBtnActive: { background: '#D1FAE5', border: '1px solid #6EE7B7' },
  feedbackBtnActiveDown: { background: '#FEE2E2', border: '1px solid #FCA5A5' },
  feedbackThanks: { fontSize: '12px', color: '#78716C', fontStyle: 'italic' },
  followUpArea: { borderTop: '1px solid #FEF3C7', paddingTop: '14px' },
  followUpLabel: { margin: '0 0 8px', fontSize: '13px', color: '#78716C', fontWeight: '500' },
  followUpBtn: { padding: '7px 16px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  mentorTip: { background: '#FEF3C7', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#92400E', lineHeight: '1.5' },
  historySection: { marginTop: '8px' },
  historyTitle: { margin: '0 0 12px', fontSize: '11px', fontWeight: '600', color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' },
  historyItem: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', cursor: 'pointer' },
  historyQ: { margin: '0 0 4px', fontWeight: '500', fontSize: '14px', color: '#1C1917' },
  historyA: { margin: 0, fontSize: '12px', color: '#A8A29E' },
};

export default AIAssistant;
