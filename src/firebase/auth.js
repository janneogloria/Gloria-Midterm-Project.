/**
 * firebase/auth.js — LibraGate NEU
 *
 * Visitors:  Google Sign-In (@neu.edu.ph only) — no password needed.
 *            New accounts auto-created. Returns { user, isNew }.
 * Admins:    Email + Password only.
 * jcesperanza@neu.edu.ph → auto admin role.
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const NEU_DOMAIN = '@neu.edu.ph';

// Emails auto-granted admin on Google sign-in — add professors/staff here
const ADMIN_GOOGLE_EMAILS = [
  'jcesperanza@neu.edu.ph',
];

/* ── Google Sign-In (visitors + auto-admin) ────────────────────────────── */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  // Remove hd restriction — validate domain ourselves for better error messages
  provider.addScope('email');
  provider.addScope('profile');

  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (err) {
    // Re-throw popup errors as-is so caller can handle auth/popup-closed-by-user etc.
    throw err;
  }

  const { user } = result;

  if (!user.email || !user.email.endsWith(NEU_DOMAIN)) {
    await signOut(auth);
    throw new Error('WRONG_DOMAIN');
  }

  const isAdminEmail = ADMIN_GOOGLE_EMAILS.includes(user.email.toLowerCase());

  // Ensure admin doc exists for whitelisted emails
  if (isAdminEmail) {
    const adminRef  = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid:         user.uid,
        email:       user.email,
        displayName: user.displayName || '',
        role:        'admin',
        createdAt:   serverTimestamp(),
      });
    }
  }

  const userRef  = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  let isNew = false;

  if (!userSnap.exists()) {
    isNew = true;
    await setDoc(userRef, {
      uid:       user.uid,
      email:     user.email,
      name:      user.displayName || '',
      photoURL:  user.photoURL   || '',
      college:   '',
      yearLevel: '',
      role:      isAdminEmail ? 'admin' : 'visitor',
      blocked:   false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } else {
    const data = userSnap.data();
    if (data.blocked) { await signOut(auth); throw new Error('BLOCKED'); }
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
  }

  return { user, isNew };
};

/* ── Admin register (email/password) ──────────────────────────────────── */
export const registerAdmin = async (email, password, displayName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'admins', user.uid), {
    uid: user.uid, email, displayName, role: 'admin', createdAt: serverTimestamp(),
  });
  return user;
};
export const registerUser = registerAdmin;

/* ── Admin login (email/password) ─────────────────────────────────────── */
export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

/* ── Logout / Reset ─────────────────────────────────────────────────────── */
export const logoutUser    = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

/* ── Update visitor profile (yearLevel, college) ─────────────────────── */
export const updateVisitorProfile = async (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

/* ── Role resolver ──────────────────────────────────────────────────────── */
export const resolveRole = async (uid) => {
  const adminSnap = await getDoc(doc(db, 'admins', uid));
  if (adminSnap.exists()) return { role: 'admin', profile: adminSnap.data() };

  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.blocked) { await signOut(auth); throw new Error('BLOCKED'); }
    return { role: data.role || 'visitor', profile: data };
  }
  return { role: null, profile: null };
};