/**
 * App.jsx — Role-based routing with page transitions
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';

import Login        from './pages/Login';
import VisitorHome  from './pages/visitor/VisitorHome';
import Sidebar      from './components/layout/Sidebar';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogs      from './pages/admin/AdminLogs';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminReports   from './pages/admin/AdminReports';
import AdminSettings  from './pages/admin/AdminSettings';
import RoleRoute      from './components/auth/RoleRoute';
import PageTransition from './components/transitions/PageTransition';
import VisitorQRPage  from './pages/qr/VisitorQRPage';
import AdminQRPage    from './pages/qr/AdminQRPage';

import './styles/globals.css';
import './styles/animations.css';

function AdminLayout({ children }) {
  return (
    <RoleRoute requiredRole="admin">
      <Sidebar>{children}</Sidebar>
    </RoleRoute>
  );
}

/* Animated routes:
   - Login + Visitor pages use PageTransition (full-page fade)
   - Admin pages do NOT use PageTransition — Sidebar.jsx handles
     its own content animation so the fixed sidebar is never
     inside an animated wrapper (which would break position:fixed) */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      {/* Public + Visitor — wrapped in PageTransition */}
      <Route path="/login" element={
        <PageTransition key="login"><Login /></PageTransition>
      }/>
      <Route path="/register" element={
        <PageTransition key="register"><Login initialTab="admin-register" /></PageTransition>
      }/>
      <Route path="/visitor/home" element={
        <PageTransition key="visitor">
          <RoleRoute requiredRole="visitor"><VisitorHome /></RoleRoute>
        </PageTransition>
      }/>
      {/* Admins can also access kiosk via /kiosk */}
      <Route path="/kiosk" element={
        <PageTransition key="kiosk">
          <RoleRoute requiredRole="visitor"><VisitorHome /></RoleRoute>
        </PageTransition>
      }/>

      {/* Admin — NO PageTransition, Sidebar handles its own animation */}
      <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/logs"      element={<AdminLayout><AdminLogs      /></AdminLayout>} />
      <Route path="/admin/users"     element={<AdminLayout><AdminUsers     /></AdminLayout>} />
      <Route path="/admin/reports"   element={<AdminLayout><AdminReports   /></AdminLayout>} />
      <Route path="/admin/settings"  element={<AdminLayout><AdminSettings  /></AdminLayout>} />

      {/* Public QR scan pages — no auth required */}
      <Route path="/qr/visitor/:payload" element={<VisitorQRPage />} />
      <Route path="/qr/admin/:payload"   element={<AdminQRPage />} />

      {/* Redirects */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/logs"      element={<Navigate to="/admin/logs"      replace />} />
      <Route path="*"          element={<Navigate to="/login"           replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.875rem',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,.14)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
              style: { borderLeft: '3px solid #22c55e' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: { borderLeft: '3px solid #ef4444' },
            },
          }}
        />
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}