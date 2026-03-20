/**
 * firebase/firestore.js
 * All Firestore reads/writes — queries use single-field filters only
 * to avoid requiring composite indexes.
 */
import {
  collection, addDoc, updateDoc, doc, query, orderBy,
  onSnapshot, serverTimestamp, where, getDocs, getDoc,
  setDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './config';

/* ════════════════════════════════════════════════════════════
   VISIT LOGS
════════════════════════════════════════════════════════════ */

/** Log a visitor time-in */
export const logVisit = async (data) => {
  const ref = await addDoc(collection(db, 'logs'), {
    ...data,
    timeIn:    serverTimestamp(),
    timeOut:   null,
    status:    'in',
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Log time-out */
export const logTimeOut = async (logId) =>
  updateDoc(doc(db, 'logs', logId), {
    timeOut: serverTimestamp(),
    status:  'out',
  });

/** Real-time: ALL logs, newest first (single orderBy — no composite needed) */
export const subscribeToLogs = (cb) => {
  const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

/** Real-time: today's logs — filter by date in JS to avoid composite index */
export const subscribeToTodayLogs = (cb) => {
  const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.createdAt?.toDate?.() >= start);
    cb(docs);
  });
};

/** Real-time: visitors currently inside — filter status in JS */
export const subscribeToActiveVisitors = (cb) => {
  const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.status === 'in');
    cb(docs);
  });
};

/** Real-time: logs for a specific user — single where, sort in JS */
export const subscribeToUserLogs = (uid, cb) => {
  const q = query(
    collection(db, 'logs'),
    where('uid', '==', uid)
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    cb(docs);
  });
};

/** Fetch logs by date range — single where + JS filter to avoid composite */
export const fetchLogsByRange = async (start, end) => {
  const q = query(
    collection(db, 'logs'),
    where('createdAt', '>=', Timestamp.fromDate(start))
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.createdAt?.toDate?.() <= end)
    .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.());
};

/** Find active (in) session for a user — filter in JS to avoid composite */
export const findActiveSession = async (uid) => {
  const q = query(
    collection(db, 'logs'),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.status === 'in')
    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
  return active[0] || null;
};

/* ════════════════════════════════════════════════════════════
   DASHBOARD STATS
════════════════════════════════════════════════════════════ */

/** Returns { today, week, month, active, byCollege } */
export const fetchDashboardStats = async () => {
  const now        = new Date();
  const dayStart   = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  // Single query — fetch all logs and filter in JS to avoid composite indexes
  const snap = await getDocs(query(collection(db, 'logs'), orderBy('createdAt', 'desc')));
  const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const toDate = (d) => d.createdAt?.toDate?.() || new Date(0);

  const byCollege = {};
  let today = 0, week = 0, month = 0, active = 0;

  all.forEach(d => {
    const t = toDate(d);
    if (t >= dayStart)   today++;
    if (t >= weekStart)  week++;
    if (t >= monthStart) {
      month++;
      const c = d.college || 'Unknown';
      byCollege[c] = (byCollege[c] || 0) + 1;
    }
    if (d.status === 'in') active++;
  });

  return { today, week, month, active, byCollege, allLogs: all };
};

/* ════════════════════════════════════════════════════════════
   USERS (admin management)
════════════════════════════════════════════════════════════ */

/** Real-time: all visitors */
export const subscribeToUsers = (cb) => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

/** Update a visitor's profile fields */
export const updateUserProfile = async (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

/** Save locked profile fields (college, course, visitorRole) — only written once */
export const saveUserProfile = async (uid, { college, course, visitorRole }) =>
  updateDoc(doc(db, 'users', uid), {
    college, course, visitorRole,
    profileLocked: true,
    updatedAt: serverTimestamp(),
  });

/** Submit a profile change request to admins */
export const requestProfileChange = async (uid, { name, email, currentCollege, currentCourse, currentRole, newCollege, newCourse, newRole, reason }) => {
  await addDoc(collection(db, 'profile_change_requests'), {
    uid, name, email,
    currentCollege, currentCourse, currentRole,
    newCollege, newCourse, newRole,
    reason: reason || '',
    status: 'pending', // 'pending' | 'approved' | 'denied'
    createdAt: serverTimestamp(),
  });
};

/** Real-time: all pending profile change requests (admin use) */
export const subscribeToProfileChangeRequests = (cb) => {
  const q = query(collection(db, 'profile_change_requests'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

/** Approve a profile change request — updates user profile and marks request approved */
export const approveProfileChange = async (requestId, uid, { newCollege, newCourse, newRole }) => {
  await updateDoc(doc(db, 'users', uid), {
    college: newCollege, course: newCourse, visitorRole: newRole,
    profileLocked: true, updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'profile_change_requests', requestId), {
    status: 'approved', resolvedAt: serverTimestamp(),
  });
};

/** Deny a profile change request */
export const denyProfileChange = async (requestId) =>
  updateDoc(doc(db, 'profile_change_requests', requestId), {
    status: 'denied', resolvedAt: serverTimestamp(),
  });

/** Block or unblock a visitor */
export const setUserBlocked = async (uid, blocked) =>
  updateDoc(doc(db, 'users', uid), { blocked, updatedAt: serverTimestamp() });

/** Get a single user doc */
export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ── Backward-compat aliases ──────────────────────────────────────────────
export const logTimeIn                    = logVisit;
export const findActiveLogByStudentId     = findActiveSession;
export const subscribeToTodayLogs_compat  = subscribeToTodayLogs;
export const fetchLogsByDateRange         = fetchLogsByRange;

/** Fetch all logs for a specific visitor (one-time) */
export const fetchVisitorLogs = async (uid) => {
  const q = query(
    collection(db, 'logs'),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
};

/* ════════════════════════════════════════════════════════════
   QR CODE — ADMIN LOGIN TOKENS
   A short-lived token stored in Firestore that allows
   passwordless QR login. Expires after 5 minutes.
════════════════════════════════════════════════════════════ */

/** Generate and store a new QR login token for an admin */
export const createAdminQRToken = async (uid) => {
  // Random 32-byte hex token
  const array  = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token  = Array.from(array).map(b => b.toString(16).padStart(2,'0')).join('');
  const exp    = Date.now() + 5 * 60 * 1000; // 5 minutes

  await setDoc(doc(db, 'qr_tokens', token), {
    uid,
    token,
    exp,
    used: false,
    createdAt: serverTimestamp(),
  });

  return token;
};

/** Validate and consume an admin QR token (one-time use) */
export const consumeAdminQRToken = async (token) => {
  const ref  = doc(db, 'qr_tokens', token);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error('INVALID_TOKEN');

  const data = snap.data();
  if (data.used)            throw new Error('TOKEN_USED');
  if (Date.now() > data.exp) throw new Error('TOKEN_EXPIRED');

  // Mark as used immediately (prevents replay attacks)
  await updateDoc(ref, { used: true });

  return data.uid; // return the admin uid
};

/** Get or create a persistent visitor QR token stored in their profile */
export const getVisitorQRData = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('User not found');
  return { uid, ...snap.data() };
};