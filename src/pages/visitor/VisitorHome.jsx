/**
 * VisitorHome.jsx — Visitor dashboard
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../firebase/auth';
import { logVisit, logTimeOut, findActiveSession, fetchVisitorLogs, updateUserProfile } from '../../firebase/firestore';
import {
  PURPOSES, PURPOSE_ICONS, COLLEGES, YEAR_LEVELS,
  formatTime, formatDate, calcDuration, toDate, getCoursesForCollege,
} from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  BookOpen, Clock, LogOut, CheckCircle, RotateCcw,
  History, User, ChevronDown, CalendarDays, Timer,
  GraduationCap, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LibraryCarousel from '../../components/ui/LibraryCarousel';
import QRModal from '../../components/ui/QRModal';
import { exitAndNavigate } from '../../utils/transitions';
import './VisitorHome.css';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function avatarColor(name = '') {
  const c = ['#2d3a8c','#0284c7','#16a34a','#7c3aed','#db2777','#ea580c','#0891b2'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

function StatusBadge({ status }) {
  return (
    <span className={`vh__badge vh__badge--${status === 'in' ? 'in' : 'out'}`}>
      {status === 'in' ? '● Inside' : '○ Completed'}
    </span>
  );
}

export default function VisitorHome() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab,         setTab]         = useState('log');
  const [session,     setSession]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [step,        setStep]        = useState('check');
  const [purpose,     setPurpose]     = useState('');
  const [college,     setCollege]     = useState('');
  const [elapsed,     setElapsed]     = useState('');
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editForm,    setEditForm]    = useState({ college: '', course: '', yearLevel: '' });
  const [saving,      setSaving]      = useState(false);
  const [showQR,      setShowQR]      = useState(false);

  const name     = profile?.name || user?.displayName || 'Visitor';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg       = avatarColor(name);

  useEffect(() => {
    if (!user) return;
    setCollege(profile?.college || '');
    setEditForm({ college: profile?.college || '', course: profile?.course || '', yearLevel: profile?.yearLevel || '' });
    findActiveSession(user.uid)
      .then(s => { if (s) { setSession(s); setStep('active'); } else setStep('purpose'); })
      .finally(() => setLoading(false));
  }, [user, profile]);

  useEffect(() => {
    if (step !== 'active' || !session?.timeIn) return;
    const tick = () => {
      const d = toDate(session.timeIn);
      if (!d) return;
      const diff = Date.now() - d.getTime();
      const totalSecs = Math.floor(diff / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (h > 0) setElapsed(`${h}h ${m}m`);
      else if (m > 0) setElapsed(`${m}m ${s}s`);
      else setElapsed(`${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000); // update every second
    return () => clearInterval(id);
  }, [step, session]);

  useEffect(() => {
    if (tab !== 'history' || !user) return;
    setLogsLoading(true);
    fetchVisitorLogs(user.uid).then(setLogs).finally(() => setLogsLoading(false));
  }, [tab, user]);

  const handleTimeIn = async () => {
    if (!purpose) return toast.error('Please select a purpose.');
    if (!college) return toast.error('Please select your college.');
    setSubmitting(true);
    try {
      const timeInDate = new Date(); // capture exact moment
      const logId = await logVisit({ uid: user.uid, name, email: user.email, college, purpose, course: profile?.course || '', yearLevel: profile?.yearLevel || '', photoURL: user.photoURL || '' });
      setSession({
        id: logId, uid: user.uid, name, email: user.email, college, purpose,
        timeIn: { toDate: () => timeInDate }, // frozen reference — won't drift
        status: 'in',
      });
      setStep('active');
      toast.success('Welcome to NEU Library! 🎉');
    } catch { toast.error('Failed to log visit.'); }
    finally { setSubmitting(false); }
  };

  const handleTimeOut = async () => {
    if (!session) return;
    setSubmitting(true);
    try { await logTimeOut(session.id); setStep('done'); toast.success('Visit logged. See you next time! 👋'); }
    catch { toast.error('Failed to log time-out.'); }
    finally { setSubmitting(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try { await updateUserProfile(user.uid, editForm); setCollege(editForm.college); toast.success('Profile updated!'); }
    catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => { await logoutUser(); toast.success('Signed out.'); exitAndNavigate(navigate, '/login', { replace: true }); };

  if (authLoading || loading) return (
    <div className="vh-loading">
      <div className="vh-loading__spinner"/>
      <span className="vh-loading__text">Loading…</span>
    </div>
  );

  return (
    <div className="vh">

      {/* ── Sticky header ── */}
      <header className="vh__header anim-fade-down">
        <div className="vh__header-brand">
          <div className="vh__header-icon">
            <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{ width: 22, height: 22, objectFit: 'contain' }}/>
          </div>
          <span className="vh__header-title">LibraGate NEU</span>
        </div>
        <div className="vh__header-right">
          <div className="vh__header-avatar" style={{ background: bg }}>
            {user?.photoURL ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer"/> : initials}
          </div>
          <div className="vh__header-info">
            <span className="vh__header-name">{name}</span>
            <span className="vh__header-email">{user?.email}</span>
          </div>
          <button className="vh__header-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={15}/>
          </button>
        </div>
      </header>

      {/* ── Banner ── */}
      <div className="vh__banner anim-fade-up" style={{ backgroundImage: "url('/images/neu-logo.png')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 40px center', backgroundSize: '120px 120px' }}>
        <div className="vh__banner-avatar" style={{ background: bg }}>
          {user?.photoURL ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer"/> : initials}
        </div>
        <div className="vh__banner-text">
          <div className="vh__banner-greeting">Good {getTimeOfDay()}, <strong>{name.split(' ')[0]}</strong>! 👋</div>
          <div className="vh__banner-sub">
            {profile?.course && profile?.yearLevel ? `${profile.yearLevel} · ${profile.course}` : profile?.college || user?.email}
          </div>
          {step === 'active' && <div className="vh__banner-live"><span className="live-dot"/> Currently inside the library</div>}
        </div>
        <div className="vh__banner-date">
          <CalendarDays size={13}/>
          {new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric' })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="vh__tabs">
        {[
          { id: 'log',     icon: BookOpen,  label: 'Log Visit'  },
          { id: 'history', icon: History,   label: 'My History' },
          { id: 'profile', icon: User,      label: 'My Profile' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} className={`vh__tab${tab === id ? ' vh__tab--active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {/* ── Body: two-column layout ── */}
      <div className="vh__body">

        {/* LEFT: main content */}
        <div className="vh__main">

          {/* LOG VISIT TAB */}
          {tab === 'log' && (
            <div className="anim-fade-up">
              {step === 'purpose' && (
                <div className="vh__card">
                  <div className="vh__card-head"><BookOpen size={16}/>What brings you to the library today?</div>
                  <div className="vh__purposes">
                    {PURPOSES.slice(0, 8).map((p, i) => (
                      <button key={p} className={`vh__purpose-btn${purpose === p ? ' active' : ''}`} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => setPurpose(p)}>
                        <span className="vh__purpose-emoji">{PURPOSE_ICONS[p]}</span>
                        <span className="vh__purpose-name">{p}</span>
                      </button>
                    ))}
                  </div>
                  <div className="vh__field">
                    <label className="vh__label"><Building2 size={13}/> College / Department</label>
                    <div className="vh__select-wrap">
                      <select className={`vh__select${!college ? ' empty' : ''}`} value={college} onChange={e => setCollege(e.target.value)}>
                        <option value="">Select your college…</option>
                        {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="vh__select-icon"/>
                    </div>
                  </div>
                  <button className="vh__cta" disabled={!purpose || !college || submitting} onClick={handleTimeIn}>
                    {submitting ? <><span className="vh__spinner"/>Logging visit…</> : <><CheckCircle size={16}/>Log My Visit</>}
                  </button>
                </div>
              )}

              {step === 'active' && session && (
                <div className="vh__card anim-scale-in">
                  <div className="vh__session-header">
                    <div className="vh__session-live"><span className="live-dot"/>Session Active</div>
                    <span className="vh__session-elapsed"><Timer size={12}/>{elapsed || '< 1m'}</span>
                  </div>
                  <div className="vh__session-rows">
                    {[
                      { label: 'Time In',  val: formatTime(session.timeIn) },
                      { label: 'Purpose',  val: `${PURPOSE_ICONS[session.purpose] || ''} ${session.purpose}` },
                      { label: 'College',  val: session.college },
                    ].map(({ label, val }) => (
                      <div key={label} className="vh__session-row">
                        <span className="vh__session-row-label">{label}</span>
                        <span className="vh__session-row-val">{val}</span>
                      </div>
                    ))}
                  </div>
                  <button className="vh__timeout" onClick={handleTimeOut} disabled={submitting}>
                    {submitting ? <><span className="vh__spinner vh__spinner--red"/>Logging out…</> : <><LogOut size={15}/>Log Time-Out</>}
                  </button>
                </div>
              )}

              {step === 'done' && (
                <div className="vh__card vh__done anim-scale-in">
                  <div className="vh__done-ring"><CheckCircle size={40} strokeWidth={1.5}/></div>
                  <h2 className="vh__done-title">Visit Complete!</h2>
                  <p className="vh__done-sub">Your visit has been recorded. Thank you for visiting NEU Library.</p>
                  <button className="vh__done-btn" onClick={() => { setStep('purpose'); setPurpose(''); setElapsed(''); }}>
                    <RotateCcw size={14}/> Log another visit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div className="vh__card anim-fade-up">
              <div className="vh__card-head">
                <History size={16}/>My Visit History
                <span className="vh__card-count">{logs.length} records</span>
              </div>
              {logsLoading ? (
                <div className="vh__hist-loading"><div className="vh__spinner vh__spinner--blue"/>Loading records…</div>
              ) : logs.length === 0 ? (
                <div className="vh__hist-empty">
                  <Clock size={32} strokeWidth={1.2}/><p>No visit records yet.</p>
                  <span>Your visits will appear here once you log your first visit.</span>
                </div>
              ) : (
                <div className="vh__hist-list">
                  {logs.map((log, i) => (
                    <div key={log.id} className="vh__hist-item" style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className="vh__hist-icon">{PURPOSE_ICONS[log.purpose] || '📌'}</div>
                      <div className="vh__hist-body">
                        <div className="vh__hist-top">
                          <span className="vh__hist-purpose">{log.purpose}</span>
                          <StatusBadge status={log.status}/>
                        </div>
                        <div className="vh__hist-meta">
                          <span><CalendarDays size={11}/>{formatDate(log.timeIn)}</span>
                          <span><Clock size={11}/>{formatTime(log.timeIn)}{log.timeOut ? ` – ${formatTime(log.timeOut)}` : ' · ongoing'}</span>
                          {log.timeOut && <span><Timer size={11}/>{calcDuration(log.timeIn, log.timeOut)}</span>}
                        </div>
                        <div className="vh__hist-college">{log.college}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className="vh__card anim-fade-up">
              <div className="vh__card-head"><User size={16}/>My Profile</div>
              <div className="vh__profile-hero">
                <div className="vh__profile-avatar" style={{ background: bg }}>
                  {user?.photoURL ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer"/> : initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="vh__profile-name">{name}</div>
                  <div className="vh__profile-email">{user?.email}</div>
                </div>
                {/* QR Code button */}
                <button
                  className="vh__qr-btn"
                  onClick={() => setShowQR(true)}
                  title="View my QR Code"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                    <rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/>
                    <rect x="18" y="18" width="3" height="3"/>
                  </svg>
                  My QR
                </button>
              </div>
              <div className="vh__divider"/>
              <div className="vh__profile-form">
                <div className="vh__field">
                  <label className="vh__label"><Building2 size={13}/> College / Department</label>
                  <div className="vh__select-wrap">
                    <select className={`vh__select${!editForm.college ? ' empty' : ''}`} value={editForm.college} onChange={e => setEditForm(f => ({ ...f, college: e.target.value, course: '' }))}>
                      <option value="">Select your college…</option>
                      {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="vh__select-icon"/>
                  </div>
                </div>
                <div className="vh__field">
                  <label className="vh__label"><GraduationCap size={13}/> Course / Program</label>
                  <div className="vh__select-wrap">
                    <select className={`vh__select${!editForm.course ? ' empty' : ''}`} value={editForm.course} onChange={e => setEditForm(f => ({ ...f, course: e.target.value }))} disabled={!editForm.college}>
                      <option value="">{editForm.college ? 'Select your course…' : 'Select a college first…'}</option>
                      {getCoursesForCollege(editForm.college).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="vh__select-icon"/>
                  </div>
                </div>
                <div className="vh__field">
                  <label className="vh__label"><CalendarDays size={13}/> Year Level</label>
                  <div className="vh__select-wrap">
                    <select className={`vh__select${!editForm.yearLevel ? ' empty' : ''}`} value={editForm.yearLevel} onChange={e => setEditForm(f => ({ ...f, yearLevel: e.target.value }))}>
                      <option value="">Select year level…</option>
                      {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="vh__select-icon"/>
                  </div>
                </div>
                <button className="vh__cta" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <><span className="vh__spinner"/>Saving…</> : <><CheckCircle size={16}/>Save Profile</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: info panel with NEU logo watermark */}
        <div className="vh__side">
          {/* Library photo carousel */}
          <LibraryCarousel style={{ height: 200 }} className="vh__side-carousel"/>

          <div className="vh__side-card">
            <div className="vh__side-card-label">Today's Date</div>
            <div className="vh__side-card-val">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long' })}
            </div>
            <div className="vh__side-card-date">
              {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {step === 'active' && (
            <div className="vh__side-card vh__side-card--active">
              <div className="vh__side-card-label"><span className="live-dot"/>Active Session</div>
              <div className="vh__side-card-val">{elapsed || '< 1m'}</div>
              <div className="vh__side-card-date">Time in: {formatTime(session?.timeIn)}</div>
            </div>
          )}

          <div className="vh__side-tip">
            <div className="vh__side-tip-icon">💡</div>
            <div className="vh__side-tip-text">
              Complete your profile to ensure accurate visit records.
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        user={user}
        role="visitor"
        profile={profile}
      />

    </div>
  );
}