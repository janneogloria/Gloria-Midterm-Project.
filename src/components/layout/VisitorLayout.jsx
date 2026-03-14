/**
 * VisitorLayout.jsx — Topbar layout for visitors
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../firebase/auth';
import { BookOpen, Home, Clock, User, LogOut, Menu, X } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './VisitorLayout.css';

const NAV = [
  { to:'/visitor',         label:'Home',    icon:Home  },
  { to:'/visitor/history', label:'History', icon:Clock },
  { to:'/visitor/profile', label:'Profile', icon:User  },
];

export default function VisitorLayout() {
  const { user, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Signed out.');
    navigate('/login');
  };

  const name = profile?.name || user?.displayName || 'Visitor';
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);

  return (
    <div className="vl">
      {/* Topbar */}
      <header className="vl__bar">
        <div className="vl__bar-inner">
          <div className="vl__logo">
            <div className="vl__logo-icon"><img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{width:22,height:22,objectFit:"contain"}}/></div>
            <span className="vl__logo-name">LibraGate NEU</span>
          </div>

          <nav className="vl__nav">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to} to={to} end={to === '/visitor'}
                className={({ isActive }) => `vl__navlink${isActive ? ' vl__navlink--active' : ''}`}
              >
                <Icon size={14} />{label}
              </NavLink>
            ))}
          </nav>

          <div className="vl__right">
            <div className="vl__avatar" style={{ background: avatarColor }} title={name}>
              {user?.photoURL
                ? <img src={user.photoURL} alt={name} referrerPolicy="no-referrer" />
                : <span>{initials}</span>
              }
            </div>
            <button className="vl__logout" onClick={handleLogout} title="Sign out">
              <LogOut size={15} />
            </button>
            <button className="vl__hamburger" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="vl__mobile-menu anim-fade-in">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to==='/visitor'}
              className={({ isActive }) => `vl__mobile-link${isActive?' vl__mobile-link--active':''}`}
              onClick={() => setMenuOpen(false)}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
          <button className="vl__mobile-logout" onClick={handleLogout}><LogOut size={14} />Sign out</button>
        </div>
      )}

      {/* Page content */}
      <main className="vl__main">
        <Outlet />
      </main>
    </div>
  );
}