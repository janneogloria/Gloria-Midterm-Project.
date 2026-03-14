/**
 * QRModal.jsx
 * Beautiful modal that shows a user's QR code.
 * Visitor QR → links to their visit history
 * Admin QR   → one-time login token (regenerates on open)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, RefreshCw, Shield, User, QrCode } from 'lucide-react';
import QRCode from './QRCode';
import { makeVisitorQRData, makeAdminQRData } from '../../utils/qrToken';
import { createAdminQRToken } from '../../firebase/firestore';
import './QRModal.css';

export default function QRModal({ isOpen, onClose, user, role, profile }) {
  const [qrData,    setQrData]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 min in seconds

  const name  = profile?.name || profile?.displayName || user?.displayName || 'User';
  const email = user?.email || '';

  /* Generate QR data */
  const generate = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (role === 'visitor') {
        setQrData(makeVisitorQRData(user.uid, name, email));
        setCountdown(null); // visitor QR never expires
      } else if (role === 'admin') {
        const token = await createAdminQRToken(user.uid);
        setQrData(makeAdminQRData(user.uid, token));
        setCountdown(300); // reset 5-min countdown
      }
    } catch (err) {
      console.error('QR generation error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, role, name, email]);

  /* Generate on open */
  useEffect(() => {
    if (isOpen) generate();
  }, [isOpen, generate]);

  /* Countdown timer for admin QR */
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [countdown, qrData]);

  /* Download QR as PNG */
  const handleDownload = () => {
    const canvas = document.querySelector('.qrm__qr-wrap canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `libragate-qr-${role}-${user?.uid?.slice(0,8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  const mins = Math.floor((countdown || 0) / 60);
  const secs = (countdown || 0) % 60;
  const isExpired = countdown === 0;

  return (
    <div className="qrm__backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qrm__modal anim-slide-up">

        {/* Header */}
        <div className="qrm__header">
          <div className="qrm__header-left">
            <div className={`qrm__badge qrm__badge--${role}`}>
              {role === 'admin' ? <Shield size={14}/> : <User size={14}/>}
              {role === 'admin' ? 'Admin QR' : 'My QR Code'}
            </div>
            <div className="qrm__title">
              {role === 'visitor' ? 'Your Library QR Code' : 'Admin Login QR'}
            </div>
          </div>
          <button className="qrm__close" onClick={onClose}>
            <X size={18}/>
          </button>
        </div>

        {/* QR area */}
        <div className="qrm__body">
          <div className="qrm__qr-wrap">
            {loading ? (
              <div className="qrm__loading">
                <div className="qrm__spinner"/>
                <span>Generating…</span>
              </div>
            ) : isExpired ? (
              <div className="qrm__expired">
                <QrCode size={40} strokeWidth={1}/>
                <p>QR code expired</p>
                <button className="qrm__regen" onClick={generate}>
                  <RefreshCw size={14}/> Regenerate
                </button>
              </div>
            ) : (
              <>
                <div className="qrm__qr-frame">
                  <QRCode value={qrData} size={200} fgColor="#0f1b5c" bgColor="#ffffff"/>
                  {/* Corner decorations */}
                  <div className="qrm__corner qrm__corner--tl"/>
                  <div className="qrm__corner qrm__corner--tr"/>
                  <div className="qrm__corner qrm__corner--bl"/>
                  <div className="qrm__corner qrm__corner--br"/>
                </div>

                {/* Logo inside QR center — visual only */}
                <div className="qrm__qr-logo">
                  <img src="/images/LibraGateNEU.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }}/>
                </div>
              </>
            )}
          </div>

          {/* User info */}
          <div className="qrm__info">
            <div className="qrm__info-name">{name}</div>
            <div className="qrm__info-email">{email}</div>
            {role === 'visitor' && profile?.course && (
              <div className="qrm__info-meta">{profile.yearLevel} · {profile.course}</div>
            )}
          </div>

          {/* Description */}
          <div className={`qrm__desc qrm__desc--${role}`}>
            {role === 'visitor' ? (
              <>
                <QrCode size={15}/>
                <span>Scan to view your complete visit history at NEU Library</span>
              </>
            ) : (
              <>
                <Shield size={15}/>
                <span>Scan to log in as administrator — one-time use, valid for 5 minutes</span>
              </>
            )}
          </div>

          {/* Countdown for admin */}
          {role === 'admin' && countdown !== null && !isExpired && (
            <div className={`qrm__countdown${countdown <= 60 ? ' qrm__countdown--warn' : ''}`}>
              <div
                className="qrm__countdown-bar"
                style={{ width: `${(countdown / 300) * 100}%` }}
              />
              <span>Expires in {mins}:{secs.toString().padStart(2,'0')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="qrm__actions">
          <button className="qrm__btn qrm__btn--ghost" onClick={onClose}>
            Close
          </button>
          {!loading && !isExpired && (
            <button className="qrm__btn qrm__btn--download" onClick={handleDownload}>
              <Download size={15}/> Save QR
            </button>
          )}
          {role === 'admin' && (
            <button className="qrm__btn qrm__btn--regen" onClick={generate} disabled={loading}>
              <RefreshCw size={14}/> New Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}