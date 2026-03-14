/**
 * components/auth/RoleRoute.jsx
 * Guards a route by role.
 * requiredRole: 'admin' | 'visitor'
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Spinner = () => (
  <div style={{
    minHeight:'100vh', display:'flex', alignItems:'center',
    justifyContent:'center', flexDirection:'column', gap:16,
    fontFamily:'Poppins, sans-serif', color:'var(--text-2)',
    background:'var(--bg)',
  }}>
    <div style={{
      width:36, height:36,
      border:'3px solid var(--border)',
      borderTopColor:'var(--primary-mid)',
      borderRadius:'50%',
      animation:'spin .7s linear infinite',
    }}/>
    <p style={{fontSize:'.875rem'}}>Loading…</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export default function RoleRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) return <Spinner />;

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role — redirect to their correct home
  if (role !== requiredRole) {
    if (role === 'admin')   return <Navigate to="/admin/dashboard" replace />;
    if (role === 'visitor') return <Navigate to="/visitor/home"    replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}