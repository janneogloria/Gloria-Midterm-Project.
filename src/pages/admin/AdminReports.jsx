/**
 * AdminReports.jsx — Visitor analytics and summaries
 */
import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchLogsByRange } from '../../firebase/firestore';
import { COLLEGE_COLORS } from '../../utils/helpers';
import { BarChart2, Download, Calendar, TrendingUp } from 'lucide-react';
import './AdminReports.css';

const STAT_COLORS = ['#2d3a8c', '#0284c7', '#16a34a'];

export default function AdminReports() {
  const [stats,   setStats]   = useState(null);
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [range,   setRange]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchDashboardStats().then(setStats); }, []);

  const colleges = stats?.byCollege
    ? Object.entries(stats.byCollege).sort((a, b) => b[1] - a[1])
    : [];
  const max = colleges[0]?.[1] || 1;

  const handleRange = async (e) => {
    e.preventDefault();
    if (!from || !to) return;
    setLoading(true);
    try {
      const logs = await fetchLogsByRange(new Date(from), new Date(to));
      setRange(logs);
    } catch { } finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!range) return;
    const headers = ['Name', 'Email', 'College', 'Purpose', 'Time In', 'Time Out', 'Status'];
    const rows = range.map(r => [
      r.name, r.email, r.college, r.purpose,
      r.timeIn?.toDate?.().toLocaleString() || '',
      r.timeOut?.toDate?.().toLocaleString() || '',
      r.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `libralog-report-${from}-to-${to}.csv`;
    a.click();
  };

  const summaryCards = [
    { label: 'Today',      value: stats?.today },
    { label: 'This Week',  value: stats?.week  },
    { label: 'This Month', value: stats?.month },
  ];

  return (
    <div className="ar">

      {/* Header */}
      <div className="ar__head anim-fade-up">
        <div>
          <h1><BarChart2 size={22}/>Reports</h1>
          <p>Visitor analytics and summaries.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="ar__cards">
        {summaryCards.map(({ label, value }, i) => (
          <div
            key={label}
            className={`ar__card anim-fade-up delay-${i + 1}`}
            style={{ borderTop: `3px solid ${STAT_COLORS[i]}` }}
          >
            <div className="ar__card-val">{value ?? '—'}</div>
            <div className="ar__card-label">{label}</div>
          </div>
        ))}
      </div>

      {/* College breakdown */}
      <div className="ar__chart anim-fade-up delay-2">
        <div className="ar__chart-head">
          <TrendingUp size={15}/>
          Visits by College
          <span style={{ color: '#8a90b0', fontWeight: 400, fontSize: '.74rem' }}>(this month)</span>
        </div>

        {colleges.length === 0 ? (
          <div className="ar__empty">No data yet.</div>
        ) : (
          colleges.map(([college, count]) => (
            <div key={college} className="ar__row">
              <div className="ar__row-name" title={college}>{college}</div>
              <div className="ar__row-bar-wrap">
                <div
                  className="ar__row-bar"
                  style={{
                    width: `${(count / max) * 100}%`,
                    background: COLLEGE_COLORS[college] || '#2d3a8c',
                  }}
                />
              </div>
              <div className="ar__row-n">{count}</div>
            </div>
          ))
        )}
      </div>

      {/* Date range report */}
      <div className="ar__chart anim-fade-up delay-3">
        <div className="ar__chart-head">
          <Calendar size={15}/>
          Custom Date Range
        </div>

        <form onSubmit={handleRange} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
          {[['From', from, setFrom], ['To', to, setTo]].map(([lbl, val, setter]) => (
            <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.74rem', fontWeight: 600, color: '#374151' }}>{lbl}</label>
              <input
                type="date"
                value={val}
                onChange={e => setter(e.target.value)}
                style={{
                  height: 40, padding: '0 12px',
                  border: '1.5px solid #e2e6f3', borderRadius: 9,
                  fontSize: '.875rem', fontFamily: 'Poppins, sans-serif',
                  color: '#0f1420', outline: 'none',
                }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading || !from || !to}
            style={{
              height: 40, padding: '0 18px',
              background: '#2d3a8c', color: '#fff',
              border: 'none', borderRadius: 9,
              fontSize: '.875rem', fontWeight: 600,
              fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
              opacity: (!from || !to) ? .5 : 1,
              transition: 'opacity 150ms, transform 150ms',
            }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
          {range && (
            <button
              type="button"
              onClick={exportCSV}
              style={{
                height: 40, padding: '0 18px',
                background: '#fff', color: '#2d3a8c',
                border: '1.5px solid #c5caea', borderRadius: 9,
                fontSize: '.875rem', fontWeight: 600,
                fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 150ms',
              }}
            >
              <Download size={14}/> Export CSV
            </button>
          )}
        </form>

        {range && (
          <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: 8 }}>
            <strong style={{ color: '#0f1420' }}>{range.length}</strong> records found
            from <strong style={{ color: '#0f1420' }}>{from}</strong> to{' '}
            <strong style={{ color: '#0f1420' }}>{to}</strong>.
          </div>
        )}
      </div>

    </div>
  );
}