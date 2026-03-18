/**
 * AdminLayout.jsx — Sidebar layout for admins
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../firebase/auth';
import { LayoutDashboard, Users, List, BarChart2, Settings, LogOut, Menu, X } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './AdminLayout.css';

const NAV = [
  { to:'/admin',          label:'Dashboard', icon:LayoutDashboard, end:true },
  { to:'/admin/users',    label:'Users',     icon:Users },
  { to:'/admin/logs',     label:'Visit Logs',icon:List  },
  { to:'/admin/reports',  label:'Reports',   icon:BarChart2 },
  { to:'/admin/settings', label:'Settings',  icon:Settings },
];

export default function AdminLayout() {
  const { user, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Signed out.');
    navigate('/login');
  };

  const name = profile?.displayName || user?.displayName || 'Admin';

  return (
    <div className={`al${collapsed ? ' al--collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="al__sidebar">
        <div className="al__sidebar-top">
          <div className="al__brand">
            <div className="al__brand-icon"><img src="/images/LibraGateNEU.png" alt="LibraGate NEU" style={{width:22,height:22,objectFit:"contain"}}/></div>
            {!collapsed && <span className="al__brand-name">LibraGate NEU</span>}
          </div>
          <button className="al__collapse-btn" onClick={() => setCollapsed(v => !v)} title="Toggle sidebar">
            {collapsed ? <Menu size={15} /> : <X size={15} />}
          </button>
        </div>

        <nav className="al__nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `al__link${isActive ? ' al__link--active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="al__link-icon"><Icon size={16} /></span>
              {!collapsed && <span className="al__link-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="al__sidebar-foot">
          <div className="al__user">
            <div className="al__user-avatar" style={{ background: getAvatarColor(name) }}>
              <span>{getInitials(name)}</span>
            </div>
            {!collapsed && (
              <div className="al__user-info">
                <div className="al__user-name">{name}</div>
                <div className="al__user-role">Administrator</div>
              </div>
            )}
          </div>
          <button className="al__logout" onClick={handleLogout} title="Sign out">
            <LogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="al__body">
        <Outlet />
      </div>
    </div>
  );
}