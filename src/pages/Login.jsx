/**
 * pages/Login.jsx  —  NEU LibraLog v3
 *
 * Views:
 *   'select'           - mode picker
 *   'visitor'          - Google SSO + email login + create account
 *   'visitor-register' - visitor registration form
 *   'admin-login'      - admin email/password form
 *   'admin-register'   - admin registration form
 *   'forgot'           - reset password
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, loginUser, registerUser, registerVisitor, resetPassword } from '../firebase/auth';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Mail, Lock, Eye, EyeOff, User,
  ArrowLeft, CheckCircle, Shield, ArrowRight, Hash,
} from 'lucide-react';
import './Login.css';

/* ── Login panel carousel ─────────────────────────────────── */
const CAROUSEL_IMGS = [
  '/images/carousellib1.jpg',
  '/images/carousellib2.jpg',
  '/images/carousellib3.jpg',
  '/images/carousellib4.jpg',
];

function LoginCarousel() {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % CAROUSEL_IMGS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="auth__carousel">
      {CAROUSEL_IMGS.map((src, i) => (
        <div
          key={src}
          className={`auth__carousel-slide${i === idx ? ' auth__carousel-slide--active' : ''}`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      <div className="auth__carousel-dots">
        {CAROUSEL_IMGS.map((_, i) => (
          <button
            key={i}
            className={`auth__carousel-dot${i === idx ? ' active' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Password strength ───────────────────────────────────────────────── */
function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

/* ── Error icon ──────────────────────────────────────────────────────── */
const ErrIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
    <path d="M6 3.5v3M6 8.5v.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

/* ── Form field wrapper ──────────────────────────────────────────────── */
function Field({ label, icon: Icon, error, children }) {
  return (
    <div className={`lf${error ? ' lf--err' : ''}`}>
      <label className="lf__label">{label}</label>
      <div className="lf__wrap">
        <span className="lf__icon"><Icon size={14}/></span>
        {children}
      </div>
      {error && <span className="lf__err"><ErrIcon/>{error}</span>}
    </div>
  );
}

/* ── Password field with show/hide ──────────────────────────────────── */
function PwField({ label, value, onChange, placeholder, autoComplete, error }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} icon={Lock} error={error}>
      <input
        type={show ? 'text' : 'password'}
        className="lf__input lf__input--pr"
        value={value} onChange={onChange}
        placeholder={placeholder || '••••••••'}
        autoComplete={autoComplete}
      />
      <button type="button" className="lf__eye" onClick={() => setShow(v => !v)} tabIndex={-1}>
        {show ? <EyeOff size={14}/> : <Eye size={14}/>}
      </button>
    </Field>
  );
}

/* ── Password strength bar ───────────────────────────────────────────── */
function StrengthBar({ pw }) {
  const s = getStrength(pw);
  const meta = [
    { l: '',       c: '#e2e6f3' },
    { l: 'Weak',   c: '#ef4444' },
    { l: 'Fair',   c: '#f59e0b' },
    { l: 'Good',   c: '#3b82f6' },
    { l: 'Strong', c: '#22c55e' },
  ];
  if (!pw) return null;
  const current = meta[s] || meta[0];
  return (
    <div className="sb">
      <div className="sb__track">
        {[1,2,3,4].map(i => (
          <div key={i} className="sb__seg"
            style={{ background: i <= s ? current.c : undefined }}/>
        ))}
      </div>
      <span className="sb__lbl" style={{ color: current.c }}>{current.l}</span>
    </div>
  );
}

/* ── Google logo SVG ─────────────────────────────────────────────────── */
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const [view,     setView]     = useState('select');
  const [loading,  setLoading]  = useState(false);
  const [forgotOk, setForgotOk] = useState(false);

  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (role === 'admin')   navigate('/admin/dashboard', { replace: true });
    if (role === 'visitor') navigate('/visitor/home',    { replace: true });
  }, [user, role, navigate]);

  /* form state */
  const [vlf, setVlf] = useState({ email: '', password: '' });
  const [vle, setVle] = useState({});
  const [vrf, setVrf] = useState({ name: '', email: '', studentNumber: '', password: '', confirm: '' });
  const [vre, setVre] = useState({});
  const [alf, setAlf] = useState({ email: '', password: '' });
  const [ale, setAle] = useState({});
  const [arf, setArf] = useState({ name: '', email: '', password: '', confirm: '' });
  const [are, setAre] = useState({});
  const [fe,  setFe]  = useState('');

  const go = (v) => {
    setView(v);
    setVle({}); setVre({});
    setAle({}); setAre({});
    setForgotOk(false);
  };

  /* Google sign-in */
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { isNew } = await signInWithGoogle();
      if (isNew) {
        toast.success('Welcome to NEU Library! 🎉');
      } else {
        toast.success('Welcome back to NEU Library! 👋');
      }
      // useEffect will redirect via role
    } catch (err) {
      if (err.message === 'WRONG_DOMAIN')
        toast.error('Only @neu.edu.ph accounts are allowed.');
      else if (err.message === 'BLOCKED')
        toast.error('Your account has been blocked. Contact the library admin.');
      else if (err.code !== 'auth/popup-closed-by-user')
        toast.error('Google sign-in failed. Try again.');
      setLoading(false);
    }
  };

  /* Visitor email login */
  const handleVisitorLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!vlf.email)    errs.email    = 'Email is required.';
    if (!vlf.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) return setVle(errs);
    setVle({}); setLoading(true);
    try {
      await loginUser(vlf.email, vlf.password);
    } catch (err) {
      const c = err.code;
      if (c === 'auth/user-not-found' || c === 'auth/wrong-password' || c === 'auth/invalid-credential')
        setVle({ password: 'Incorrect email or password.' });
      else if (c === 'auth/too-many-requests')
        toast.error('Too many attempts. Try again later.');
      else toast.error('Sign in failed. Try again.');
    } finally { setLoading(false); }
  };

  /* Visitor register */
  const handleVisitorRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!vrf.name.trim())  errs.name     = 'Full name is required.';
    if (!vrf.email)        errs.email    = 'Email is required.';
    else if (!vrf.email.endsWith('@neu.edu.ph')) errs.email = 'Must be a @neu.edu.ph address.';
    // Student number: optional for faculty, validated if provided
    if (vrf.studentNumber && !/^\d{2}-\d{5}-\d{3}$/.test(vrf.studentNumber.trim()))
      errs.studentNumber = 'Format must be XX-XXXXX-XXX (e.g. 24-13702-736). Leave blank if faculty.';
    if (!vrf.password)     errs.password = 'Password is required.';
    else if (vrf.password.length < 6)            errs.password = 'At least 6 characters.';
    if (vrf.confirm !== vrf.password)            errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length) return setVre(errs);

    setVre({});
    setLoading(true);
    try {
      await registerVisitor(vrf.email, vrf.password, vrf.name.trim(), vrf.studentNumber.trim());
      // registerVisitor awaits the Firestore write before returning.
      // Firebase Auth auto signs-in on createUserWithEmailAndPassword,
      // so onAuthStateChanged fires, useAuth resolves the role with retry,
      // and the useEffect below handles the redirect automatically.
      toast.success('Account created! Signing you in…');
    } catch (err) {
      const c = err.code;
      if (c === 'auth/email-already-in-use')
        setVre({ email: 'Email already registered. Try signing in instead.' });
      else if (c === 'auth/wrong-password' || c === 'auth/invalid-credential')
        setVre({ email: 'Email registered with a different password. Try signing in.' });
      else if (c === 'auth/weak-password')
        setVre({ password: 'Password is too weak. Use at least 6 characters.' });
      else {
        console.error('Registration error:', err);
        toast.error('Registration failed. Please try again.');
      }
      setLoading(false); // only reset loading on error — success keeps spinner while redirecting
    }
  };

  /* Admin login — rejects non-admin accounts */
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!alf.email)    errs.email    = 'Email is required.';
    if (!alf.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) return setAle(errs);
    setAle({}); setLoading(true);
    try {
      const loggedInUser = await loginUser(alf.email, alf.password);
      // Verify the account is actually an admin — reject students/visitors
      const { resolveRole } = await import('../firebase/auth');
      const { role: resolvedRole } = await resolveRole(loggedInUser.uid);
      if (resolvedRole !== 'admin') {
        // Sign them out immediately — this is the admin portal
        const { logoutUser } = await import('../firebase/auth');
        await logoutUser();
        setAle({ email: 'This account does not have administrator access. Please use the Student / Faculty login instead.' });
        setLoading(false);
        return;
      }
      // Admin confirmed — useEffect will redirect to dashboard
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

  /* Admin register */
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!arf.name.trim())  errs.name     = 'Full name is required.';
    if (!arf.email)        errs.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(arf.email)) errs.email = 'Enter a valid email.';
    if (!arf.password)     errs.password = 'Password is required.';
    else if (arf.password.length < 6)          errs.password = 'At least 6 characters.';
    if (arf.confirm !== arf.password)          errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length) return setAre(errs);
    setAre({}); setLoading(true);
    try {
      await registerUser(arf.email, arf.password, arf.name.trim());
      toast.success('Admin account created! Signing you in…');
      // Auto signed-in — useEffect will redirect to dashboard
    } catch (err) {
      const c = err.code;
      if (c === 'auth/email-already-in-use') setAre({ email: 'Email already registered.' });
      else if (c === 'auth/weak-password') setAre({ password: 'Password is too weak.' });
      else toast.error('Registration failed.');
      setLoading(false); // only reset on error
    }
  };

  /* Forgot password */
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!fe || !/\S+@\S+\.\S+/.test(fe)) return toast.error('Enter a valid email.');
    setLoading(true);
    try { await resetPassword(fe); setForgotOk(true); }
    catch { toast.error('Could not send reset email.'); }
    finally { setLoading(false); }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="auth">

      {/* LEFT PANEL — Carousel + branding */}
      <aside className="auth__panel">
        <LoginCarousel />
        <div className="auth__panel-overlay"/>
        <div className="auth__panel-inner">

          {/* Brand */}
          <div className="auth__brand">
            <div className="auth__brand-libralog">
              <div className="auth__brand-icon">
                <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
              </div>
              <div>
                <div className="auth__brand-name">LibraGate NEU</div>
                <div className="auth__brand-tagline">Library Management</div>
              </div>
            </div>
            <div className="auth__brand-divider"/>
            <img src="/images/neu-logo.png" alt="New Era University" className="auth__neu-logo"/>
          </div>

          {/* Hero */}
          <div className="auth__panel-hero">
            <h1>Your Library.<br/>Smarter.</h1>
            <p>A modern visitor management system for the New Era University Library.</p>
          </div>

          {/* Stats row */}
          <div className="auth__stats">
            {[
              { num: '24/7', label: 'Access Logs' },
              { num: 'Live', label: 'Real-time Data' },
              { num: '100%', label: 'Secure' },
            ].map(({ num, label }) => (
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

      {/* RIGHT — FORM AREA */}
      <main className="auth__main" style={{ backgroundImage: "url('/images/library.jpg')" }}>
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
                    <span className="mode-card__desc">Sign in or create a visitor account</span>
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
            </div>
          )}

          {/* VISITOR — Google + email/password */}
          {view === 'visitor' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('select')}>
                <ArrowLeft size={14}/>Back
              </button>
              <div className="auth__hd">
                <h2>Student &amp; Faculty</h2>
                <p>Sign in to log your library visit using your <strong>@neu.edu.ph</strong> account.</p>
              </div>

              <button className="google-btn" onClick={handleGoogle} disabled={loading}>
                {loading
                  ? <><span className="btn-spin btn-spin--dark"/>Signing in...</>
                  : <><GoogleLogo/>Continue with Google (@neu.edu.ph)</>
                }
              </button>

              <div className="auth__divider"><span>or sign in with email</span></div>

              <form onSubmit={handleVisitorLogin} noValidate>
                <Field label="Email address" icon={Mail} error={vle.email}>
                  <input type="email" className="lf__input"
                    placeholder="yourname@neu.edu.ph"
                    value={vlf.email}
                    onChange={e => setVlf(f => ({...f, email: e.target.value}))}
                    autoComplete="email"/>
                </Field>
                <PwField label="Password"
                  value={vlf.password}
                  onChange={e => setVlf(f => ({...f, password: e.target.value}))}
                  autoComplete="current-password"
                  error={vle.password}/>
                <div className="auth__row">
                  <button type="button" className="auth__link" onClick={() => go('forgot')}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Signing in...</> : 'Sign In'}
                </button>
              </form>

              <p className="auth__switch">
                No account yet?{' '}
                <button className="auth__link" onClick={() => go('visitor-register')}>Create one</button>
              </p>
            </div>
          )}

          {/* VISITOR REGISTER */}
          {view === 'visitor-register' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('visitor')}>
                <ArrowLeft size={14}/>Back to sign in
              </button>
              <div className="auth__hd">
                <h2>Create Visitor Account</h2>
                <p>Register with your <strong>@neu.edu.ph</strong> email address.</p>
              </div>

              <form onSubmit={handleVisitorRegister} noValidate>
                <Field label="Full name" icon={User} error={vre.name}>
                  <input type="text" className="lf__input"
                    placeholder="Juan Dela Cruz"
                    value={vrf.name}
                    onChange={e => setVrf(f => ({...f, name: e.target.value}))}
                    autoComplete="name"/>
                </Field>
                <Field label="Email address (@neu.edu.ph)" icon={Mail} error={vre.email}>
                  <input type="email" className="lf__input"
                    placeholder="yourname@neu.edu.ph"
                    value={vrf.email}
                    onChange={e => setVrf(f => ({...f, email: e.target.value}))}
                    autoComplete="email"/>
                </Field>
                <Field label="Student Number (optional — leave blank if faculty)" icon={Hash} error={vre.studentNumber}>
                  <input type="text" className="lf__input"
                    placeholder="24-13702-736"
                    value={vrf.studentNumber}
                    onChange={e => setVrf(f => ({...f, studentNumber: e.target.value}))}
                    autoComplete="off"
                    maxLength={12}/>
                </Field>
                <PwField label="Password"
                  value={vrf.password}
                  onChange={e => setVrf(f => ({...f, password: e.target.value}))}
                  autoComplete="new-password" error={vre.password}/>
                <StrengthBar pw={vrf.password}/>
                <PwField label="Confirm password"
                  value={vrf.confirm}
                  onChange={e => setVrf(f => ({...f, confirm: e.target.value}))}
                  placeholder="Re-enter password"
                  autoComplete="new-password" error={vre.confirm}/>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Creating...</> : 'Create Account'}
                </button>
              </form>

              <p className="auth__switch">
                Already have an account?{' '}
                <button className="auth__link" onClick={() => go('visitor')}>Sign in</button>
              </p>
            </div>
          )}

          {/* ADMIN LOGIN */}
          {view === 'admin-login' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('select')}>
                <ArrowLeft size={14}/>Back
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
                  autoComplete="current-password" error={ale.password}/>
                <div className="auth__row">
                  <button type="button" className="auth__link" onClick={() => go('forgot')}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Signing in...</> : 'Sign In'}
                </button>
              </form>

              <p className="auth__switch">
                New admin?{' '}
                <button className="auth__link" onClick={() => go('admin-register')}>Create account</button>
              </p>
            </div>
          )}

          {/* ADMIN REGISTER */}
          {view === 'admin-register' && (
            <div className="auth__section anim-fade-up">
              <button className="auth__back" onClick={() => go('admin-login')}>
                <ArrowLeft size={14}/>Back to sign in
              </button>
              <div className="auth__hd">
                <h2>Create Admin Account</h2>
                <p>Register as a library administrator.</p>
              </div>

              <form onSubmit={handleAdminRegister} noValidate>
                <Field label="Full name" icon={User} error={are.name}>
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
                  autoComplete="new-password" error={are.password}/>
                <StrengthBar pw={arf.password}/>
                <PwField label="Confirm password"
                  value={arf.confirm}
                  onChange={e => setArf(f => ({...f, confirm: e.target.value}))}
                  placeholder="Re-enter password"
                  autoComplete="new-password" error={are.confirm}/>
                <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                  {loading ? <><span className="btn-spin"/>Creating...</> : 'Create Account'}
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
              {forgotOk ? (
                <div className="sent-box">
                  <div className="sent-box__icon">
                    <CheckCircle size={32} strokeWidth={1.5}/>
                  </div>
                  <h2>Check your inbox</h2>
                  <p>We sent a reset link to <strong>{fe}</strong>.</p>
                  <p className="sent-box__hint">Check your spam folder if it does not appear.</p>
                  <button className="btn btn--ghost btn--full"
                    onClick={() => { setForgotOk(false); setFe(''); }}>
                    Try a different email
                  </button>
                  <button className="auth__link auth__link--block" onClick={() => go('admin-login')}>
                    Back to sign in
                  </button>
                </div>
              ) : (
                <div>
                  <button className="auth__back" onClick={() => go('admin-login')}>
                    <ArrowLeft size={14}/>Back to sign in
                  </button>
                  <div className="auth__hd">
                    <h2>Reset Password</h2>
                    <p>Enter your email and we will send a reset link.</p>
                  </div>
                  <form onSubmit={handleForgot} noValidate>
                    <Field label="Email address" icon={Mail} error={null}>
                      <input type="email" className="lf__input"
                        placeholder="your@email.com"
                        value={fe} onChange={e => setFe(e.target.value)}
                        autoComplete="email"/>
                    </Field>
                    <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                      {loading ? <><span className="btn-spin"/>Sending...</> : 'Send Reset Link'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          <footer className="auth__footer">
            &copy; {new Date().getFullYear()} New Era University &middot; Library Services
          </footer>
        </div>
      </main>
    </div>
  );
}