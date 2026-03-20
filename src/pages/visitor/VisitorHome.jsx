/**
 * VisitorHome.jsx — Kiosk Mode
 *
 * Pure visit logger. No history tab. No profile tab. No QR for students.
 * Selecting purpose + college and submitting = visit recorded instantly.
 * Displays "Welcome to NEU Library" on successful log.
 * Shows "Welcome back to NEU Library" on Google sign-in for returning users.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../firebase/auth';
import { logVisit, saveUserProfile, getUser, requestProfileChange } from '../../firebase/firestore';
import {
  PURPOSES, PURPOSE_ICONS, COLLEGES,
  getCoursesForCollege,
} from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  BookOpen, LogOut, CheckCircle, RotateCcw,
  ChevronDown, CalendarDays, Building2, GraduationCap, LayoutDashboard, Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LibraryCarousel from '../../components/ui/LibraryCarousel';
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

// Detect visitor type from role, email or year level
function getVisitorType(profile, role) {
  if (role === 'admin') return 'Faculty / Staff';
  if (!profile) return 'Visitor';
  if (profile.yearLevel === 'Faculty / Staff') return 'Faculty / Staff';
  if (profile.studentNumber) return 'Student';
  return 'Visitor';
}

export default function VisitorHome() {
  const { user, profile, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();

  const [submitting,     setSubmitting]     = useState(false);
  const [purpose,        setPurpose]        = useState('');
  const [college,        setCollege]        = useState('');
  const [course,         setCourse]         = useState('');
  const [visitorRole,    setVisitorRole]    = useState('');
  const [done,           setDone]           = useState(false);
  const [logTime,        setLogTime]        = useState(null);

  // Direct Firestore read ensures lock is current even if auth context hasn't refreshed
  const [profileLocked,  setProfileLocked]  = useState(false);
  const [lockedData,     setLockedData]     = useState(null);

  // Change request modal state
  const [showChangeReq,  setShowChangeReq]  = useState(false);
  const [reqCollege,     setReqCollege]     = useState('');
  const [reqCourse,      setReqCourse]      = useState('');
  const [reqRole,        setReqRole]        = useState('');
  const [reqReason,      setReqReason]      = useState('');
  const [sendingReq,     setSendingReq]     = useState(false);

  const name     = profile?.name || user?.displayName || 'Visitor';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const bg       = avatarColor(name);
  const visitorType = getVisitorType(profile, role);

  // Read profile directly from Firestore to get accurate lock status
  useEffect(() => {
    if (!user?.uid || role === 'admin') return;
    getUser(user.uid).then(data => {
      if (!data) return;
      if (data.profileLocked && data.college && data.visitorRole) {
        setProfileLocked(true);
        setLockedData({ college: data.college, course: data.course || '', visitorRole: data.visitorRole });
        setCollege(data.college);
        setCourse(data.course || '');
        setVisitorRole(data.visitorRole);
        // Pre-fill change request fields
        setReqCollege(data.college);
        setReqCourse(data.course || '');
        setReqRole(data.visitorRole);
      } else {
        // Not locked yet — pre-fill if values exist
        if (data.college)     setCollege(data.college);
        if (data.course)      setCourse(data.course);
        if (data.visitorRole) setVisitorRole(data.visitorRole);
        else if (data.yearLevel) setVisitorRole(data.yearLevel);
      }
    });
  }, [user?.uid, role]);

  const handleLog = async () => {
    if (!purpose)     return toast.error('Please select your purpose of visit.');
    if (!college)     return toast.error('Please select your college.');
    if (!visitorRole) return toast.error('Please select your role.');
    setSubmitting(true);
    try {
      const now = new Date();

      // Save college, course, role to profile permanently on first log
      if (!profileLocked && user?.uid) {
        await saveUserProfile(user.uid, { college, course, visitorRole });
      }

      await logVisit({
        uid:         user.uid,
        name,
        email:       user.email,
        college,
        course:      course || profile?.course || '',
        yearLevel:   visitorRole, // keep yearLevel field in logs for compatibility
        visitorRole,
        purpose,
        photoURL:    user.photoURL || '',
        visitorType: visitorRole === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student',
      });
      setLogTime(now);
      setDone(true);
      toast.success('Welcome to NEU Library! ✅');
    } catch {
      toast.error('Failed to log visit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDone(false);
    setPurpose('');
    setLogTime(null);
  };

  const handleChangeRequest = async () => {
    if (!reqCollege || !reqRole) return toast.error('Please fill in all required fields.');
    setSendingReq(true);
    try {
      await requestProfileChange(user.uid, {
        name,
        email: user.email,
        currentCollege: lockedData?.college || '',
        currentCourse:  lockedData?.course  || '',
        currentRole:    lockedData?.visitorRole || '',
        newCollege: reqCollege,
        newCourse:  reqCourse,
        newRole:    reqRole,
        reason:     reqReason,
      });
      toast.success('Change request sent to admin! ✅');
      setShowChangeReq(false);
      setReqReason('');
    } catch {
      toast.error('Failed to send request. Try again.');
    } finally {
      setSendingReq(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    exitAndNavigate(navigate, '/login', { replace: true });
  };

  if (authLoading) return (
    <div className="vh-loading">
      <div className="vh-loading__spinner"/>
      <span>Loading…</span>
    </div>
  );

  return (
    <div className="vh">

      {/* ── Header ── */}
      <header className="vh__header anim-fade-down">
        <div className="vh__header-brand">
          <div className="vh__header-icon">
            <img src="/images/LibraGateNEU.png" alt="LibraGate NEU"
              style={{ width: 22, height: 22, objectFit: 'contain' }}/>
          </div>
          <span className="vh__header-title">LibraGate NEU</span>
        </div>
        <div className="vh__header-right">
          {/* Admin gets a back-to-dashboard button */}
          {role === 'admin' && (
            <button
              className="vh__header-dashboard-btn"
              onClick={() => navigate('/admin/dashboard')}
              title="Back to Dashboard"
            >
              <LayoutDashboard size={14}/>
              <span>Dashboard</span>
            </button>
          )}
          <div className="vh__header-avatar" style={{ background: bg }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer"/>
              : initials}
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
      <div className="vh__banner anim-fade-up"
        style={{ backgroundImage:"url('/images/neu-logo.png')",
          backgroundRepeat:'no-repeat', backgroundPosition:'right 40px center',
          backgroundSize:'120px 120px' }}>
        <div className="vh__banner-avatar" style={{ background: bg }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer"/>
            : initials}
        </div>
        <div className="vh__banner-text">
          <div className="vh__banner-greeting">
            Good {getTimeOfDay()}, <strong>{name.split(' ')[0]}</strong>! 👋
          </div>
          <div className="vh__banner-sub">
            {visitorType} · {college || 'NEU Library Kiosk'}
          </div>
          <div className="vh__banner-type-badge">
            {visitorType === 'Faculty / Staff' ? '👩‍🏫 Faculty / Staff' :
             visitorType === 'Student'         ? '🎓 Student' : '🏛️ Visitor'}
          </div>
        </div>
        <div className="vh__banner-date">
          <CalendarDays size={13}/>
          {new Date().toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric'})}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="vh__body vh__body--kiosk">

        {/* MAIN: Logger */}
        <div className="vh__main">
          {!done ? (
            <div className="vh__card anim-fade-up">
              <div className="vh__card-head">
                <BookOpen size={16}/>
                Log Your Visit
              </div>

              {/* Purpose grid */}
              <div className="vh__label-row">
                <Building2 size={13}/> Purpose of Visit
              </div>
              <div className="vh__purposes">
                {PURPOSES.map((p, i) => (
                  <button key={p}
                    className={`vh__purpose-btn${purpose === p ? ' active' : ''}`}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => setPurpose(p)}>
                    <span className="vh__purpose-emoji">{PURPOSE_ICONS[p]}</span>
                    <span className="vh__purpose-name">{p}</span>
                  </button>
                ))}
              </div>

              {/* ── Profile fields: locked after first save ── */}
              {profileLocked ? (
                <>
                  <div className="vh__profile-locked">
                    <div className="vh__profile-locked-head">
                      <span>🔒</span>
                      <span>Your profile information is saved.</span>
                    </div>
                    <div className="vh__profile-locked-rows">
                      <div className="vh__profile-locked-row">
                        <span className="vh__profile-locked-label">College</span>
                        <span className="vh__profile-locked-val">{lockedData?.college}</span>
                      </div>
                      {lockedData?.course && (
                        <div className="vh__profile-locked-row">
                          <span className="vh__profile-locked-label">Course</span>
                          <span className="vh__profile-locked-val">{lockedData?.course}</span>
                        </div>
                      )}
                      <div className="vh__profile-locked-row">
                        <span className="vh__profile-locked-label">Role</span>
                        <span className="vh__profile-locked-val">
                          {lockedData?.visitorRole === 'Faculty / Staff' ? '👩‍🏫' : '🎓'} {lockedData?.visitorRole}
                        </span>
                      </div>
                    </div>
                    <button className="vh__change-req-btn" onClick={() => setShowChangeReq(true)}>
                      <Send size={12}/> Request a change
                    </button>
                  </div>

                  {/* Change request modal */}
                  {showChangeReq && (
                    <div className="vh__modal-overlay" onClick={() => setShowChangeReq(false)}>
                      <div className="vh__modal" onClick={e => e.stopPropagation()}>
                        <div className="vh__modal-head">
                          <span>📝 Request Profile Change</span>
                          <button onClick={() => setShowChangeReq(false)}>✕</button>
                        </div>
                        <p className="vh__modal-sub">Your request will be sent to the library admin for approval.</p>

                        <div className="vh__modal-field">
                          <label>New College / Department</label>
                          <select value={reqCollege} onChange={e => { setReqCollege(e.target.value); setReqCourse(''); }}>
                            <option value="">Select college…</option>
                            {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="vh__modal-field">
                          <label>New Course / Program</label>
                          <select value={reqCourse} onChange={e => setReqCourse(e.target.value)} disabled={!reqCollege}>
                            <option value="">{reqCollege ? 'Select course…' : 'Select college first…'}</option>
                            {getCoursesForCollege(reqCollege).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="vh__modal-field">
                          <label>New Role</label>
                          <select value={reqRole} onChange={e => setReqRole(e.target.value)}>
                            <option value="">Select role…</option>
                            <option value="Student">🎓 Student</option>
                            <option value="Faculty / Staff">👩‍🏫 Faculty / Staff</option>
                          </select>
                        </div>
                        <div className="vh__modal-field">
                          <label>Reason for change <span style={{color:'#9ca3af'}}>(optional)</span></label>
                          <textarea
                            className="vh__modal-textarea"
                            placeholder="e.g. Wrong course selected, transferred college…"
                            value={reqReason}
                            onChange={e => setReqReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="vh__modal-foot">
                          <button className="vh__modal-cancel" onClick={() => setShowChangeReq(false)}>Cancel</button>
                          <button className="vh__modal-submit" onClick={handleChangeRequest} disabled={sendingReq || !reqCollege || !reqRole}>
                            {sendingReq ? 'Sending…' : <><Send size={13}/> Send Request</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* College */}
                  <div className="vh__field">
                    <label className="vh__label"><Building2 size={13}/> College / Department</label>
                    <div className="vh__select-wrap">
                      <select className={`vh__select${!college?' empty':''}`}
                        value={college} onChange={e => { setCollege(e.target.value); setCourse(''); }}>
                        <option value="">Select your college…</option>
                        {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="vh__select-icon"/>
                    </div>
                  </div>

                  {/* Course */}
                  <div className="vh__field">
                    <label className="vh__label"><GraduationCap size={13}/> Course / Program</label>
                    <div className="vh__select-wrap">
                      <select className={`vh__select${!course?' empty':''}`}
                        value={course} onChange={e => setCourse(e.target.value)} disabled={!college}>
                        <option value="">{college ? 'Select course…' : 'Select college first…'}</option>
                        {getCoursesForCollege(college).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="vh__select-icon"/>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="vh__field">
                    <label className="vh__label"><GraduationCap size={13}/> Role</label>
                    <div className="vh__select-wrap">
                      <select className={`vh__select${!visitorRole?' empty':''}`}
                        value={visitorRole} onChange={e => setVisitorRole(e.target.value)}>
                        <option value="">Select your role…</option>
                        <option value="Student">🎓 Student</option>
                        <option value="Faculty / Staff">👩‍🏫 Faculty / Staff</option>
                      </select>
                      <ChevronDown size={14} className="vh__select-icon"/>
                    </div>
                  </div>

                  <div className="vh__profile-save-note">
                    ℹ️ Your college, course, and role will be saved after your first log and cannot be changed without admin approval.
                  </div>
                </>
              )}

              <button className="vh__cta"
                disabled={!purpose || !college || !visitorRole || submitting}
                onClick={handleLog}>
                {submitting
                  ? <><span className="vh__spinner"/>Logging visit…</>
                  : <><CheckCircle size={16}/>Log My Visit</>}
              </button>
            </div>
          ) : (
            /* ── Done state ── */
            <div className="vh__card vh__done anim-scale-in">
              <div className="vh__done-ring">
                <CheckCircle size={44} strokeWidth={1.5}/>
              </div>
              <h2 className="vh__done-title">Welcome to NEU Library!</h2>
              <p className="vh__done-sub">
                Your visit has been recorded.
                {logTime && (
                  <><br/>Logged at <strong>{logTime.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</strong></>
                )}
              </p>
              <div className="vh__done-details">
                <span>{PURPOSE_ICONS[purpose]} {purpose}</span>
                <span>🏛️ {college}</span>
              </div>
              <button className="vh__done-btn" onClick={handleReset}>
                <RotateCcw size={14}/> Log another visit
              </button>
            </div>
          )}
        </div>

        {/* SIDE: carousel + info */}
        <div className="vh__side">
          <LibraryCarousel className="vh__side-carousel"/>

          <div className="vh__side-card">
            <div className="vh__side-card-label">Today's Date</div>
            <div className="vh__side-card-val">
              {new Date().toLocaleDateString('en-PH',{weekday:'long'})}
            </div>
            <div className="vh__side-card-date">
              {new Date().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}
            </div>
          </div>

          <div className="vh__side-tip">
            <div className="vh__side-tip-icon">ℹ️</div>
            <div className="vh__side-tip-text">
              Select your purpose and college, then tap <strong>Log My Visit</strong>.
              No sign-out required — your visit is recorded immediately.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}