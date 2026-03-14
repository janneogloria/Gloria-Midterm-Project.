/**
 * VisitorQRPage.jsx — Public page when visitor QR is scanned
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { decodePayload } from '../../utils/qrToken';
import { fetchVisitorLogs } from '../../firebase/firestore';
import { formatDate, formatTime, calcDuration, PURPOSE_ICONS } from '../../utils/helpers';
import { BookOpen, Clock, CalendarDays, Timer, User } from 'lucide-react';
import './QRPage.css';

export default function VisitorQRPage() {
  const { payload } = useParams();
  const [data,    setData]    = useState(null);
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const decoded = decodePayload(payload);
    if (!decoded || decoded.type !== 'visitor') {
      setError('Invalid or unrecognized QR code.');
      setLoading(false);
      return;
    }
    setData(decoded);
    fetchVisitorLogs(decoded.uid)
      .then(setLogs)
      .catch(() => setError('Could not load visit records.'))
      .finally(() => setLoading(false));
  }, [payload]);

  if (loading) return (
    <div className="qrp qrp--loading">
      <div className="qrp__spinner"/>
      <span>Loading visit records...</span>
    </div>
  );

  if (error) return (
    <div className="qrp qrp--error">
      <div className="qrp__error-icon">warning</div>
      <h2>Invalid QR Code</h2>
      <p>{error}</p>
    </div>
  );

  const total     = logs.length;
  const completed = logs.filter(l => l.status === 'out').length;

  return (
    <div className="qrp">
      <div className="qrp__header">
        <div className="qrp__brand">
          <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" className="qrp__brand-logo"/>
          <div>
            <div className="qrp__brand-name">LibraGate NEU</div>
            <div className="qrp__brand-sub">New Era University Library</div>
          </div>
        </div>
      </div>

      <div className="qrp__profile">
        <div className="qrp__avatar">
          {(data.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="qrp__profile-info">
          <div className="qrp__profile-name">{data.name}</div>
          <div className="qrp__profile-email">{data.email}</div>
          <div className="qrp__profile-badge"><User size={11}/> Verified Visitor</div>
        </div>
      </div>

      <div className="qrp__stats">
        {[
          { label: 'Total Visits', val: total },
          { label: 'Completed',    val: completed },
          { label: 'In Progress',  val: total - completed },
        ].map(({ label, val }) => (
          <div key={label} className="qrp__stat">
            <div className="qrp__stat-val">{val}</div>
            <div className="qrp__stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="qrp__section">
        <div className="qrp__section-head"><Clock size={15}/> Visit History</div>
        {logs.length === 0 ? (
          <div className="qrp__empty">
            <BookOpen size={28} strokeWidth={1.2}/>
            <p>No visits recorded yet.</p>
          </div>
        ) : (
          <div className="qrp__logs">
            {logs.map(log => (
              <div key={log.id} className="qrp__log">
                <div className="qrp__log-icon">{PURPOSE_ICONS[log.purpose] || 'note'}</div>
                <div className="qrp__log-body">
                  <div className="qrp__log-purpose">{log.purpose}</div>
                  <div className="qrp__log-meta">
                    <span><CalendarDays size={11}/>{formatDate(log.timeIn)}</span>
                    <span><Clock size={11}/>{formatTime(log.timeIn)}{log.timeOut ? ` - ${formatTime(log.timeOut)}` : ''}</span>
                    {log.timeOut && <span><Timer size={11}/>{calcDuration(log.timeIn, log.timeOut)}</span>}
                  </div>
                  <div className="qrp__log-college">{log.college}</div>
                </div>
                <span className={`qrp__log-status qrp__log-status--${log.status}`}>
                  {log.status === 'in' ? 'Inside' : 'Done'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="qrp__footer">
        {new Date().getFullYear()} New Era University - Library Services
      </div>
    </div>
  );
}