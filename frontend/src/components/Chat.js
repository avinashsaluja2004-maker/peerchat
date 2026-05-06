import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = 'http://localhost:5000';

function Chat({ user, onBack }) {
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const myId = Number(user.id);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${API}/api/courses/mentor`, { headers })
      .then(res => {
        const contactUser = res.data;
        setContact(contactUser);
        const ids = [myId, Number(contactUser.user_id)].sort((a, b) => a - b);
        const convId = `conv_${ids[0]}_${ids[1]}`;
        setConversationId(convId);
        return Promise.all([
          axios.get(`${API}/api/messages/${convId}`, { headers }),
          axios.post(`${API}/api/messages/mark-read/${convId}`, {}, { headers }).catch(() => {}),
        ]);
      })
      .then(([msgsRes]) => setMessages(msgsRes.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [myId]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = io(API);
    socketRef.current = socket;
    socket.emit('join_conversation', conversationId);
    socket.on('receive_message', (msg) => {
      setMessages(prev =>
        prev.find(m => m.message_id === msg.message_id) ? prev : [...prev, msg]
      );
    });
    return () => socket.disconnect();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !contact) return;
    const content = input.trim();
    setInput('');
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await axios.post(`${API}/api/messages`, {
        receiver_id: contact.user_id,
        content,
        conversation_id: conversationId,
      }, { headers });
      // Add confirmed message from API immediately so sender always sees it.
      // Socket echo also fires — dedup prevents adding it twice.
      setMessages(prev =>
        prev.find(m => m.message_id === res.data.message_id) ? prev : [...prev, res.data]
      );
    } catch (err) {
      console.error('Send failed:', err);
      setInput(content);
    }
  };

  const sendFile = async (file) => {
    if (!contact) return;
    setUploading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post(`${API}/api/upload`, formData, { headers });
      const { url, name, type } = uploadRes.data;
      const res = await axios.post(`${API}/api/messages`, {
        receiver_id: contact.user_id,
        content: name,
        conversation_id: conversationId,
        attachment_url: url,
        attachment_name: name,
        attachment_type: type,
      }, { headers });
      setMessages(prev =>
        prev.find(m => m.message_id === res.data.message_id) ? prev : [...prev, res.data]
      );
    } catch (err) {
      console.error('File send failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) sendFile(file);
    e.target.value = '';
  };

  const filtered = search.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(search.toLowerCase()))
    : messages;

  if (loading) return <LoadingScreen />;

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back to Dashboard</button>
        {contact && (
          <div style={s.headerContact}>
            <div style={s.avatar}>{contact.name[0]}</div>
            <div>
              <p style={s.contactName}>{contact.name}</p>
              <p style={s.contactSub}>Peer Mentor</p>
            </div>
          </div>
        )}
        <div />
      </header>

      {/* Search bar */}
      <div style={s.searchBar}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages…"
          style={s.searchInput}
        />
        {search && (
          <button onClick={() => setSearch('')} style={s.clearSearch}>✕</button>
        )}
      </div>

      <div style={s.messagesArea}>
        {filtered.length === 0 ? (
          <div style={s.emptyState}>
            <p>{search ? 'No messages match your search.' : 'No messages yet. Say hello to your mentor! 👋'}</p>
          </div>
        ) : (
          filtered.map(msg => (
            <MessageBubble key={msg.message_id} msg={msg} myId={myId} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={s.inputArea}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={s.attachBtn}
          title="Attach a file"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        />
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          style={s.textarea}
          rows={1}
        />
        <button onClick={sendMessage} style={s.sendBtn} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ msg, myId }) {
  const isOwn = Number(msg.sender_id) === myId;
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
      {!isOwn && (
        <div style={s.msgAvatar}>{(msg.sender_name || '?')[0]}</div>
      )}
      <div style={{
        maxWidth: '62%', padding: '10px 14px', borderRadius: '12px',
        background: isOwn ? '#D97706' : '#fff',
        color: isOwn ? '#fff' : '#1C1917',
        border: isOwn ? 'none' : '1px solid #FDE68A',
        marginLeft: isOwn ? 0 : '8px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {!isOwn && <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: '600', color: '#A8A29E' }}>{msg.sender_name}</p>}
        {msg.attachment_url ? (
          <AttachmentPreview msg={msg} isOwn={isOwn} />
        ) : (
          <p style={{ margin: '0 0 4px', fontSize: '14px', lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
        )}
        <p style={{ margin: 0, fontSize: '11px', opacity: 0.6, textAlign: isOwn ? 'right' : 'left' }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function AttachmentPreview({ msg, isOwn }) {
  const url = `http://localhost:5000${msg.attachment_url}`;
  if (msg.attachment_type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={msg.attachment_name} style={{ maxWidth: '220px', borderRadius: '8px', display: 'block', marginBottom: '4px' }} />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isOwn ? '#fff' : '#D97706', textDecoration: 'none', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
      <span>📄</span>
      <span style={{ textDecoration: 'underline' }}>{msg.attachment_name}</span>
    </a>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <p style={{ color: '#78716C' }}>Loading chat…</p>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#1C1917', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#FDE68A', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 },
  headerContact: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  contactName: { margin: 0, fontWeight: '600', fontSize: '15px', color: '#FEF3C7' },
  contactSub: { margin: 0, fontSize: '12px', color: '#A8A29E' },
  searchBar: { background: '#fff', borderBottom: '1px solid #FDE68A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  searchInput: { flex: 1, border: '1px solid #FDE68A', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', background: '#FFFBEB' },
  clearSearch: { background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: '14px', padding: '0 4px' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' },
  emptyState: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716C', textAlign: 'center' },
  msgAvatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#A8A29E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0, alignSelf: 'flex-end' },
  inputArea: { background: '#fff', borderTop: '1px solid #FDE68A', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 },
  attachBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px', flexShrink: 0, lineHeight: 1 },
  textarea: { flex: 1, border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: '1.5', background: '#FFFBEB' },
  sendBtn: { padding: '10px 20px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
};

export default Chat;
