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
import { resolveRole } from '../firebase/auth';

const AuthContext = createContext(null);

/**
 * Tries resolveRole up to `maxAttempts` times with exponential backoff.
 * Necessary because after createUserWithEmailAndPassword Firebase Auth
 * fires onAuthStateChanged immediately, but the Firestore doc written
 * in registerVisitor/registerAdmin may not be visible yet.
 */
async function resolveRoleWithRetry(uid, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await resolveRole(uid);
    if (result.role !== null) return result;          // found — done
    if (attempt < maxAttempts - 1) {
      // Wait with exponential backoff: 300ms, 600ms, 1200ms, 2400ms
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  // All retries exhausted — return null role (user will stay on login page)
  return { role: null, profile: null };
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(undefined); // undefined = not yet resolved
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const { role: r, profile: p } = await resolveRoleWithRetry(firebaseUser.uid);
        setRole(r);
        setProfile(p);
      } catch (err) {
        // BLOCKED error from resolveRole — user has been signed out
        setRole(null);
        setProfile(null);
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