import React, { useState, useEffect } from 'react';
import { registerAdmin } from '../../firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToProfileChangeRequests, approveProfileChange, denyProfileChange } from '../../firebase/firestore';
import toast from 'react-hot-toast';
import { Settings, UserPlus, Mail, Lock, User, Shield, CheckCircle, X, Bell } from 'lucide-react';
import QRModal from '../../components/ui/QRModal';
import './AdminSettings.css';

export default function AdminSettings() {
  const { user, profile } = useAuth();
  const [form,       setForm]       = useState({ name: '', email: '', password: '' });
  const [loading,    setLoading]    = useState(false);
  const [showQR,     setShowQR]     = useState(false);
  const [changeReqs, setChangeReqs] = useState([]);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    const unsub = subscribeToProfileChangeRequests(setChangeReqs);
    return unsub;
  }, []);

  const pendingReqs = changeReqs.filter(r => r.status === 'pending');

  const handleApprove = async (req) => {
    setProcessing(req.id);
    try {
      await approveProfileChange(req.id, req.uid, { newCollege: req.newCollege, newCourse: req.newCourse, newRole: req.newRole });
      toast.success(`Profile updated for ${req.name}.`);
    } catch { toast.error('Failed to approve.'); }
    finally { setProcessing(null); }
  };

  const handleDeny = async (req) => {
    setProcessing(req.id);
    try {
      await denyProfileChange(req.id);
      toast.success(`Request from ${req.name} denied.`);
    } catch { toast.error('Failed to deny.'); }
    finally { setProcessing(null); }
  };

  const handle = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password)
      return toast.error('All fields are required.');
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await registerAdmin(form.email, form.password, form.name);
      toast.success(`Admin account created for ${form.name}.`);
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use')
        toast.error('Email already registered.');
      else toast.error('Failed to create admin account.');
    } finally { setLoading(false); }
  };

  const adminName  = user?.displayName || profile?.displayName || 'Administrator';
  const adminEmail = user?.email || '—';
  const initials   = adminName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const fields = [
    { key: 'name',     label: 'Full Name',     type: 'text',     icon: User, placeholder: 'Juan Dela Cruz' },
    { key: 'email',    label: 'Email Address', type: 'email',    icon: Mail, placeholder: 'admin@neu.edu.ph' },
    { key: 'password', label: 'Password',      type: 'password', icon: Lock, placeholder: 'Min. 6 characters' },
  ];

  return (
    <div className="as">

      <div className="as__head anim-fade-up">
        <h1><Settings size={22}/>Settings</h1>
      </div>

      <div className="as__grid">

        {/* ── Current account ── */}
        <div className="as__section anim-fade-up delay-1">
          <div className="as__section-head">
            <Shield size={16}/> Current Account
          </div>

          <div className="as__account-hero">
            <div className="as__account-avatar">{initials}</div>
            <div style={{ flex: 1 }}>
              <div className="as__account-name">{adminName}</div>
              <div className="as__account-email">{adminEmail}</div>
              <div className="as__account-badge">
                <Shield size={9}/> Administrator
              </div>
            </div>
            {/* QR Code button */}
            <button className="as__qr-btn" onClick={() => setShowQR(true)} title="View Admin QR Code">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                <rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/>
                <rect x="18" y="18" width="3" height="3"/>
              </svg>
              <span>Admin QR</span>
            </button>
          </div>

          <div className="as__info-row">
            <span className="as__info-label">Name</span>
            <span className="as__info-value">{adminName}</span>
          </div>
          <div className="as__info-row">
            <span className="as__info-label">Email</span>
            <span className="as__info-value">{adminEmail}</span>
          </div>
          <div className="as__info-row">
            <span className="as__info-label">Role</span>
            <span className="as__info-value">Administrator</span>
          </div>

          {/* QR info note */}
          <div className="as__qr-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            Your Admin QR code provides secure one-time login access. It expires 5 minutes after generation.
          </div>
        </div>

        {/* ── Register new admin ── */}
        <div className="as__section anim-fade-up delay-2">
          <div className="as__section-head">
            <UserPlus size={16}/> Register New Admin
          </div>
          <p className="as__section-sub">
            Create a new administrator account. The user will be able to sign in
            immediately with these credentials.
          </p>

          <form onSubmit={handle} noValidate className="as__form">
            {fields.map(({ key, label, type, icon: Icon, placeholder }) => (
              <div key={key} className="as__field">
                <label>{label}</label>
                <div className="as__field-wrap">
                  <span className="as__field-icon"><Icon size={14}/></span>
                  <input
                    type={type}
                    className="as__input"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    autoComplete={type === 'password' ? 'new-password' : undefined}
                  />
                </div>
              </div>
            ))}
            <button className="as__submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : <><UserPlus size={15}/>Create Admin Account</>}
            </button>
          </form>
        </div>

      </div>

      {/* ── Profile Change Requests ── */}
      {changeReqs.length > 0 && (
        <div className="as__section as__section--full anim-fade-up delay-3" style={{marginTop: 24}}>
          <div className="as__section-head">
            <Bell size={16}/>
            Profile Change Requests
            {pendingReqs.length > 0 && (
              <span className="as__req-badge">{pendingReqs.length} pending</span>
            )}
          </div>

          {changeReqs.map(req => (
            <div key={req.id} className={`as__req-card as__req-card--${req.status}`}>
              <div className="as__req-top">
                <div>
                  <div className="as__req-name">{req.name}</div>
                  <div className="as__req-email">{req.email}</div>
                </div>
                <span className={`as__req-status as__req-status--${req.status}`}>
                  {req.status === 'pending' ? '⏳ Pending' : req.status === 'approved' ? '✅ Approved' : '❌ Denied'}
                </span>
              </div>

              <div className="as__req-changes">
                <div className="as__req-col">
                  <div className="as__req-col-label">Current</div>
                  <div>{req.currentCollege || '—'}</div>
                  <div>{req.currentCourse  || '—'}</div>
                  <div>{req.currentRole    || '—'}</div>
                </div>
                <div className="as__req-arrow">→</div>
                <div className="as__req-col as__req-col--new">
                  <div className="as__req-col-label">Requested</div>
                  <div>{req.newCollege}</div>
                  <div>{req.newCourse  || '—'}</div>
                  <div>{req.newRole}</div>
                </div>
              </div>

              {req.reason && (
                <div className="as__req-reason">💬 "{req.reason}"</div>
              )}

              {req.status === 'pending' && (
                <div className="as__req-actions">
                  <button className="as__req-btn as__req-btn--deny" onClick={() => handleDeny(req)} disabled={processing === req.id}>
                    <X size={13}/> Deny
                  </button>
                  <button className="as__req-btn as__req-btn--approve" onClick={() => handleApprove(req)} disabled={processing === req.id}>
                    {processing === req.id ? 'Processing…' : <><CheckCircle size={13}/> Approve</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin QR Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        user={user}
        role="admin"
        profile={profile}
      />
    </div>
  );
}