/**
 * AdminLogs.jsx — All visit logs with search + date filter
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToLogs } from '../../firebase/firestore';
import { formatDate, formatTime, calcDuration, PURPOSE_ICONS, toDate } from '../../utils/helpers';
import { Search, X, List, Calendar } from 'lucide-react';
import './AdminLogs.css';

export default function AdminLogs() {
  const [logs,    setLogs]    = useState([]);
  const [query,   setQuery]   = useState('');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToLogs(data => { setLogs(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return logs.filter(l => {
      const matchQ = !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.college?.toLowerCase().includes(q) || l.purpose?.toLowerCase().includes(q);
      const logDate = toDate(l.createdAt);
      const matchFrom = !from || (logDate && logDate >= new Date(from + 'T00:00:00'));
      const matchTo   = !to   || (logDate && logDate <= new Date(to   + 'T23:59:59'));
      return matchQ && matchFrom && matchTo;
    });
  }, [logs, query, from, to]);

  const clearFilters = () => { setQuery(''); setFrom(''); setTo(''); };

  return (
    <div className="al-page">
      <div className="al-page__head anim-fade-up">
        <div><h1><List size={20} />Visit Logs</h1><p>All recorded visitor entries.</p></div>
        <span className="badge badge--navy">{filtered.length} / {logs.length}</span>
      </div>

      {/* Filters */}
      <div className="al-page__filters card anim-fade-up delay-1">
        <div className="al-page__search">
          <Search size={14} className="al-page__search-icon" />
          <input
            className="al-page__search-input"
            placeholder="Search name, email, college, purpose…"
            value={query} onChange={e => setQuery(e.target.value)}
          />
          {query && <button className="al-page__clear-q" onClick={() => setQuery('')}><X size={12} /></button>}
        </div>
        <div className="al-page__dates">
          <div className="al-page__date-field">
            <Calendar size={13} />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="al-page__date-input" />
          </div>
          <span className="al-page__date-sep">to</span>
          <div className="al-page__date-field">
            <Calendar size={13} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="al-page__date-input" />
          </div>
          {(from || to || query) && <button className="al-page__clear-all" onClick={clearFilters}><X size={13} />Clear</button>}
        </div>
      </div>

      {loading ? (
        <div className="al-page__loading">Loading logs…</div>
      ) : filtered.length === 0 ? (
        <div className="al-page__empty card"><List size={32} color="var(--text-3)" /><p>No logs found.</p></div>
      ) : (
        <div className="al-page__table-wrap card anim-fade-up delay-2">
          <table className="al-page__table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>College</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} className={`anim-fade-up delay-${Math.min(i+1,6)}`}>
                  <td>
                    <div className="al-page__name">{l.name}</div>
                    <div className="al-page__email">{l.email}</div>
                  </td>
                  <td><span className="al-page__college">{l.college || '—'}</span></td>
                  <td><span className="al-page__purpose">{PURPOSE_ICONS[l.purpose]} {l.purpose}</span></td>
                  <td><span className="al-page__date">{formatDate(l.timeIn)}</span></td>
                  <td>{formatTime(l.timeIn)}</td>
                  <td>{l.timeOut ? formatTime(l.timeOut) : <span className="al-page__active">Active</span>}</td>
                  <td>{l.timeOut ? calcDuration(l.timeIn, l.timeOut) : '—'}</td>
                  <td><span className={`badge ${l.status==='in'?'badge--green':'badge--gray'}`}>{l.status==='in'?'In':'Out'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}