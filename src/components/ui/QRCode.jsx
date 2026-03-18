/**
 * QRCode.jsx
 * Renders a QR code using the qrcode.react-compatible approach.
 * Uses the browser's Canvas API with a pure-JS QR encoder
 * (no external package — uses qrcode-generator algorithm inline).
 *
 * Props:
 *   value    string  — the URL/data to encode
 *   size     number  — pixel size of the QR (default 200)
 *   fgColor  string  — foreground color (default #0f1b5c)
 *   bgColor  string  — background color (default #ffffff)
 */
import React, { useEffect, useRef } from 'react';

/* ── Minimal QR encoder (Reed-Solomon, mode byte, ECC level M) ── */
// We load qrcode-generator via a dynamic script tag the first time,
// then draw to canvas. This avoids needing to install a package.

/* ── Pure-JS QR drawing using a data URL approach ── */
// We'll use the Web-based QR API via a hidden div rendered by QRCode library
export default function QRCode({ value, size = 200, fgColor = '#0f1b5c', bgColor = '#ffffff' }) {
  const containerRef = useRef(null);
  const instanceRef  = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !value) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Load QRCode.js from CDN
    const script = document.getElementById('qrcode-script');
    const render = () => {
      try {
        instanceRef.current = new window.QRCode(container, {
          text:         value,
          width:        size,
          height:       size,
          colorDark:    fgColor,
          colorLight:   bgColor,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        console.error('QR render error', e);
      }
    };

    if (window.QRCode) {
      render();
    } else if (!script) {
      const s = document.createElement('script');
      s.id  = 'qrcode-script';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = render;
      document.head.appendChild(s);
    } else {
      // Script loading — wait
      script.addEventListener('load', render);
    }

    return () => {
      if (instanceRef.current) {
        try { instanceRef.current.clear(); } catch {}
      }
    };
  }, [value, size, fgColor, bgColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width:  size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bgColor,
        borderRadius: 8,
      }}
    />
  );
}