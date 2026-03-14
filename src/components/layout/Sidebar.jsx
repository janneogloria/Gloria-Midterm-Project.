/**
 * Sidebar.jsx — Admin layout shell
 * The sidebar is rendered OUTSIDE the page transition wrapper
 * so it is never affected by transform/opacity animations.
 */
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ClipboardList, Users,
  BarChart2, Settings, LogOut, ChevronLeft, Menu, X,
} from 'lucide-react';
import { exitAndNavigate } from '../../utils/transitions';
import './Sidebar.css';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/admin/logs',      icon: ClipboardList,   label: 'Visit Logs' },
  { to: '/admin/users',     icon: Users,           label: 'Users'      },
  { to: '/admin/reports',   icon: BarChart2,       label: 'Reports'    },
  { to: '/admin/settings',  icon: Settings,        label: 'Settings'   },
];

/* Content area with its own enter animation — sidebar is NOT included */
function ContentArea({ children }) {
  const location = useLocation();
  return (
    <div className="sl-content-enter" key={location.pathname}>
      {children}
    </div>
  );
}

export default function Sidebar({ children }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Signed out.');
    exitAndNavigate(navigate, '/login', { replace: true });
  };

  const name     = user?.displayName || profile?.displayName || 'Admin';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`sl-layout${collapsed ? ' sl-collapsed' : ''}${mobileOpen ? ' sl-mobile-open' : ''}`}>

      {/* Mobile overlay */}
      <div className="sl-overlay" onClick={() => setMobileOpen(false)}/>

      {/* ── SIDEBAR — position:fixed, never inside any animated wrapper ── */}
      <aside className="sl-sidebar">

        {/* Head */}
        <div className="sl-head">
          {collapsed ? (
            <button className="sl-collapse-btn" onClick={() => setCollapsed(false)} title="Expand sidebar">
              <ChevronLeft size={16}/>
            </button>
          ) : (
            <>
              <div className="sl-brand">
                <div className="sl-brand-icon">
                  <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
                </div>
                <span className="sl-brand-name">LibraGate NEU</span>
              </div>
              <button className="sl-collapse-btn desktop-only" onClick={() => setCollapsed(true)} title="Collapse sidebar">
                <ChevronLeft size={16}/>
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="sl-nav">
          <div className="sl-nav-label">Navigation</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              data-label={label}
              className={({ isActive }) => `sl-item${isActive ? ' sl-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={17} className="sl-item-icon"/>
              <span className="sl-item-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sl-foot">
          <div className="sl-user">
            <div className="sl-user-avatar" title={name}>{initials}</div>
            <div className="sl-user-info">
              <div className="sl-user-name">{name}</div>
              <div className="sl-user-role">Administrator</div>
            </div>
          </div>
          <button className="sl-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={15}/>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT — animated independently from sidebar ── */}
      <div className="sl-main">
        {/* NEU logo watermark */}
        <div style={{
          position: 'fixed',
          right: '-40px', bottom: '-40px',
          width: '420px', height: '420px',
          backgroundImage: "url('/images/neu-logo.png')",
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.045,
          pointerEvents: 'none',
          zIndex: 0,
        }}/>

        {/* Mobile topbar */}
        <header className="sl-topbar">
          <button className="sl-menu-btn" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="sl-topbar-brand">
            <img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{ width: 20, height: 20, objectFit: 'contain' }}/>
            LibraGate NEU
          </div>
        </header>

        {/* Page content — only this part animates on route change */}
        <ContentArea>
          <main className="sl-content">{children}</main>
        </ContentArea>
      </div>
    </div>
  );
}