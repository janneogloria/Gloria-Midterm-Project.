/**
 * AdminDashboard.jsx
 * Stats cards + active visitors list + college breakdown
 */
import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, subscribeToActiveVisitors } from '../../firebase/firestore';
import { COLLEGE_COLORS, formatTime, getInitials, getAvatarColor } from '../../utils/helpers';
import { Users, CalendarDays, CalendarRange, BarChart2, TrendingUp, RefreshCw } from 'lucide-react';
import './AdminDashboard.css';
import LibraryCarousel from '../../components/ui/LibraryCarousel';

function StatCard({ label, value, icon: Icon, color, delay }) {
  return (
    <div className={`adc__stat card anim-fade-up delay-${delay}`} style={{'--accent':color}}>
      <div className="adc__stat-icon"><Icon size={18} /></div>
      <div className="adc__stat-val">{value ?? <span className="skeleton" style={{width:40,height:28,display:'inline-block'}} />}</div>
      <div className="adc__stat-label">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [active,  setActive]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const s = await fetchDashboardStats();
      setStats(s);
    } finally { setRefreshing(false); }
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const unsub = subscribeToActiveVisitors(setActive); return unsub; }, []);

  const refresh = () => { setRefreshing(true); loadStats(); };

  const colleges = stats?.byCollege
    ? Object.entries(stats.byCollege).sort((a,b) => b[1]-a[1])
    : [];

  const maxCollege = colleges[0]?.[1] || 1;

  return (
    <div className="adc">
      <div className="adc__page-head anim-fade-up">
        <div>
          <h1>Dashboard</h1>
          <p>Library visitor overview — real-time</p>
        </div>
        <button className={`adc__refresh${refreshing ? ' adc__refresh--spin' : ''}`} onClick={refresh} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="adc__stats">
        <StatCard label="Active now"     value={active.length}  icon={Users}       color="#16a34a" delay={1} />
        <StatCard label="Today"          value={stats?.today}   icon={CalendarDays} color="#2d3a8c" delay={2} />
        <StatCard label="This week"      value={stats?.week}    icon={CalendarRange} color="#0284c7" delay={3} />
        <StatCard label="This month"     value={stats?.month}   icon={BarChart2}   color="#e8a020" delay={4} />
      </div>

      <div className="adc__body">
        {/* Active visitors */}
        <div className="card adc__active anim-fade-up delay-2">
          <div className="adc__panel-head">
            <span className="live-dot" />
            Active visitors
            <span className="badge badge--green">{active.length}</span>
          </div>
          {active.length === 0 ? (
            <div className="adc__empty">No visitors currently inside.</div>
          ) : (
            <div className="adc__active-list">
              {active.map(v => (
                <div key={v.id} className="adc__visitor">
                  <div className="adc__visitor-av" style={{ background: getAvatarColor(v.name) }}>
                    {v.photoURL
                      ? <img src={v.photoURL} alt={v.name} referrerPolicy="no-referrer" />
                      : getInitials(v.name)
                    }
                  </div>
                  <div className="adc__visitor-info">
                    <div className="adc__visitor-name">{v.name}</div>
                    <div className="adc__visitor-meta">{v.purpose} · {v.college}</div>
                  </div>
                  <div className="adc__visitor-time">{formatTime(v.timeIn)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* College breakdown */}
        <div className="card adc__colleges anim-fade-up delay-3">
          <div className="adc__panel-head">
            <TrendingUp size={14} />
            Visits by College <span className="adc__panel-sub">(this month)</span>
          </div>
          {colleges.length === 0 ? (
            <div className="adc__empty">No data yet.</div>
          ) : (
            <div className="adc__college-list">
              {colleges.map(([college, count]) => (
                <div key={college} className="adc__college-row">
                  <div className="adc__college-name" title={college}>{college}</div>
                  <div className="adc__college-bar-wrap">
                    <div
                      className="adc__college-bar"
                      style={{ width:`${(count/maxCollege)*100}%`, background: COLLEGE_COLORS[college] || 'var(--navy-light)' }}
                    />
                  </div>
                  <div className="adc__college-count">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Library carousel */}
      <div className="adc__carousel-wrap anim-fade-up delay-4">
        <div className="adc__carousel-head">
          <span>📸 Library Gallery</span>
        </div>
        <LibraryCarousel className="adc__carousel"/>
      </div>
    </div>
  );
}