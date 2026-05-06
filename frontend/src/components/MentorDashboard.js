import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MentorProfile from './MentorProfile';

const API = 'http://localhost:5000';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function MentorDashboard({ user, onLogout }) {
  const myId = Number(user.id);

  const [mentees, setMentees] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [classCount, setClassCount] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [view, setView] = useState('overview');
  const [annInput, setAnnInput] = useState('');
  const [annPosting, setAnnPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef('');
  const fileInputRef = useRef(null);

  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    Promise.all([
      axios.get(`${API}/api/courses/mentees`, { headers }),
      axios.get(`${API}/api/courses/me`, { headers }),
      axios.get(`${API}/api/courses/classmates/count`, { headers }),
      axios.get(`${API}/api/messages/unread-counts`, { headers }),
    ])
      .then(([menteesRes, courseRes, countRes, unreadRes]) => {
        setMentees(menteesRes.data);
        setCourseInfo(courseRes.data);
        setClassCount(countRes.data.count);
        setUnreadCounts(unreadRes.data);
        return axios.get(`${API}/api/announcements/${courseRes.data.course_id}`, { headers });
      })
      .then(res => setAnnouncements(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!courseInfo) return;
    const socket = io(API);
    socketRef.current = socket;
    socket.emit('join_course', courseInfo.course_id);

    socket.on('receive_message', (msg) => {
      const currentConvId = conversationIdRef.current;
      if (msg.conversation_id === currentConvId) {
        setMessages(prev =>
          prev.find(m => m.message_id === msg.message_id) ? prev : [...prev, msg]
        );
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        axios.post(`${API}/api/messages/mark-read/${currentConvId}`, {}, { headers }).catch(() => {});
      } else {
        if (Number(msg.sender_id) !== myId) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1,
          }));
        }
      }
    });

    socket.on('new_announcement', (ann) => {
      setAnnouncements(prev => [ann, ...prev]);
    });

    return () => socket.disconnect();
  }, [courseInfo, myId]);

  useEffect(() => {
    if (!conversationId || !socketRef.current) return;
    socketRef.current.emit('join_conversation', conversationId);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectMentee = async (mentee) => {
    setSelectedMentee(mentee);
    setMessages([]);
    setSearch('');
    setView('chat');

    const ids = [myId, Number(mentee.user_id)].sort((a, b) => a - b);
    const convId = `conv_${ids[0]}_${ids[1]}`;
    setConversationId(convId);
    setUnreadCounts(prev => ({ ...prev, [mentee.user_id]: 0 }));

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const [msgsRes] = await Promise.all([
        axios.get(`${API}/api/messages/${convId}`, { headers }),
        axios.post(`${API}/api/messages/mark-read/${convId}`, {}, { headers }),
      ]);
      setMessages(msgsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedMentee) return;
    const content = input.trim();
    setInput('');
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await axios.post(`${API}/api/messages`, {
        receiver_id: selectedMentee.user_id,
        content,
        conversation_id: conversationId,
      }, { headers });
      // Add confirmed message from API immediately so mentor always sees it.
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
    if (!selectedMentee) return;
    setUploading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post(`${API}/api/upload`, formData, { headers });
      const { url, name, type } = uploadRes.data;
      const res = await axios.post(`${API}/api/messages`, {
        receiver_id: selectedMentee.user_id,
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

  const postAnnouncement = async () => {
    if (!annInput.trim() || !courseInfo) return;
    setAnnPosting(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await axios.post(`${API}/api/announcements`, {
        content: annInput.trim(),
        course_id: courseInfo.course_id,
      }, { headers });
      setAnnouncements(prev => [res.data, ...prev]);
      setAnnInput('');
    } catch (err) {
      console.error('Announcement failed:', err);
    } finally {
      setAnnPosting(false);
    }
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const filteredMessages = search.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(search.toLowerCase()))
    : messages;

  if (loading) return <LoadingScreen />;

  return (
    <div style={s.wrapper}>
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.sidebarLogo}>
            <span style={s.logoBox}>P</span>
            <span style={s.appName}>PeerChat</span>
            <span style={s.mentorBadge}>Mentor</span>
          </div>

          <div style={s.userCard}>
            <div style={s.userAvatar}>{user.name[0]}</div>
            <div>
              <p style={s.userName}>{user.name}</p>
              <p style={s.userEmail}>{courseInfo?.course_name}</p>
            </div>
          </div>

          <nav style={s.nav}>
            <button style={{ ...s.navBtn, ...(view === 'overview' ? s.navBtnActive : {}) }} onClick={() => setView('overview')}>
              📊 Overview
            </button>
            <button style={{ ...s.navBtn, ...(view === 'announce' ? s.navBtnActive : {}) }} onClick={() => setView('announce')}>
              📢 Announcements
            </button>
            <button style={{ ...s.navBtn, ...(view === 'profile' ? s.navBtnActive : {}) }} onClick={() => setView('profile')}>
              👤 My Profile
            </button>
          </nav>

          <p style={s.sectionLabel}>
            My Mentees
            {totalUnread > 0 && <span style={s.totalBadge}>{totalUnread}</span>}
          </p>
          <div style={s.menteeList}>
            {mentees.length === 0 ? (
              <p style={s.mutedText}>No mentees assigned yet</p>
            ) : (
              mentees.map(mentee => {
                const unread = unreadCounts[mentee.user_id] || 0;
                const isActive = selectedMentee?.user_id === mentee.user_id && view === 'chat';
                return (
                  <button
                    key={mentee.user_id}
                    style={{
                      ...s.menteeItem,
                      background: isActive ? '#292524' : 'transparent',
                      borderLeft: `3px solid ${isActive ? '#D97706' : 'transparent'}`,
                    }}
                    onClick={() => selectMentee(mentee)}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={s.menteeAvatar}>{mentee.name[0]}</div>
                      {unread > 0 && (
                        <span style={s.unreadBadge}>{unread > 9 ? '9+' : unread}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={s.menteeName}>{mentee.name}</p>
                      <p style={s.menteeEmail}>{mentee.email}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button onClick={onLogout} style={s.logoutBtn}>Sign Out</button>
      </div>

      <div style={s.main}>
        {view === 'overview' && (
          <OverviewPanel
            user={user}
            mentees={mentees}
            courseInfo={courseInfo}
            classCount={classCount}
            announcements={announcements}
            unreadCounts={unreadCounts}
            onSelectMentee={selectMentee}
            onGoAnnounce={() => setView('announce')}
          />
        )}
        {view === 'announce' && (
          <AnnouncementsPanel
            announcements={announcements}
            annInput={annInput}
            setAnnInput={setAnnInput}
            onPost={postAnnouncement}
            posting={annPosting}
          />
        )}
        {view === 'profile' && (
          <MentorProfile
            user={user}
            onBack={() => setView('overview')}
            mentorId={user.id}
            editable={true}
            embedded={true}
          />
        )}
        {view === 'chat' && selectedMentee && (
          <ChatPanel
            selectedMentee={selectedMentee}
            messages={filteredMessages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            handleKeyDown={handleKeyDown}
            myId={myId}
            messagesEndRef={messagesEndRef}
            search={search}
            setSearch={setSearch}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            uploading={uploading}
            allMessages={messages}
          />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
      />
    </div>
  );
}

function OverviewPanel({ user, mentees, courseInfo, classCount, announcements, unreadCounts, onSelectMentee, onGoAnnounce }) {
  return (
    <div style={s.panel}>
      <h2 style={s.panelTitle}>Good to see you, {user.name.split(' ')[0]}!</h2>
      <p style={s.panelSub}>{courseInfo?.course_name} · {courseInfo?.course_code}</p>

      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <span style={s.statNum}>{mentees.length}</span>
          <span style={s.statLabel}>Assigned Mentees</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statNum}>{classCount ?? '—'}</span>
          <span style={s.statLabel}>Students in Course</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statNum}>{announcements.length}</span>
          <span style={s.statLabel}>Announcements Posted</span>
        </div>
      </div>

      <h3 style={s.sectionH}>Your Mentees</h3>
      {mentees.length === 0 ? (
        <p style={{ color: '#78716C', fontSize: '14px' }}>No mentees assigned yet.</p>
      ) : (
        <div style={s.menteeCards}>
          {mentees.map(m => {
            const unread = unreadCounts[m.user_id] || 0;
            return (
              <div key={m.user_id} style={s.menteeCard}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={s.menteeCardAvatar}>{m.name[0]}</div>
                  {unread > 0 && <span style={s.cardBadge}>{unread > 9 ? '9+' : unread}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={s.menteeCardName}>{m.name}</p>
                  <p style={s.menteeCardEmail}>{m.email}</p>
                </div>
                <button style={s.chatBtn} onClick={() => onSelectMentee(m)}>
                  {unread > 0 ? `Reply (${unread} new)` : 'Message'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={s.overviewAnnRow}>
        <h3 style={{ ...s.sectionH, margin: 0 }}>Recent Announcements</h3>
        <button style={s.linkBtn} onClick={onGoAnnounce}>View all →</button>
      </div>
      {announcements.slice(0, 2).map(ann => (
        <div key={ann.announcement_id} style={s.annPreview}>
          <p style={s.annPreviewText}>{ann.content.substring(0, 120)}{ann.content.length > 120 ? '…' : ''}</p>
          <p style={s.annPreviewTime}>{timeAgo(ann.created_at)}</p>
        </div>
      ))}
      {announcements.length === 0 && (
        <p style={{ color: '#78716C', fontSize: '13px', marginTop: '8px' }}>
          No announcements yet.{' '}
          <button style={s.linkBtn} onClick={onGoAnnounce}>Post one now →</button>
        </p>
      )}
    </div>
  );
}

function AnnouncementsPanel({ announcements, annInput, setAnnInput, onPost, posting }) {
  return (
    <div style={s.panel}>
      <h2 style={s.panelTitle}>Course Announcements</h2>
      <p style={s.panelSub}>Post updates visible to all students in your course</p>

      <div style={s.composeCard}>
        <label style={s.composeLabel}>New Announcement</label>
        <textarea
          value={annInput}
          onChange={e => setAnnInput(e.target.value)}
          placeholder="e.g. Study session this Thursday 2pm — Room LT3. We'll be covering data structures."
          style={s.composeTextarea}
          rows={4}
        />
        <button onClick={onPost} style={s.postBtn} disabled={posting || !annInput.trim()}>
          {posting ? 'Posting…' : '📢 Post Announcement'}
        </button>
      </div>

      <h3 style={s.sectionH}>Posted Announcements</h3>
      {announcements.length === 0 ? (
        <p style={{ color: '#78716C', fontSize: '13px' }}>No announcements yet.</p>
      ) : (
        announcements.map(ann => (
          <div key={ann.announcement_id} style={s.annItem}>
            <div style={s.annItemHeader}>
              <div style={s.annItemAvatar}>{ann.mentor_name[0]}</div>
              <div>
                <p style={s.annItemAuthor}>{ann.mentor_name}</p>
                <p style={s.annItemTime}>{timeAgo(ann.created_at)}</p>
              </div>
            </div>
            <p style={s.annItemContent}>{ann.content}</p>
          </div>
        ))
      )}
    </div>
  );
}

function ChatPanel({ selectedMentee, messages, input, setInput, sendMessage, handleKeyDown, myId, messagesEndRef, search, setSearch, fileInputRef, handleFileChange, uploading, allMessages }) {
  return (
    <div style={s.chatWrapper}>
      <div style={s.chatHeader}>
        <div style={s.chatHeaderAvatar}>{selectedMentee.name[0]}</div>
        <div style={{ flex: 1 }}>
          <p style={s.chatHeaderName}>{selectedMentee.name}</p>
          <p style={s.chatHeaderSub}>Student · {selectedMentee.email}</p>
        </div>
        <span style={{ fontSize: '12px', color: '#A8A29E' }}>{allMessages.length} message{allMessages.length !== 1 ? 's' : ''}</span>
      </div>

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

      <div style={s.messages}>
        {messages.length === 0 ? (
          <div style={s.noMessages}>
            <p>{search ? 'No messages match your search.' : `No messages yet. Send a welcome message to ${selectedMentee.name.split(' ')[0]}!`}</p>
          </div>
        ) : (
          messages.map(msg => (
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
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
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
      <p style={{ color: '#78716C' }}>Loading dashboard…</p>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', Arial, sans-serif" },
  sidebar: { width: '260px', background: '#1C1917', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarTop: { flex: 1, overflowY: 'auto' },
  main: { flex: 1, overflowY: 'auto', background: '#FFFBEB' },
  sidebarLogo: { padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #292524' },
  logoBox: { background: '#D97706', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' },
  appName: { fontWeight: '700', fontSize: '15px', color: '#FEF3C7', flex: 1 },
  mentorBadge: { background: '#78350F', color: '#FDE68A', padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' },
  userCard: { padding: '12px 16px', borderBottom: '1px solid #292524', display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 },
  userName: { margin: '0 0 2px', fontWeight: '600', fontSize: '13px', color: '#FEF3C7' },
  userEmail: { margin: 0, fontSize: '11px', color: '#78716C' },
  nav: { padding: '8px 10px 4px' },
  navBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#A8A29E', textAlign: 'left', marginBottom: '2px' },
  navBtnActive: { background: '#292524', color: '#FDE68A' },
  sectionLabel: { margin: '8px 0 4px', padding: '0 16px', fontSize: '10px', fontWeight: '600', color: '#57534E', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' },
  totalBadge: { background: '#D97706', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' },
  menteeList: { paddingBottom: '8px' },
  mutedText: { padding: '4px 16px', color: '#57534E', fontSize: '12px' },
  menteeItem: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left' },
  menteeAvatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#44403C', color: '#D6D3D1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' },
  unreadBadge: { position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '0 4px', fontSize: '9px', fontWeight: '700', minWidth: '14px', textAlign: 'center', lineHeight: '14px' },
  menteeName: { margin: '0 0 1px', fontWeight: '500', fontSize: '12px', color: '#D6D3D1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  menteeEmail: { margin: 0, fontSize: '10px', color: '#57534E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: { margin: '8px 12px 12px', padding: '8px', background: 'none', border: '1px solid #292524', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#57534E' },
  panel: { padding: '28px 32px', maxWidth: '860px' },
  panelTitle: { margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: '#1C1917' },
  panelSub: { margin: '0 0 24px', color: '#78716C', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' },
  statCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  statNum: { display: 'block', fontSize: '32px', fontWeight: '800', color: '#D97706' },
  statLabel: { display: 'block', fontSize: '12px', color: '#78716C', marginTop: '4px' },
  sectionH: { margin: '0 0 14px', fontSize: '13px', fontWeight: '600', color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.4px' },
  menteeCards: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' },
  menteeCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  menteeCardAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#F59E0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '17px' },
  cardBadge: { position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '10px', fontWeight: '700', minWidth: '16px', textAlign: 'center', lineHeight: '16px' },
  menteeCardName: { margin: '0 0 2px', fontWeight: '600', fontSize: '14px', color: '#1C1917' },
  menteeCardEmail: { margin: 0, fontSize: '12px', color: '#78716C' },
  chatBtn: { padding: '6px 14px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' },
  overviewAnnRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  linkBtn: { background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: 0 },
  annPreview: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' },
  annPreviewText: { margin: '0 0 4px', fontSize: '13px', color: '#1C1917', lineHeight: '1.5' },
  annPreviewTime: { margin: 0, fontSize: '11px', color: '#A8A29E' },
  composeCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  composeLabel: { display: 'block', fontWeight: '600', color: '#1C1917', marginBottom: '10px', fontSize: '14px' },
  composeTextarea: { width: '100%', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5', background: '#FFFBEB' },
  postBtn: { marginTop: '12px', padding: '10px 22px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  annItem: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '10px', padding: '16px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  annItemHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  annItemAvatar: { width: '34px', height: '34px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '15px', flexShrink: 0 },
  annItemAuthor: { margin: '0 0 2px', fontWeight: '600', fontSize: '13px', color: '#1C1917' },
  annItemTime: { margin: 0, fontSize: '11px', color: '#A8A29E' },
  annItemContent: { margin: 0, fontSize: '14px', color: '#1C1917', lineHeight: '1.65' },
  chatWrapper: { display: 'flex', flexDirection: 'column', height: '100vh' },
  chatHeader: { background: '#fff', borderBottom: '1px solid #FDE68A', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  chatHeaderAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#F59E0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  chatHeaderName: { margin: '0 0 2px', fontWeight: '600', fontSize: '15px', color: '#1C1917' },
  chatHeaderSub: { margin: 0, fontSize: '12px', color: '#78716C' },
  searchBar: { background: '#fff', borderBottom: '1px solid #FDE68A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  searchInput: { flex: 1, border: '1px solid #FDE68A', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none', background: '#FFFBEB' },
  clearSearch: { background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: '14px', padding: '0 4px' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px' },
  noMessages: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', textAlign: 'center', fontSize: '14px' },
  msgAvatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#A8A29E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0, alignSelf: 'flex-end' },
  inputArea: { background: '#fff', borderTop: '1px solid #FDE68A', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 },
  attachBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px', flexShrink: 0, lineHeight: 1 },
  textarea: { flex: 1, border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: '1.5', background: '#FFFBEB' },
  sendBtn: { padding: '10px 20px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
};

export default MentorDashboard;
