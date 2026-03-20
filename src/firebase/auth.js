/**
 * firebase/auth.js — LibraGate NEU
 *
 * Google Sign-In: uses popup with automatic redirect fallback.
 * "Tracking Prevention blocked access to storage" = browser blocking
 * third-party cookies in the popup. Solution: catch that error and
 * fall back to signInWithRedirect, which avoids the iframe entirely.
 *
 * jcesperanza@neu.edu.ph → auto-assigned admin on any sign-in method.
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const NEU_DOMAIN = '@neu.edu.ph';

// Add any professor / staff emails that should auto-become admin
export const ADMIN_EMAILS = [
  'jcesperanza@neu.edu.ph',
];

/* ── Shared: ensure Firestore docs are created/updated for a Google user ── */
async function handleGoogleUser(user) {
  const isAdminEmail = ADMIN_EMAILS.includes(user.email.toLowerCase());

  // Always ensure admin doc exists for whitelisted emails
  if (isAdminEmail) {
    const adminRef  = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: user.uid, email: user.email,
        displayName: user.displayName || '',
        role: 'admin', createdAt: serverTimestamp(),
      });
    }
  }

  const userRef  = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  let isNew = false;

  if (!userSnap.exists()) {
    isNew = true;
    await setDoc(userRef, {
      uid: user.uid, email: user.email,
      name: user.displayName || '', photoURL: user.photoURL || '',
      college: '', yearLevel: '',
      role: isAdminEmail ? 'admin' : 'visitor',
      blocked: false,
      createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
    });
  } else {
    const data = userSnap.data();
    if (data.blocked) { await signOut(auth); throw new Error('BLOCKED'); }
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
  }

  return { user, isNew };
}

/* ── Google Sign-In — popup with redirect fallback ─────────────────────── */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  // Force account picker so users can switch Google accounts easily
  provider.setCustomParameters({ prompt: 'select_account' });

  let result = null;

  try {
    result = await signInWithPopup(auth, provider);
  } catch (popupErr) {
    console.warn('Google popup error:', popupErr?.code, popupErr?.message);

    // User deliberately closed the popup — not an error, return null silently
    if (popupErr?.code === 'auth/popup-closed-by-user' ||
        popupErr?.code === 'auth/cancelled-popup-request') {
      return null;
    }

    // ── ROOT CAUSE: Google Sign-In provider DISABLED in Firebase Console ──
    // Fix: Firebase Console → Authentication → Sign-in method → Google → Enable
    if (popupErr?.code === 'auth/operation-not-allowed') {
      throw new Error('PROVIDER_DISABLED');
    }

    // ── localhost not in Firebase Authorized Domains ──
    // Fix: Firebase Console → Authentication → Settings → Authorized domains → Add localhost
    if (popupErr?.code === 'auth/unauthorized-domain') {
      throw new Error('UNAUTHORIZED_DOMAIN');
    }

    // Browser blocked the popup or storage (Edge Tracking Prevention, Safari ITP)
    const shouldRedirect =
      popupErr?.code === 'auth/popup-blocked' ||
      popupErr?.code === 'auth/web-storage-unsupported' ||
      popupErr?.code === 'auth/operation-not-supported-in-this-environment' ||
      popupErr?.code === 'auth/internal-error' ||
      popupErr?.message?.toLowerCase().includes('storage') ||
      popupErr?.message?.toLowerCase().includes('tracking') ||
      popupErr?.message?.toLowerCase().includes('cross-origin');

    if (shouldRedirect) {
      await signInWithRedirect(auth, provider);
      return null; // page navigates away; result handled by checkRedirectResult on return
    }

    // All other errors (network, misconfiguration, etc.) — re-throw for caller to handle
    throw popupErr;
  }

  if (!result) return null;

  const { user } = result;

  if (!user.email || !user.email.endsWith(NEU_DOMAIN)) {
    await signOut(auth);
    throw new Error('WRONG_DOMAIN');
  }

  return handleGoogleUser(user);
};

/* ── Check redirect result (call on app load after a redirect sign-in) ── */
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null; // no pending redirect

    const { user } = result;

    if (!user.email || !user.email.endsWith(NEU_DOMAIN)) {
      await signOut(auth);
      throw new Error('WRONG_DOMAIN');
    }

    return handleGoogleUser(user);
  } catch (err) {
    if (err.message === 'WRONG_DOMAIN') throw err;
    if (err.code === 'auth/no-auth-event') return null; // normal — no redirect pending
    throw err;
  }
};

/* ── Hidden system password (visitors never see this) ───────────────────── */
const systemPw = (email) => `LG-${email.split('@')[0]}-neu2024!`;

/* ── Visitor login — email only, password handled invisibly ─────────────── */
export const loginVisitor = async (email) => {
  const { user } = await signInWithEmailAndPassword(auth, email, systemPw(email));
  return user;
};

/* ── Admin login — always uses the real password typed by the user ───────── */
export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // Auto-promote whitelisted emails to admin
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    const adminRef  = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: user.uid, email: user.email,
        displayName: user.displayName || '',
        role: 'admin', createdAt: serverTimestamp(),
      });
    }
  }

  return user;
};

/* ── Visitor: register with email + name only (no password shown to user) ── */
export const registerVisitor = async (email, displayName) => {
  const password = systemPw(email); // hidden system password, user never sees it
  let firebaseUser;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = user;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Already registered — sign them in directly
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = user;
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) return firebaseUser;
    } else { throw err; }
  }

  await updateProfile(firebaseUser, { displayName });
  await setDoc(doc(db, 'users', firebaseUser.uid), {
    uid: firebaseUser.uid, email: firebaseUser.email,
    name: displayName, displayName, photoURL: '',
    college: '', yearLevel: '',
    role: 'visitor', blocked: false,
    createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
  });
  return firebaseUser;
};

/* ── Admin register ─────────────────────────────────────────────────────── */
export const registerAdmin = async (email, password, displayName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'admins', user.uid), {
    uid: user.uid, email, displayName, role: 'admin', createdAt: serverTimestamp(),
  });
  return user;
};
export const registerUser = registerAdmin;

/* ── Logout / Reset ─────────────────────────────────────────────────────── */
export const logoutUser    = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

/* ── Update visitor profile ─────────────────────────────────────────────── */
export const updateVisitorProfile = async (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

/* ── Role resolver ──────────────────────────────────────────────────────── */
export const resolveRole = async (uid) => {
  // 1. Check admins collection
  const adminSnap = await getDoc(doc(db, 'admins', uid));
  if (adminSnap.exists()) return { role: 'admin', profile: adminSnap.data() };

  // 2. Check users collection
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.blocked) { await signOut(auth); throw new Error('BLOCKED'); }

    // 3. Safety net: whitelist check in case Firestore write was missed
    if (data.email && ADMIN_EMAILS.includes(data.email.toLowerCase())) {
      const adminRef = doc(db, 'admins', uid);
      const adminCheck = await getDoc(adminRef);
      if (!adminCheck.exists()) {
        await setDoc(adminRef, {
          uid, email: data.email,
          displayName: data.name || data.displayName || '',
          role: 'admin', createdAt: serverTimestamp(),
        });
      }
      return { role: 'admin', profile: { ...data, role: 'admin' } };
    }

    return { role: data.role || 'visitor', profile: data };
  }

  return { role: null, profile: null };
};