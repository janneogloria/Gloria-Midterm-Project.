/**
 * Login.jsx — LibraGate NEU
 *
 * Views:
 *   'select'         — mode picker
 *   'visitor'        — Google SSO only (no password for visitors)
 *   'visitor-setup'  — new visitor: choose Faculty or Student (first-time only)
 *   'admin-login'    — admin email/password
 *   'admin-register' — admin registration
 *   'forgot'         — password reset
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithGoogle, loginUser, registerAdmin,
  resetPassword, updateVisitorProfile,
} from '../firebase/auth';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Mail, Lock, Eye, EyeOff,
  ArrowLeft, Shield, ArrowRight,
  GraduationCap, BookOpen,
} from 'lucide-react';
import './Login.css';

/* ── Carousel ──────────────────────────────────────────────── */
const SLIDES = [
  '/images/carousellib1.jpg', '/images/carousellib2.jpg',
  '/images/carousellib3.jpg', '/images/carousellib4.jpg',
];
function LoginCarousel() {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="auth__carousel">
      {SLIDES.map((src, i) => (
        <div key={src}
          className={`auth__carousel-slide${i === idx ? ' auth__carousel-slide--active' : ''}`}
          style={{ backgroundImage: `url('${src}')` }}/>
      ))}
      <div className="auth__carousel-dots">
        {SLIDES.map((_, i) => (
          <button key={i}
            className={`auth__carousel-dot${i === idx ? ' active' : ''}`}
            onClick={() => setIdx(i)}/>
        ))}
      </div>
    </div>
  );
}

/* ── Google logo ───────────────────────────────────────────── */
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ── Field wrapper ─────────────────────────────────────────── */
function Field({ label, icon: Icon, error, children }) {
  return (
    <div className={`lf${error ? ' lf--err' : ''}`}>
      <label className="lf__label">{label}</label>
      <div className="lf__wrap">
        <span className="lf__icon"><Icon size={14}/></span>
        {children}
      </div>
      {error && <span className="lf__err"><span>⚠</span>{error}</span>}
    </div>
  );
}

