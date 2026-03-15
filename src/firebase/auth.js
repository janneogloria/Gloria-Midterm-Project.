/**
 * firebase/auth.js
 * Authentication helpers.
 * Visitor  → Google Sign-In (@neu.edu.ph) OR Email/Password
 * Admin    → Email + Password
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
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

const NEU_DOMAIN = '@neu.edu.ph';

/* ── Google Sign-In (visitors only) ─────────────────────────────────────── */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'neu.edu.ph' });
  const { user } = await signInWithPopup(auth, provider);

  if (!user.email.endsWith(NEU_DOMAIN)) {
    await signOut(auth);
    throw new Error('WRONG_DOMAIN');
  }

  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid:       user.uid,
      email:     user.email,
      name:      user.displayName || '',
      photoURL:  user.photoURL   || '',
      college:   '',
      role:      'visitor',
      blocked:   false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } else {
    if (snap.data().blocked) {
      await signOut(auth);
      throw new Error('BLOCKED');
    }
    await updateDoc(ref, { lastLogin: serverTimestamp() });
  }
  return user;
};

/* ── Visitor: register with email/password ───────────────────────────────── */
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
      if (snap.exists()) {
        return firebaseUser;
      }
    } else {
      throw err;
    }
  }

  await updateProfile(firebaseUser, { displayName });

  await setDoc(doc(db, 'users', firebaseUser.uid), {
    uid:           firebaseUser.uid,
    email:         firebaseUser.email,
    name:          displayName,
    displayName,
    photoURL:      '',
    college:       '',
    studentNumber: studentNumber || '',
    role:          'visitor',
    blocked:       false,
    createdAt:     serverTimestamp(),
    lastLogin:     serverTimestamp(),
  });

  return firebaseUser;
};

/* ── Admin: register with email/password ─────────────────────────────────── */
export const registerAdmin = async (email, password, displayName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'admins', user.uid), {
    uid:       user.uid,
    email,
    displayName,
    role:      'admin',
    createdAt: serverTimestamp(),
  });
  return user;
};

// Alias kept for backward compatibility
export const registerUser = registerAdmin;

/* ── Login (both roles) ──────────────────────────────────────────────────── */
export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

/* ── Logout ──────────────────────────────────────────────────────────────── */
export const logoutUser = () => signOut(auth);

/* ── Password reset ──────────────────────────────────────────────────────── */
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

/* ── Role resolver ───────────────────────────────────────────────────────── */
export const resolveRole = async (uid) => {
  // Check admins first
  const adminSnap = await getDoc(doc(db, 'admins', uid));
  if (adminSnap.exists()) {
    return { role: 'admin', profile: adminSnap.data() };
  }

  // Then visitors
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.blocked) {
      await signOut(auth);
      throw new Error('BLOCKED');
    }
    return { role: data.role || 'visitor', profile: data };
  }

  return { role: null, profile: null };
};