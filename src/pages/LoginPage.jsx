import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle, loginUser, resetPassword } from '../firebase/auth';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Users, Shield, Sparkles } from 'lucide-react';
import './LoginPage.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

function PwField({ label, value, onChange, autoComplete, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`lp-field${error ? ' lp-field--err' : ''}`}>
      <label>{label}</label>
      <div className="lp-field__wrap">
        <Lock size={14} className="lp-field__icon" />
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
          placeholder="••••••••" autoComplete={autoComplete}
          className="lp-field__input lp-field__input--pr" />
        <button type="button" className="lp-field__eye" onClick={() => setShow(v => !v)} tabIndex={-1}>
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {error && <span className="lp-field__err">{error}</span>}
    </div>
  );
}

export default function LoginPage() {
  const [mode,       setMode]       = useState('visitor');
  const [subView,    setSubView]    = useState('login');
  const [loading,    setLoading]    = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [adminForm,  setAdminForm]  = useState({ email: '', password: '' });
  const [adminErr,   setAdminErr]   = useState({});
  const [forgotEmail,setForgotEmail]= useState('');
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) navigate(role === 'admin' ? '/admin' : '/visitor', { replace: true });
  }, [user, role, navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome to NEU Library!');
      navigate('/visitor');
    } catch (err) {
      if (err.message === 'WRONG_DOMAIN') toast.error('Use your @neu.edu.ph Google account.');
      else if (err.message === 'BLOCKED')   toast.error('Your account has been blocked. Contact admin.');
      else if (err.code !== 'auth/popup-closed-by-user') toast.error('Sign-in failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleAdmin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!adminForm.email)    errs.email    = 'Email is required.';
    if (!adminForm.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) return setAdminErr(errs);
    setAdminErr({}); setLoading(true);
    try {
      await loginUser(adminForm.email, adminForm.password);
      toast.success('Welcome back, Admin!');
      navigate('/admin');
    } catch (err) {
      const c = err.code;
      if (c==='auth/user-not-found'||c==='auth/wrong-password'||c==='auth/invalid-credential')
        setAdminErr({ password: 'Incorrect email or password.' });
      else if (c==='auth/too-many-requests') toast.error('Too many attempts. Try again later.');
      else toast.error('Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Enter your email.');
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) return toast.error('Enter a valid email.');
    setLoading(true);
    try { await resetPassword(forgotEmail); setForgotDone(true); }
    catch { toast.error('Could not send reset email.'); }
    finally { setLoading(false); }
  };

  const switchMode = (m) => { setMode(m); setAdminErr({}); setSubView('login'); setForgotDone(false); };

  return (
    <div className="lp">
      <aside className="lp__panel">
        <div className="lp__panel-inner">
          <div className="lp__brand">
            <div className="lp__brand-icon"><img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{width:26,height:26,objectFit:"contain"}}/></div>
            <div>
              <div className="lp__brand-name">LibraGate NEU</div>
              <div className="lp__brand-sub">New Era University</div>
            </div>
          </div>
          <div className="lp__hero anim-fade-up delay-1">
            <h1 className="lp__hero-title">Your library,<br /><em>smarter.</em></h1>
            <p className="lp__hero-desc">A modern system for tracking visits, managing records, and understanding how students use the library — in real time.</p>
          </div>
          <div className="lp__stats anim-fade-up delay-2">
            {[{icon:Users,label:'Visitors tracked',value:'Real-time'},{icon:Shield,label:'Role-based access',value:'Secured'},{icon:Sparkles,label:'Analytics',value:'Instant'}].map(({icon:Icon,label,value})=>(
              <div key={label} className="lp__stat">
                <div className="lp__stat-icon"><Icon size={14} /></div>
                <div><div className="lp__stat-val">{value}</div><div className="lp__stat-label">{label}</div></div>
              </div>
            ))}
          </div>
          <p className="lp__panel-foot"><CheckCircle size={11} /> Secured with Firebase Authentication</p>
        </div>
        <div className="lp__ring lp__ring--1" /><div className="lp__ring lp__ring--2" /><div className="lp__ring lp__ring--3" />
      </aside>

      <main className="lp__main">
        <div className="lp__form-wrap">
          <div className="lp__tabs">
            <button className={`lp__tab${mode==='visitor'?' lp__tab--active':''}`} onClick={()=>switchMode('visitor')}><Users size={14} />Student / Visitor</button>
            <button className={`lp__tab${mode==='admin'?' lp__tab--active':''}`}   onClick={()=>switchMode('admin')}><Shield size={14} />Administrator</button>
            <div className={`lp__tab-indicator${mode==='admin'?' lp__tab-indicator--right':''}`} />
          </div>

          {mode==='visitor' && (
            <div className="lp__form anim-scale-in" key="visitor">
              <header className="lp__form-head">
                <h2>Welcome, student!</h2>
                <p>Sign in with your NEU Google account to log your visit.</p>
              </header>
              <div className="lp__google-area">
                <div className="lp__google-badge">@neu.edu.ph only</div>
                <button className={`lp__google-btn${loading?' lp__google-btn--loading':''}`} onClick={handleGoogle} disabled={loading}>
                  {loading ? <span className="lp__spinner" /> : <><GoogleIcon /><span>Continue with Google</span></>}
                </button>
                <p className="lp__google-note">First time? Your profile will be created automatically.</p>
              </div>
              <div className="lp__purpose-preview">
                <div className="lp__purpose-head">After signing in, you'll select your purpose:</div>
                <div className="lp__purpose-chips">
                  {['📖 Reading','🔬 Researching','📝 Studying','💻 Using a Computer'].map(p=>(
                    <span key={p} className="lp__chip">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode==='admin' && subView==='login' && (
            <div className="lp__form anim-scale-in" key="admin-login">
              <header className="lp__form-head">
                <h2>Admin sign in</h2>
                <p>Access the library management dashboard.</p>
              </header>
              <form onSubmit={handleAdmin} noValidate>
                <div className={`lp-field${adminErr.email?' lp-field--err':''}`}>
                  <label>Email address</label>
                  <div className="lp-field__wrap">
                    <Mail size={14} className="lp-field__icon" />
                    <input type="email" className="lp-field__input" placeholder="admin@neu.edu.ph"
                      value={adminForm.email} onChange={e=>setAdminForm(f=>({...f,email:e.target.value}))} autoComplete="email" />
                  </div>
                  {adminErr.email && <span className="lp-field__err">{adminErr.email}</span>}
                </div>
                <PwField label="Password" value={adminForm.password} onChange={e=>setAdminForm(f=>({...f,password:e.target.value}))} autoComplete="current-password" error={adminErr.password} />
                <div className="lp__row"><button type="button" className="lp__link" onClick={()=>setSubView('forgot')}>Forgot password?</button></div>
                <button className="lp__submit" type="submit" disabled={loading}>
                  {loading ? <><span className="lp__spinner" />Signing in…</> : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {mode==='admin' && subView==='forgot' && (
            <div className="lp__form anim-scale-in" key="forgot">
              {forgotDone ? (
                <div className="lp__sent">
                  <div className="lp__sent-icon"><CheckCircle size={28} strokeWidth={1.5} /></div>
                  <h2>Check your inbox</h2>
                  <p>A reset link was sent to <strong>{forgotEmail}</strong>.</p>
                  <button className="lp__submit lp__submit--ghost" onClick={()=>{setSubView('login');setForgotDone(false);setForgotEmail('');}}>Back to sign in</button>
                </div>
              ) : (
                <>
                  <button className="lp__back" onClick={()=>setSubView('login')}><ArrowLeft size={13} />Back</button>
                  <header className="lp__form-head"><h2>Reset password</h2><p>We'll email you a link to reset your password.</p></header>
                  <form onSubmit={handleForgot} noValidate>
                    <div className="lp-field">
                      <label>Email address</label>
                      <div className="lp-field__wrap">
                        <Mail size={14} className="lp-field__icon" />
                        <input type="email" className="lp-field__input" placeholder="admin@neu.edu.ph" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} autoComplete="email" />
                      </div>
                    </div>
                    <button className="lp__submit" type="submit" disabled={loading}>
                      {loading ? <><span className="lp__spinner" />Sending…</> : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
          <footer className="lp__foot">© {new Date().getFullYear()} New Era University · Library Services</footer>
        </div>
      </main>
    </div>
  );
}