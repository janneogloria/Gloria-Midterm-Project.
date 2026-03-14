/**
 * utils/qrToken.js
 * Secure token generation for QR codes.
 * Uses Web Crypto API (built into browsers — no extra package needed).
 *
 * VISITOR QR:  encodes { type:'visitor', uid, name, email }
 *              — shows their visit history when scanned
 *
 * ADMIN QR:    encodes { type:'admin', uid, token, exp }
 *              — token is a one-time login token stored in Firestore
 *              — expires after 5 minutes for security
 */

const BASE_URL = window.location.origin;

/* ── Encode / decode payload as base64url ──────────────────── */
export function encodePayload(obj) {
  const json = JSON.stringify(obj);
  return btoa(encodeURIComponent(json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodePayload(str) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const padLen  = (4 - padded.length % 4) % 4;
    const b64     = padded + '='.repeat(padLen);
    return JSON.parse(decodeURIComponent(atob(b64)));
  } catch {
    return null;
  }
}

/* ── Visitor QR URL ─────────────────────────────────────────── */
export function makeVisitorQRData(uid, name, email) {
  const payload = encodePayload({ type: 'visitor', uid, name, email });
  return `${BASE_URL}/qr/visitor/${payload}`;
}

/* ── Admin QR data (token stored in Firestore separately) ───── */
export function makeAdminQRData(uid, loginToken) {
  const payload = encodePayload({
    type:  'admin',
    uid,
    token: loginToken,
    exp:   Date.now() + 5 * 60 * 1000, // 5 min expiry hint (enforced server-side)
  });
  return `${BASE_URL}/qr/admin/${payload}`;
}