/* ── Password field ────────────────────────────────────────── */
function PwField({ label, value, onChange, error, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`lf${error ? ' lf--err' : ''}`}>
      <label className="lf__label">{label}</label>
      <div className="lf__wrap">
        <span className="lf__icon"><Lock size={14}/></span>
        <input
          type={show ? 'text' : 'password'}
          className="lf__input lf__input--pr"
          value={value} onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder || ''}/>
        <button type="button" className="lf__eye" onClick={() => setShow(s => !s)}>
          {show ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
      {error && <span className="lf__err"><span>⚠</span>{error}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Login() {
  const [view,      setView]      = useState('select');
  const [loading,   setLoading]   = useState(false);
  const [forgotOk,  setForgotOk]  = useState(false);
  // New visitor profile setup state
  const [newUserData, setNewUserData] = useState(null); // { user } after Google sign-in
  const [visitorRole, setVisitorRole] = useState('');   // 'student' | 'faculty'
  const [savingRole,  setSavingRole]  = useState(false);

  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (view === 'visitor-setup') return; // don't redirect during setup
    if (role === 'admin')   navigate('/admin/dashboard', { replace: true });
    if (role === 'visitor') navigate('/visitor/home',    { replace: true });
  }, [user, role, navigate, view]);

  /* ── Admin form state ── */
  const [alf, setAlf] = useState({ email: '', password: '' });
  const [ale, setAle] = useState({});
  const [arf, setArf] = useState({ name: '', email: '', password: '', confirm: '' });
  const [are, setAre] = useState({});
  const [fe,  setFe]  = useState('');

  const go = (v) => {
    setView(v);
    setAle({}); setAre({});
    setForgotOk(false);
  };

  /* ── Google Sign-In (visitors) ── */
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { user: u, isNew } = await signInWithGoogle();
      if (isNew) {
        // Ask new users whether they are faculty or student
        setNewUserData({ user: u });
        setView('visitor-setup');
        setLoading(false);
      } else {
        toast.success('Welcome back to NEU Library! 👋');
        // useEffect redirects when role loads
      }
    } catch (err) {
      if (err.message === 'WRONG_DOMAIN')
        toast.error('Only @neu.edu.ph email accounts are allowed.');
      else if (err.message === 'BLOCKED')
        toast.error('Your account has been blocked. Contact the library admin.');
      else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')
        { /* user closed popup — no toast */ }
      else if (err.code === 'auth/popup-blocked')
        toast.error('Pop-up was blocked. Please allow pop-ups for this site.');
      else
        toast.error('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  /* ── Save visitor role (faculty / student) after Google ── */
  const handleSaveVisitorRole = async () => {
    if (!visitorRole) return toast.error('Please select Faculty or Student.');
    setSavingRole(true);
    try {
      await updateVisitorProfile(newUserData.user.uid, {
        yearLevel: visitorRole === 'faculty' ? 'Faculty / Staff' : '',
        visitorType: visitorRole === 'faculty' ? 'Faculty / Staff' : 'Student',
      });
      toast.success('Welcome to NEU Library! 🎉');
      // Trigger redirect by reloading auth
      navigate('/visitor/home', { replace: true });
    } catch {
      toast.error('Failed to save. Please try again.');
      setSavingRole(false);
    }
  };

  /* ── Admin login ── */
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!alf.email)    errs.email    = 'Email is required.';
    if (!alf.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) return setAle(errs);
    setAle({}); setLoading(true);
    try {
      const loggedIn = await loginUser(alf.email, alf.password);
      const { resolveRole } = await import('../firebase/auth');
      const { role: r } = await resolveRole(loggedIn.uid);
      if (r !== 'admin') {
        const { logoutUser } = await import('../firebase/auth');
        await logoutUser();
        setAle({ email: 'This account does not have administrator access. Please use Student / Faculty login.' });
        setLoading(false);
        return;
      }
    } catch (err) {
      const c = err.code;
      if (c === 'auth/user-not-found' || c === 'auth/wrong-password' || c === 'auth/invalid-credential')
        setAle({ password: 'Incorrect email or password.' });
      else if (c === 'auth/too-many-requests')
        toast.error('Too many attempts. Try again later.');
      else toast.error('Sign in failed.');
      setLoading(false);
    }
  };

  /* ── Admin register ── */
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!arf.name.trim())  errs.name     = 'Full name is required.';
    if (!arf.email)        errs.email    = 'Email is required.';
    if (!arf.password)     errs.password = 'Password is required.';
    else if (arf.password.length < 6) errs.password = 'At least 6 characters.';
    if (arf.confirm !== arf.password) errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length) return setAre(errs);
    setAre({}); setLoading(true);
    try {
      await registerAdmin(arf.email, arf.password, arf.name.trim());
      toast.success('Admin account created! Signing you in…');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setAre({ email: 'Email already registered.' });
      else toast.error('Registration failed.');
      setLoading(false);
    }
  };

  /* ── Forgot password ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!fe) return toast.error('Enter your email.');
    setLoading(true);
    try { await resetPassword(fe); setForgotOk(true); }
    catch { toast.error('Could not send reset email.'); }
    finally { setLoading(false); }
  };

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <div className="auth">

      {/* LEFT PANEL */}
      <aside className="auth__panel">
        <LoginCarousel/>
        <div className="auth__panel-overlay"/>
        <div className="auth__panel-inner">
          <div className="auth__brand">
            <div className="auth__brand-libralog">
              <div className="auth__brand-icon">
                <img src="/images/LibraGateNEU.png" alt="LibraGate NEU"
                  style={{ width:26, height:26, objectFit:'contain' }}/>
              </div>
              <div>
                <div className="auth__brand-name">LibraGate NEU</div>
                <div className="auth__brand-tagline">Library Management</div>
              </div>
            </div>
            <div className="auth__brand-divider"/>
            <img src="/images/neu-logo.png" alt="NEU" className="auth__neu-logo"/>
          </div>

          <div className="auth__panel-hero">
            <h1>Your Library.<br/>Smarter.</h1>
            <p>A modern visitor management system for New Era University Library.</p>
          </div>

          <div className="auth__stats">
            {[{num:'24/7',label:'Access Logs'},{num:'Live',label:'Real-time'},{num:'100%',label:'Secure'}]
              .map(({num,label}) => (
                <div key={label} className="auth__stat">
                  <div className="auth__stat-num">{num}</div>
                  <div className="auth__stat-label">{label}</div>
                </div>
              ))}
          </div>

          <div className="auth__panel-foot">
            <Shield size={11}/> Secured with Firebase Authentication
          </div>
        </div>
        <div className="auth__geo g1"/>
        <div className="auth__geo g2"/>
      </aside>

      {/* RIGHT — FORM */}
      <main className="auth__main" style={{ backgroundImage:"url('/images/library.jpg')" }}>
        <div className="auth__card">

          {/* MODE SELECT */}
          {view === 'select' && (
            <div className="auth__section anim-fade-up">
              <div className="auth__hd">
                <h2>Welcome to LibraGate NEU</h2>
                <p>How would you like to continue?</p>
              </div>
              <div className="mode-grid">
                <button className="mode-card" onClick={() => go('visitor')}>
                  <div className="mode-card__icon mode-card__icon--visitor">🎓</div>
                  <div className="mode-card__body">
                    <span className="mode-card__label">Student / Faculty</span>
                    <span className="mode-card__desc">Sign in with your @neu.edu.ph Google account</span>
                  </div>
                  <div className="mode-card__arrow"><ArrowRight size={16}/></div>
                </button>
                <button className="mode-card" onClick={() => go('admin-login')}>
                  <div className="mode-card__icon mode-card__icon--admin">🛡️</div>
                  <div className="mode-card__body">
                    <span className="mode-card__label">Administrator</span>
                    <span className="mode-card__desc">Sign in with admin credentials</span>
                  </div>
                  <div className="mode-card__arrow"><ArrowRight size={16}/></div>
                </button>
              </div>
              <p className="auth__footnote">New Era University · Library Services</p>
              <p className="auth__footer">© {new Date().getFullYear()} New Era University · Library Services</p>
            </div>
          )}

          {/* VISITOR — Google only */}
          {view === 'visitor' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('select')}>
                <ArrowLeft size={14}/> Back
              </button>
              <div className="auth__hd">
                <h2>Student &amp; Faculty</h2>
                <p>Sign in with your <strong>@neu.edu.ph</strong> Google account.</p>
              </div>

              <button className="google-btn" onClick={handleGoogle} disabled={loading}>
                {loading ? <span className="btn-spin"/> : <GoogleLogo/>}
                Continue with Google (@neu.edu.ph)
              </button>

              <div className="auth__visitor-note">
                <BookOpen size={13}/>
                <span>Only institutional email addresses are accepted. Personal Gmail accounts are not allowed.</span>
              </div>

              <p className="auth__footnote">New Era University · Library Services</p>
            </div>
          )}

          {/* VISITOR SETUP — faculty or student (first time only) */}
          {view === 'visitor-setup' && (
            <div className="auth__section anim-fade-up">
              <div className="auth__hd">
                <h2>One quick question</h2>
                <p>Help us set up your account correctly.</p>
              </div>

              <div className="auth__role-grid">
                <button
                  className={`auth__role-card${visitorRole==='faculty'?' auth__role-card--active':''}`}
                  onClick={() => setVisitorRole('faculty')}>
                  <span className="auth__role-icon">👩‍🏫</span>
                  <span className="auth__role-label">Faculty / Staff</span>
                  <span className="auth__role-desc">Professors, instructors, and staff</span>
                </button>
                <button
                  className={`auth__role-card${visitorRole==='student'?' auth__role-card--active':''}`}
                  onClick={() => setVisitorRole('student')}>
                  <span className="auth__role-icon">🎓</span>
                  <span className="auth__role-label">Student</span>
                  <span className="auth__role-desc">Enrolled students</span>
                </button>
              </div>

              <button className="btn btn--primary btn--full"
                disabled={!visitorRole || savingRole}
                onClick={handleSaveVisitorRole}>
                {savingRole
                  ? <><span className="btn-spin"/>Saving…</>
                  : <><GraduationCap size={15}/>Continue to Library</>}
              </button>
            </div>
          )}

          {/* ADMIN LOGIN */}
          {view === 'admin-login' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('select')}>
                <ArrowLeft size={14}/> Back
              </button>
              <div className="auth__hd">
                <h2>Admin Sign In</h2>
                <p>Access the library management dashboard.</p>
              </div>
              <form onSubmit={handleAdminLogin} noValidate>
                <Field label="Email address" icon={Mail} error={ale.email}>
                  <input type="email" className="lf__input"
                    placeholder="admin@neu.edu.ph"
                    value={alf.email}
                    onChange={e => setAlf(f => ({...f, email: e.target.value}))}
                    autoComplete="email"/>
                </Field>
                <PwField label="Password"
                  value={alf.password}
                  onChange={e => setAlf(f => ({...f, password: e.target.value}))}
                  error={ale.password} autoComplete="current-password"/>
                <div className="auth__row">
                  <button type="button" className="auth__link"
                    onClick={() => go('forgot')}>Forgot password?</button>
                </div>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Signing in…</> : 'Sign In'}
                </button>
              </form>
              <p className="auth__switch">
                Need an admin account?{' '}
                <button className="auth__link" onClick={() => go('admin-register')}>Create one</button>
              </p>
            </div>
          )}

          {/* ADMIN REGISTER */}
          {view === 'admin-register' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('admin-login')}>
                <ArrowLeft size={14}/> Back to sign in
              </button>
              <div className="auth__hd">
                <h2>Create Admin Account</h2>
              </div>
              <form onSubmit={handleAdminRegister} noValidate>
                <Field label="Full name" icon={Shield} error={are.name}>
                  <input type="text" className="lf__input"
                    placeholder="Juan Dela Cruz"
                    value={arf.name}
                    onChange={e => setArf(f => ({...f, name: e.target.value}))}
                    autoComplete="name"/>
                </Field>
                <Field label="Email address" icon={Mail} error={are.email}>
                  <input type="email" className="lf__input"
                    placeholder="admin@neu.edu.ph"
                    value={arf.email}
                    onChange={e => setArf(f => ({...f, email: e.target.value}))}
                    autoComplete="email"/>
                </Field>
                <PwField label="Password"
                  value={arf.password}
                  onChange={e => setArf(f => ({...f, password: e.target.value}))}
                  error={are.password} autoComplete="new-password"/>
                <PwField label="Confirm password"
                  value={arf.confirm}
                  onChange={e => setArf(f => ({...f, confirm: e.target.value}))}
                  placeholder="Re-enter password"
                  error={are.confirm} autoComplete="new-password"/>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Creating…</> : 'Create Admin Account'}
                </button>
              </form>
              <p className="auth__switch">
                Already have an account?{' '}
                <button className="auth__link" onClick={() => go('admin-login')}>Sign in</button>
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {view === 'forgot' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('admin-login')}>
                <ArrowLeft size={14}/> Back
              </button>
              {forgotOk ? (
                <div className="sent-box">
                  <div className="sent-box__icon"><Shield size={28}/></div>
                  <h2>Email sent!</h2>
                  <p>Check your inbox for the password reset link.</p>
                  <button className="btn btn--ghost btn--full" onClick={() => go('admin-login')}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div className="auth__hd">
                    <h2>Reset Password</h2>
                    <p>Enter your admin email and we'll send a reset link.</p>
                  </div>
                  <form onSubmit={handleForgot} noValidate>
                    <Field label="Email address" icon={Mail} error={null}>
                      <input type="email" className="lf__input"
                        placeholder="admin@neu.edu.ph"
                        value={fe} onChange={e => setFe(e.target.value)}
                        autoComplete="email"/>
                    </Field>
                    <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                      {loading ? <><span className="btn-spin"/>Sending…</> : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}