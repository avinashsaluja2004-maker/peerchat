import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = 'http://localhost:5000';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StudentDashboard({ user, onLogout, onNavigate }) {
  const [courseInfo, setCourseInfo] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [classCount, setClassCount] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadFromMentor, setUnreadFromMentor] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    Promise.all([
      axios.get(`${API}/api/courses/me`, { headers }),
      axios.get(`${API}/api/courses/mentor`, { headers }).catch(() => ({ data: null })),
      axios.get(`${API}/api/courses/classmates/count`, { headers }),
      axios.get(`${API}/api/messages/unread-counts`, { headers }).catch(() => ({ data: {} })),
    ])
      .then(([courseRes, mentorRes, countRes, unreadRes]) => {
        setCourseInfo(courseRes.data);
        const m = mentorRes.data;
        setMentor(m);
        setClassCount(countRes.data.count);
        // Sum unread messages from the mentor
        if (m && unreadRes.data) {
          setUnreadFromMentor(unreadRes.data[m.user_id] || 0);
        }
        return axios.get(`${API}/api/announcements/${courseRes.data.course_id}`, { headers });
      })
      .then(res => setAnnouncements(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Live socket: course announcements + unread badge update when mentor sends a message
  useEffect(() => {
    if (!courseInfo) return;
    const socket = io(API);
    socketRef.current = socket;
    socket.emit('join_course', courseInfo.course_id);

    // Also join the 1-to-1 conversation room so we receive mentor messages in real-time
    if (mentor) {
      const ids = [Number(user.id), Number(mentor.user_id)].sort((a, b) => a - b);
      socket.emit('join_conversation', `conv_${ids[0]}_${ids[1]}`);
    }

    socket.on('new_announcement', (ann) => {
      setAnnouncements(prev => [ann, ...prev]);
    });

    socket.on('receive_message', (msg) => {
      // If the sender is the mentor, increment the unread badge
      if (mentor && Number(msg.sender_id) === Number(mentor.user_id)) {
        setUnreadFromMentor(prev => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, [courseInfo, mentor, user.id]);

  if (loading) return <LoadingScreen />;

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLogo}>
            <span style={s.logoBox}>P</span>
            <span style={s.appName}>PeerChat</span>
          </div>
          <div style={s.headerRight}>
            <span style={s.headerUser}>{user.name}</span>
            <button onClick={onLogout} style={s.logoutBtn}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* Welcome */}
        <div style={s.welcomeCard}>
          <div>
            <h2 style={s.welcomeTitle}>Welcome back, {user.name.split(' ')[0]}!</h2>
            {courseInfo && (
              <p style={s.welcomeSub}>{courseInfo.course_name} · {courseInfo.course_code}</p>
            )}
          </div>
          {classCount !== null && (
            <div style={s.enrollBadge}>
              <span style={s.enrollNum}>{classCount}</span>
              <span style={s.enrollLabel}>students enrolled</span>
            </div>
          )}
        </div>

        <div style={s.twoCol}>
          {/* Left column */}
          <div style={s.leftCol}>
            {/* Mentor card */}
            {mentor && (
              <div style={s.mentorCard}>
                <div style={s.mentorAvatar}>{mentor.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <p style={s.mentorLabel}>Your Peer Mentor</p>
                  <p style={s.mentorName}>{mentor.name}</p>
                  <p style={s.mentorEmail}>{mentor.email}</p>
                </div>
                <button
                  style={s.profileBtn}
                  onClick={() => onNavigate('mentor-profile', mentor.user_id)}
                >
                  View Profile
                </button>
              </div>
            )}

            {/* Support options */}
            <h3 style={s.sectionTitle}>Get support today</h3>
            <button style={s.optionCardBlue} onClick={() => onNavigate('chat')}>
              <div style={s.optionRow}>
                <span style={s.optionEmoji}>💬</span>
                <div>
                  <p style={s.optionTitle}>Peer Support</p>
                  <p style={s.optionDesc}>Real-time chat with {mentor ? mentor.name.split(' ')[0] : 'your mentor'}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {unreadFromMentor > 0 && (
                    <span style={s.unreadBadge}>{unreadFromMentor > 9 ? '9+' : unreadFromMentor}</span>
                  )}
                  <span style={s.optionArrow}>→</span>
                </div>
              </div>
            </button>
            <button style={s.optionCardPurple} onClick={() => onNavigate('ai')}>
              <div style={s.optionRow}>
                <span style={s.optionEmoji}>🤖</span>
                <div>
                  <p style={{ ...s.optionTitle, color: '#6D28D9' }}>AI Assistant</p>
                  <p style={s.optionDesc}>Instant answers from course materials</p>
                </div>
                <span style={{ ...s.optionArrow, color: '#6D28D9' }}>→</span>
              </div>
            </button>

            <div style={s.notice}>
              <span>ℹ️</span>
              <p style={s.noticeText}>
                The AI Assistant only uses approved {courseInfo?.course_name} materials.
                For anything else, your mentor is here to help.
              </p>
            </div>
          </div>

          {/* Right column — announcements */}
          <div style={s.rightCol}>
            <div style={s.announcementsCard}>
              <div style={s.announcementsHeader}>
                <span style={s.megaphone}>📢</span>
                <h3 style={s.announcementsTitle}>Course Announcements</h3>
              </div>
              <p style={s.announcementsSub}>Posted by your mentor · read-only</p>

              {announcements.length === 0 ? (
                <p style={s.noAnnouncements}>No announcements yet.</p>
              ) : (
                <div style={s.announcementsList}>
                  {announcements.map(ann => (
                    <div key={ann.announcement_id} style={s.announcementItem}>
                      <div style={s.annHeader}>
                        <div style={s.annAvatar}>{ann.mentor_name[0]}</div>
                        <div>
                          <p style={s.annAuthor}>{ann.mentor_name}</p>
                          <p style={s.annTime}>{timeAgo(ann.created_at)}</p>
                        </div>
                      </div>
                      <p style={s.annContent}>{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <p style={{ color: '#78716C' }}>Loading your dashboard…</p>
    </div>
  );
}

const s = {
  wrapper: { minHeight: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#1C1917', borderBottom: '1px solid #292524' },
  headerInner: { maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
  headerLogo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: { background: '#D97706', color: '#fff', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  appName: { fontWeight: '700', fontSize: '18px', color: '#FEF3C7' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerUser: { color: '#D6D3D1', fontSize: '14px' },
  logoutBtn: { background: 'none', border: '1px solid #44403C', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#A8A29E' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' },
  welcomeCard: { background: 'linear-gradient(135deg, #92400E, #D97706)', borderRadius: '14px', padding: '24px 28px', marginBottom: '24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  welcomeTitle: { margin: '0 0 6px', fontSize: '22px', fontWeight: '700' },
  welcomeSub: { margin: 0, opacity: 0.85, fontSize: '14px' },
  enrollBadge: { textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 20px' },
  enrollNum: { display: 'block', fontSize: '28px', fontWeight: '800', lineHeight: 1 },
  enrollLabel: { fontSize: '12px', opacity: 0.9, marginTop: '4px', display: 'block' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rightCol: {},
  mentorCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  mentorAvatar: { width: '46px', height: '46px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 },
  mentorLabel: { margin: '0 0 2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A8A29E' },
  mentorName: { margin: '0 0 2px', fontWeight: '600', color: '#1C1917', fontSize: '15px' },
  mentorEmail: { margin: 0, fontSize: '12px', color: '#78716C' },
  profileBtn: { padding: '6px 12px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' },
  sectionTitle: { margin: '0 0 10px', fontSize: '14px', fontWeight: '600', color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.4px' },
  optionCardBlue: { background: '#fff', border: '2px solid #FDE68A', borderRadius: '12px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', width: '100%', marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  optionCardPurple: { background: '#fff', border: '2px solid #FDE68A', borderRadius: '12px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  optionRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  optionEmoji: { fontSize: '22px', flexShrink: 0 },
  optionTitle: { margin: '0 0 2px', fontWeight: '600', fontSize: '14px', color: '#1C1917' },
  optionDesc: { margin: 0, fontSize: '12px', color: '#78716C' },
  optionArrow: { fontSize: '16px', color: '#D97706', fontWeight: '600' },
  unreadBadge: { background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '2px 7px', fontSize: '11px', fontWeight: '700', minWidth: '18px', textAlign: 'center' },
  notice: { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' },
  noticeText: { margin: 0, fontSize: '12px', color: '#92400E', lineHeight: '1.5' },
  announcementsCard: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  announcementsHeader: { padding: '16px 20px 4px', display: 'flex', alignItems: 'center', gap: '8px' },
  megaphone: { fontSize: '20px' },
  announcementsTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#1C1917' },
  announcementsSub: { margin: '0 0 12px', padding: '0 20px', fontSize: '12px', color: '#A8A29E' },
  noAnnouncements: { padding: '20px', color: '#A8A29E', fontSize: '13px', textAlign: 'center' },
  announcementsList: { maxHeight: '480px', overflowY: 'auto' },
  announcementItem: { padding: '14px 20px', borderTop: '1px solid #FEF3C7' },
  annHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  annAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 },
  annAuthor: { margin: '0 0 2px', fontWeight: '600', fontSize: '13px', color: '#1C1917' },
  annTime: { margin: 0, fontSize: '11px', color: '#A8A29E' },
  annContent: { margin: 0, fontSize: '13px', color: '#44403C', lineHeight: '1.6' },
};

export default StudentDashboard;
