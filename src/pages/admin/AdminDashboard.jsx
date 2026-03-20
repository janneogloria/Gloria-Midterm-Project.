/**
 * AdminDashboard.jsx
 * Stats cards + dropdown filters + college & purpose breakdown.
 * Active Visitors section removed per design update.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { fetchDashboardStats } from '../../firebase/firestore';
import { COLLEGE_COLORS, PURPOSES, PURPOSE_ICONS } from '../../utils/helpers';
import {
  CalendarDays, CalendarRange, BarChart2,
  TrendingUp, RefreshCw, SlidersHorizontal, X,
} from 'lucide-react';
import './AdminDashboard.css';
import LibraryCarousel from '../../components/ui/LibraryCarousel';

const EMPLOYMENT_STATUSES = ['All', 'Student', 'Faculty / Staff', 'Visitor'];
const FALLBACK_PURPOSES = [
  'Study', 'Research', 'Using a Computer', 'Borrowing Books',
  'Returning Books', 'Printing / Photocopying', 'Meeting / Group Work', 'Other',
];

function StatCard({ label, value, icon: Icon, color, delay, sub }) {
  return (
    <div className={`adc__stat card anim-fade-up delay-${delay}`} style={{ '--accent': color }}>
      <div className="adc__stat-icon"><Icon size={18} /></div>
      <div className="adc__stat-val">
        {value ?? <span className="skeleton" style={{ width: 40, height: 28, display: 'inline-block' }} />}
      </div>
      <div className="adc__stat-label">{label}</div>
      {sub && <div className="adc__stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [allLogs,    setAllLogs]    = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const [filterPurpose,    setFilterPurpose]    = useState('All');
  const [filterCollege,    setFilterCollege]    = useState('All');
  const [filterEmployment, setFilterEmployment] = useState('All');

  const loadStats = async () => {
    try {
      const s = await fetchDashboardStats();
      setAllLogs(s.allLogs || []);
    } finally { setRefreshing(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const refresh = () => { setRefreshing(true); loadStats(); };

  const hasFilter = filterPurpose !== 'All' || filterCollege !== 'All' || filterEmployment !== 'All';

  const clearFilters = () => {
    setFilterPurpose('All');
    setFilterCollege('All');
    setFilterEmployment('All');
  };

  const allPurposes = useMemo(() => {
    const fromData = new Set(allLogs.map(l => l.purpose).filter(Boolean));
    const merged   = new Set([...FALLBACK_PURPOSES, ...(PURPOSES || []), ...fromData]);
    return ['All', ...Array.from(merged)];
  }, [allLogs]);

  const collegeOptions = useMemo(() => {
    const cols = new Set(allLogs.map(l => l.college).filter(Boolean));
    return ['All', ...Array.from(cols).sort()];
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      if (filterPurpose !== 'All' && log.purpose !== filterPurpose) return false;
      if (filterCollege !== 'All' && log.college !== filterCollege) return false;
      if (filterEmployment !== 'All') {
        const vt = log.visitorType || log.yearLevel || '';
        if (filterEmployment === 'Faculty / Staff' && !vt.includes('Faculty')) return false;
        if (filterEmployment === 'Student' && (vt.includes('Faculty') || !vt)) return false;
        if (filterEmployment === 'Visitor' && (vt.includes('Faculty') || vt.includes('Student'))) return false;
      }
      return true;
    });
  }, [allLogs, filterPurpose, filterCollege, filterEmployment]);

  const filteredStats = useMemo(() => {
    const now        = new Date();
    const dayStart   = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    let today = 0, week = 0, month = 0, active = 0;
    const byCollege = {};
    const byPurpose = {};

    filteredLogs.forEach(d => {
      const t = d.createdAt?.toDate?.() || new Date(0);
      if (t >= dayStart)   today++;
      if (t >= weekStart)  week++;
      if (t >= monthStart) {
        month++;
        const c = d.college || 'Unknown';
        byCollege[c] = (byCollege[c] || 0) + 1;
        const p = d.purpose || 'Other';
        byPurpose[p] = (byPurpose[p] || 0) + 1;
      }
      if (d.status === 'in') active++;
    });

    return { today, week, month, active, byCollege, byPurpose };
  }, [filteredLogs]);

  const colleges = Object.entries(filteredStats.byCollege).sort((a, b) => b[1] - a[1]);
  const purposes = Object.entries(filteredStats.byPurpose).sort((a, b) => b[1] - a[1]);
  const maxCollege = colleges[0]?.[1] || 1;
  const maxPurpose = purposes[0]?.[1] || 1;

  return (
    <div className="adc">

      {/* ── Page header ── */}
      <div className="adc__page-head anim-fade-up">
        <div>
          <h1>Dashboard</h1>
          <p>Library visitor overview — real-time</p>
        </div>
        <div className="adc__head-actions">
          <button
            className={`adc__filter-btn${showFilter ? ' adc__filter-btn--active' : ''}`}
            onClick={() => setShowFilter(s => !s)}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasFilter && <span className="adc__filter-dot" />}
          </button>
          <button
            className={`adc__refresh${refreshing ? ' adc__refresh--spin' : ''}`}
            onClick={refresh} title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <div className="adc__filters anim-fade-up">
          <div className="adc__filters-inner">
            <div className="adc__filter-group">
              <label>Purpose of Visit</label>
              <select value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}>
                {allPurposes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="adc__filter-group">
              <label>College</label>
              <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
                {collegeOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adc__filter-group">
              <label>Employment Status</label>
              <select value={filterEmployment} onChange={e => setFilterEmployment(e.target.value)}>
                {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasFilter && (
              <button className="adc__filter-clear" onClick={clearFilters}>
                <X size={13} /> Clear
              </button>
            )}
          </div>
          {hasFilter && (
            <div className="adc__filter-active-label">
              Filtering by:
              {filterPurpose    !== 'All' && <span>Purpose: {filterPurpose}</span>}
              {filterCollege    !== 'All' && <span>College: {filterCollege}</span>}
              {filterEmployment !== 'All' && <span>Status: {filterEmployment}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="adc__stats">
        <StatCard label="Today"       value={filteredStats.today}  icon={CalendarDays}  color="#2d3a8c" delay={1} />
        <StatCard label="This Week"   value={filteredStats.week}   icon={CalendarRange} color="#0284c7" delay={2} />
        <StatCard label="This Month"  value={filteredStats.month}  icon={BarChart2}     color="#e8a020" delay={3} />
      </div>

      {/* ── Breakdown panels ── */}
      <div className="adc__body">

        <div className="card adc__colleges anim-fade-up delay-2">
          <div className="adc__panel-head">
            <TrendingUp size={14} />
            Visits by College
            <span className="adc__panel-sub">(this month{hasFilter ? ' · filtered' : ''})</span>
          </div>
          {colleges.length === 0 ? (
            <div className="adc__empty">No data for selected filters.</div>
          ) : (
            <div className="adc__college-list">
              {colleges.map(([college, count]) => (
                <div key={college} className="adc__college-row">
                  <div className="adc__college-name" title={college}>{college}</div>
                  <div className="adc__college-bar-wrap">
                    <div
                      className="adc__college-bar"
                      style={{
                        width: `${(count / maxCollege) * 100}%`,
                        background: COLLEGE_COLORS?.[college] || '#2d3a8c',
                      }}
                    />
                  </div>
                  <div className="adc__college-count">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card adc__purposes anim-fade-up delay-3">
          <div className="adc__panel-head">
            <BarChart2 size={14} />
            Visits by Purpose
            <span className="adc__panel-sub">(this month{hasFilter ? ' · filtered' : ''})</span>
          </div>
          {purposes.length === 0 ? (
            <div className="adc__empty">No data for selected filters.</div>
          ) : (
            <div className="adc__college-list">
              {purposes.map(([purpose, count]) => (
                <div key={purpose} className="adc__college-row">
                  <div className="adc__college-name" title={purpose}>
                    {PURPOSE_ICONS?.[purpose] || '📋'} {purpose}
                  </div>
                  <div className="adc__college-bar-wrap">
                    <div
                      className="adc__college-bar"
                      style={{ width: `${(count / maxPurpose) * 100}%`, background: '#0284c7' }}
                    />
                  </div>
                  <div className="adc__college-count">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Library carousel ── */}
      <div className="adc__carousel-wrap anim-fade-up delay-4">
        <div className="adc__carousel-head"><span>📸 Library Gallery</span></div>
        <LibraryCarousel className="adc__carousel" />
      </div>
    </div>
  );
}