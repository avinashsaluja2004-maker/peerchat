import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

// Pass embedded={true} when rendering inside an existing layout (hides the full-page header/wrapper).
// Pass editable={true} and user.role='mentor' to show edit controls.
function MentorProfile({ user, onBack, mentorId, editable, embedded }) {
  const targetId = mentorId || user.id;
  const canEdit = editable && user.role === 'mentor';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: '', office_hours: '', specialisms: '', year_of_study: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${API}/api/profile/${targetId}`, { headers })
      .then(res => {
        setProfile(res.data);
        setForm({
          bio: res.data.bio || '',
          office_hours: res.data.office_hours || '',
          specialisms: res.data.specialisms || '',
          year_of_study: res.data.year_of_study || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetId]);

  const saveProfile = async () => {
    setSaving(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      await axios.put(`${API}/api/profile`, form, { headers });
      setProfile(prev => ({ ...prev, ...form }));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const EditForm = () => (
    <div style={s.editForm}>
      <FormField label="About Me / Bio">
        <textarea
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          placeholder="Tell students a bit about yourself…"
          style={s.formTextarea}
          rows={4}
        />
      </FormField>
      <FormField label="Office Hours">
        <input
          value={form.office_hours}
          onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))}
          placeholder="e.g. Mondays 2-4pm, Wednesdays 10am-12pm"
          style={s.formInput}
        />
      </FormField>
      <FormField label="Areas of Expertise / Specialisms">
        <input
          value={form.specialisms}
          onChange={e => setForm(f => ({ ...f, specialisms: e.target.value }))}
          placeholder="e.g. Data structures, Algorithms, Web development"
          style={s.formInput}
        />
      </FormField>
      <FormField label="Year of Study">
        <input
          value={form.year_of_study}
          onChange={e => setForm(f => ({ ...f, year_of_study: e.target.value }))}
          placeholder="e.g. 3rd Year BSc Computer Science"
          style={s.formInput}
        />
      </FormField>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={saveProfile} style={s.saveBtn} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button onClick={() => setEditing(false)} style={s.cancelBtn}>Cancel</button>
      </div>
    </div>
  );

  const ViewRows = () => (
    <div>
      <InfoRow icon="📝" label="About" value={profile.bio || 'No bio added yet.'} />
      <InfoRow icon="🕐" label="Office Hours" value={profile.office_hours || 'Not specified.'} />
      <InfoRow icon="⭐" label="Specialisms" value={profile.specialisms || 'Not specified.'} />
      <InfoRow icon="🎓" label="Year of Study" value={profile.year_of_study || 'Not specified.'} />
    </div>
  );

  const ProfileCard = () => (
    <div style={s.card}>
      <div style={s.hero}>
        <div style={s.bigAvatar}>{profile.name[0]}</div>
        <div>
          <h2 style={s.name}>{profile.name}</h2>
          <p style={s.email}>{profile.email}</p>
          <span style={s.badge}>Peer Mentor</span>
        </div>
      </div>
      {saved && <div style={s.savedBanner}>✓ Profile saved successfully!</div>}
      {editing ? <EditForm /> : <ViewRows />}
    </div>
  );

  if (loading) {
    return (
      <div style={embedded ? s.loadingEmbedded : s.loadingFull}>
        <p style={{ color: '#78716C' }}>Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={embedded ? s.loadingEmbedded : s.loadingFull}>
        <p style={{ color: '#78716C' }}>Profile not found.</p>
      </div>
    );
  }

  // Embedded mode — rendered inside MentorDashboard's panel area
  if (embedded) {
    return (
      <div style={s.embeddedPanel}>
        <div style={s.embeddedHeader}>
          <div>
            <h2 style={s.panelTitle}>My Profile</h2>
            <p style={s.panelSub}>Visible to your assigned students</p>
          </div>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} style={s.editBtn}>Edit Profile</button>
          )}
        </div>
        <ProfileCard />
      </div>
    );
  }

  // Standalone full-page mode
  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        <span style={s.headerTitle}>Mentor Profile</span>
        {canEdit && !editing ? (
          <button onClick={() => setEditing(true)} style={s.editBtn}>Edit Profile</button>
        ) : <div />}
      </header>
      <div style={s.body}>
        <ProfileCard />
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#44403C', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: '1px solid #FEF3C7' }}>
      <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div>
        <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: '600', color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '14px', color: '#1C1917', lineHeight: '1.6' }}>{value}</p>
      </div>
    </div>
  );
}

const s = {
  wrapper: { minHeight: '100vh', background: '#FFFBEB', fontFamily: "'Segoe UI', Arial, sans-serif" },
  header: { background: '#1C1917', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { background: 'none', border: 'none', color: '#FDE68A', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 },
  headerTitle: { fontWeight: '700', fontSize: '16px', color: '#FEF3C7' },
  editBtn: { padding: '6px 16px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  loadingFull: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFFBEB' },
  loadingEmbedded: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' },
  body: { maxWidth: '620px', margin: '32px auto', padding: '0 24px' },
  embeddedPanel: { padding: '28px 32px', maxWidth: '660px' },
  embeddedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  panelTitle: { margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: '#1C1917' },
  panelSub: { margin: 0, color: '#78716C', fontSize: '14px' },
  card: { background: '#fff', border: '1px solid #FDE68A', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  hero: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #FEF3C7' },
  bigAvatar: { width: '70px', height: '70px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '30px', flexShrink: 0 },
  name: { margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: '#1C1917' },
  email: { margin: '0 0 8px', fontSize: '13px', color: '#78716C' },
  badge: { background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  savedBanner: { background: '#D1FAE5', color: '#065F46', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: '500', marginBottom: '16px' },
  editForm: { marginTop: '4px' },
  formInput: { width: '100%', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: '#FFFBEB', boxSizing: 'border-box' },
  formTextarea: { width: '100%', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: '#FFFBEB', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.5' },
  saveBtn: { padding: '9px 22px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  cancelBtn: { padding: '9px 18px', background: 'none', color: '#78716C', border: '1px solid #FDE68A', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
};

export default MentorProfile;
