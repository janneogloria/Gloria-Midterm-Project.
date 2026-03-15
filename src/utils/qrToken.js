/**
 * utils/qrToken.js
 * QR code payload encoding/decoding.
 * Uses base64url — no external packages.
 *
 * VISITOR QR:  { type:'visitor', uid, name, email }
 * ADMIN QR:    { type:'admin', uid, token, exp }
 */

/* ── Encode / decode ── */
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

/* Use window.location inside functions to avoid top-level SSR issues */
function getBaseUrl() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://libragate-neu.vercel.app';
}

/* ── Visitor QR URL ── */
export function makeVisitorQRData(uid, name, email) {
  const payload = encodePayload({ type: 'visitor', uid, name, email });
  return `${getBaseUrl()}/qr/visitor/${payload}`;
}

/* ── Admin QR URL ── */
export function makeAdminQRData(uid, loginToken) {
  const payload = encodePayload({
    type:  'admin',
    uid,
    token: loginToken,
    exp:   Date.now() + 5 * 60 * 1000,
  });
  return `${getBaseUrl()}/qr/admin/${payload}`;
}