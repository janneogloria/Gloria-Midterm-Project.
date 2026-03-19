/**
 * firebase/auth.js — LibraGate NEU
 *
 * Google Sign-In: restricted to @neu.edu.ph only.
 * - New user  → creates account, returns { user, isNew: true }
 * - Returning → returns { user, isNew: false }
 * - jcesperanza@neu.edu.ph → auto-assigned admin role
 *
 * Admin login: email/password only, role verified server-side.
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

// Emails that are automatically granted admin role on Google sign-in
// Add professor / staff emails here
const ADMIN_GOOGLE_EMAILS = [
  'jcesperanza@neu.edu.ph',
];

/* ── Google Sign-In ────────────────────────────────────────────────────── */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'neu.edu.ph' });
  const { user } = await signInWithPopup(auth, provider);

  if (!user.email.endsWith(NEU_DOMAIN)) {
    await signOut(auth);
    throw new Error('WRONG_DOMAIN');
  }

  const isAdminEmail = ADMIN_GOOGLE_EMAILS.includes(user.email.toLowerCase());
  const userRef  = doc(db, 'users',  user.uid);
  const adminRef = doc(db, 'admins', user.uid);

  // If this email is an admin, ensure the admins doc exists
  if (isAdminEmail) {
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

/* ── Visitor: register with email/password ─────────────────────────────── */
export const registerVisitor = async (email, password, displayName, studentNumber = '') => {
  let firebaseUser;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = user;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
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
    college: '', studentNumber: studentNumber || '',
    role: 'visitor', blocked: false,
    createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
  });
  return firebaseUser;
};

/* ── Admin: register with email/password ──────────────────────────────── */
export const registerAdmin = async (email, password, displayName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'admins', user.uid), {
    uid: user.uid, email, displayName, role: 'admin', createdAt: serverTimestamp(),
  });
  return user;
};

export const registerUser = registerAdmin; // alias

/* ── Login ─────────────────────────────────────────────────────────────── */
export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

/* ── Logout / Reset ─────────────────────────────────────────────────────── */
export const logoutUser  = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

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