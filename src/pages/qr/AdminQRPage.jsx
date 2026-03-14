/**
 * AdminQRPage.jsx — Auto-login page when admin QR is scanned
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodePayload } from '../../utils/qrToken';
import { consumeAdminQRToken } from '../../firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import './QRPage.css';

export default function AdminQRPage() {
  const { payload } = useParams();
  const navigate    = useNavigate();
  const [status, setStatus] = useState('scanning'); // scanning | logging-in | success | error
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
        setMessage('This QR code has expired. Please generate a new one from the Settings page.');
        return;
      }

      setStatus('logging-in');

      try {
        // Validate + consume token from Firestore
        const uid = await consumeAdminQRToken(decoded.token);

        // Get admin's email from Firestore admins collection
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (!adminSnap.exists()) throw new Error('Admin account not found.');

        // We cannot sign in without password via QR alone in client-side Firebase.
        // Instead we store a flag in Firestore and redirect to a special login handler.
        // The admin will be redirected to dashboard with the QR token verification done.
        // For full auto-login, a Firebase Cloud Function would be needed.
        // For now: redirect to login with a verified token param that pre-fills email.
        const adminEmail = adminSnap.data().email;
        setStatus('success');

        setTimeout(() => {
          navigate(`/login?qr_admin=${encoded}&email=${encodeURIComponent(adminEmail)}`, { replace: true });
        }, 1500);

      } catch (err) {
        setStatus('error');
        if (err.message === 'TOKEN_USED')
          setMessage('This QR code has already been used. Generate a new one.');
        else if (err.message === 'TOKEN_EXPIRED')
          setMessage('This QR code has expired. Please generate a new one.');
        else
          setMessage('Failed to authenticate. Please try again.');
      }
    };

    handle();
  }, [payload, navigate]);

  return (
    <div className="qrp qrp--admin-login">
      <div className="qrp__login-card">
        <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" className="qrp__login-logo"/>
        <div className="qrp__login-title">LibraGate NEU</div>
        <div className="qrp__login-sub">Administrator Access</div>

        {status === 'scanning' && (
          <div className="qrp__login-state">
            <div className="qrp__spinner"/>
            <span>Validating QR code...</span>
          </div>
        )}

        {status === 'logging-in' && (
          <div className="qrp__login-state">
            <div className="qrp__spinner"/>
            <span>Verifying credentials...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="qrp__login-state qrp__login-state--success">
            <div className="qrp__check">check</div>
            <span>Verified! Redirecting...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="qrp__login-state qrp__login-state--error">
            <div className="qrp__error-icon-sm">X</div>
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