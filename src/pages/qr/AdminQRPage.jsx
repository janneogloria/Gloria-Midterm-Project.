/**
 * AdminQRPage.jsx
 * Shown when an admin QR code is scanned.
 * Validates the one-time token, then redirects to login
 * with the admin's email pre-filled for confirmation.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodePayload } from '../../utils/qrToken';
import { consumeAdminQRToken } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CheckCircle, XCircle } from 'lucide-react';
import './QRPage.css';

export default function AdminQRPage() {
  const { payload } = useParams();
  const navigate    = useNavigate();
  const [status,  setStatus]  = useState('scanning');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handle = async () => {
      const decoded = decodePayload(payload);

      if (!decoded || decoded.type !== 'admin') {
        setStatus('error');
        setMessage('Invalid or unrecognized admin QR code.');
        return;
      }

      if (Date.now() > decoded.exp) {
        setStatus('error');
        setMessage('This QR code has expired. Please generate a new one from Settings.');
        return;
      }

      setStatus('logging-in');

      try {
        const uid = await consumeAdminQRToken(decoded.token);

        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (!adminSnap.exists()) throw new Error('Admin account not found.');

        const adminEmail = adminSnap.data().email;
        setStatus('success');

        // Redirect to login with email pre-filled and a verified flag
        // Full passwordless login requires Firebase Admin SDK (server-side)
        // This flow confirms the QR is valid and pre-fills admin's email
        setTimeout(() => {
          navigate(
            `/login?qr_verified=1&email=${encodeURIComponent(adminEmail)}`,
            { replace: true }
          );
        }, 1500);

      } catch (err) {
        setStatus('error');
        if (err.message === 'TOKEN_USED')
          setMessage('This QR code has already been used. Please generate a new one.');
        else if (err.message === 'TOKEN_EXPIRED')
          setMessage('This QR code has expired. Please generate a new one.');
        else if (err.message === 'INVALID_TOKEN')
          setMessage('This QR code is invalid. Please generate a new one.');
        else
          setMessage('Verification failed. Please try again or sign in manually.');
      }
    };

    handle();
  }, [payload, navigate]);

  return (
    <div className="qrp qrp--admin-login">
      <div className="qrp__login-card">
        <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" className="qrp__login-logo"/>
        <div className="qrp__login-title">LibraGate NEU</div>
        <div className="qrp__login-sub">Administrator QR Access</div>

        {(status === 'scanning' || status === 'logging-in') && (
          <div className="qrp__login-state">
            <div className="qrp__spinner"/>
            <span>{status === 'scanning' ? 'Validating QR code…' : 'Verifying credentials…'}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="qrp__login-state qrp__login-state--success">
            <CheckCircle size={44} strokeWidth={1.5} color="#16a34a"/>
            <span>Verified! Redirecting to login…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="qrp__login-state qrp__login-state--error">
            <XCircle size={44} strokeWidth={1.5} color="#dc2626"/>
            <span>{message}</span>
            <button className="qrp__back-btn" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
