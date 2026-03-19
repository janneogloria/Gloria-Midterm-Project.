/**
 * hooks/useAuth.jsx
 * Auth context — resolves role from Firestore after Firebase auth.
 * Includes retry logic for newly-created accounts where the
 * Firestore document write may still be in-flight when
 * onAuthStateChanged fires.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { resolveRole, checkRedirectResult } from '../firebase/auth';

const AuthContext = createContext(null);

async function resolveRoleWithRetry(uid, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await resolveRole(uid);
    if (result.role !== null) return result;
    if (attempt < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  return { role: null, profile: null };
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(undefined);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect-based Google sign-in (triggered when browser blocks popup).
    // This runs once on mount and processes any pending redirect result.
    checkRedirectResult().catch(() => {/* ignore — no redirect pending */});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null); setRole(null); setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      try {
        const { role: r, profile: p } = await resolveRoleWithRetry(firebaseUser.uid);
        setRole(r); setProfile(p);
      } catch {
        setRole(null); setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);