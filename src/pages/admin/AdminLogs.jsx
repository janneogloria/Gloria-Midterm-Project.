/**
 * AdminLogs.jsx — Visit log with single "Log Time" field.
 * No time-in / time-out / duration columns.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToLogs } from '../../firebase/firestore';
import { formatDate, formatTime, PURPOSE_ICONS, toDate, COLLEGES, PURPOSES } from '../../utils/helpers';
import { Search, X, List, Calendar, Filter } from 'lucide-react';
import './AdminLogs.css';

const VISITOR_TYPES = ['All', 'Student', 'Faculty / Staff', 'Visitor'];

export default function AdminLogs() {
  const [logs,    setLogs]    = useState([]);
  const [query,   setQuery]   = useState('');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCollege, setFilterCollege] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [filterType,    setFilterType]    = useState('All');

  useEffect(() => {
    const unsub = subscribeToLogs(data => { setLogs(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return logs.filter(l => {
      if (q && !(
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.college?.toLowerCase().includes(q) ||
        l.purpose?.toLowerCase().includes(q)
      )) return false;
      const d = toDate(l.createdAt);
      if (from && !(d && d >= new Date(from + 'T00:00:00'))) return false;
      if (to   && !(d && d <= new Date(to   + 'T23:59:59'))) return false;
      if (filterCollege && l.college !== filterCollege) return false;
      if (filterPurpose && l.purpose !== filterPurpose) return false;
      if (filterType !== 'All') {
        const t = l.visitorType || (l.yearLevel === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student');
        if (t !== filterType) return false;
      }
      return true;
    });
  }, [logs, query, from, to, filterCollege, filterPurpose, filterType]);

  const hasFilters = query || from || to || filterCollege || filterPurpose || filterType !== 'All';
  const clearAll   = () => { setQuery(''); setFrom(''); setTo(''); setFilterCollege(''); setFilterPurpose(''); setFilterType('All'); };

  return (
    <div className="al-page">
      <div className="al-page__head anim-fade-up">
        <div>
          <h1><List size={20}/>Visit Logs</h1>
          <p>All recorded library visits</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button
            className={`al-filter-btn${showFilters?' al-filter-btn--active':''}`}
            onClick={() => setShowFilters(f=>!f)}>
            <Filter size={13}/>
            {hasFilters ? 'Filtered' : 'Filter'}
            {hasFilters && <span className="al-filter-dot"/>}
          </button>
          <span className="badge badge--navy">{filtered.length} / {logs.length}</span>
        </div>
      </div>

      {/* Search + date */}
      <div className="al-page__filters card anim-fade-up delay-1">
        <div className="al-page__search">
          <Search size={14} className="al-page__search-icon"/>
          <input className="al-page__search-input"
            placeholder="Search name, email, college, purpose…"
            value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button className="al-page__clear-q" onClick={() => setQuery('')}><X size={12}/></button>}
        </div>
        <div className="al-page__dates">
          <div className="al-page__date-field">
            <Calendar size={13}/>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="al-page__date-input"/>
          </div>
          <span className="al-page__date-sep">to</span>
          <div className="al-page__date-field">
            <Calendar size={13}/>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="al-page__date-input"/>
          </div>
          {hasFilters && <button className="al-page__clear-all" onClick={clearAll}><X size={13}/>Clear all</button>}
        </div>
      </div>

      {/* Dropdown filters */}
      {showFilters && (
        <div className="al-dropdown-filters card anim-fade-up">
          <div className="al-dropdown-filters__inner">
            <div className="al-filter-group">
              <label>College</label>
              <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
                <option value="">All colleges</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="al-filter-group">
              <label>Purpose</label>
              <select value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}>
                <option value="">All purposes</option>
                {PURPOSES.map(p => <option key={p} value={p}>{PURPOSE_ICONS[p]} {p}</option>)}
              </select>
            </div>
            <div className="al-filter-group">
              <label>Visitor Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                {VISITOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="al-page__loading">Loading logs…</div>
      ) : filtered.length === 0 ? (
        <div className="al-page__empty card"><List size={32}/><p>No logs found.</p></div>
      ) : (
        <div className="al-page__table-wrap card anim-fade-up delay-2">
          <table className="al-page__table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Type</th>
                <th>College</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Log Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const vt = l.visitorType || (l.yearLevel === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student');
                return (
                  <tr key={l.id} className={`anim-fade-up delay-${Math.min(i+1,5)}`}>
                    <td>
                      <div className="al-page__name">{l.name}</div>
                      <div className="al-page__email">{l.email}</div>
                    </td>
                    <td>
                      <span className={`al-type-tag al-type-tag--${vt.replace(/\s\/\s/,'-').toLowerCase().replace(/\s/g,'-')}`}>
                        {vt === 'Faculty / Staff' ? '👩‍🏫' : vt === 'Student' ? '🎓' : '🏛️'} {vt}
                      </span>
                    </td>
                    <td><span className="al-page__college">{l.college || '—'}</span></td>
                    <td><span className="al-page__purpose">{PURPOSE_ICONS[l.purpose]} {l.purpose}</span></td>
                    <td><span className="al-page__date">{formatDate(l.createdAt)}</span></td>
                    <td><span className="al-page__time">{formatTime(l.createdAt)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}