/**
 * PageTransition.jsx
 * Wraps route content with enter/exit CSS animations.
 * Uses useLocation key to re-trigger on every route change.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location  = useLocation();
  const [phase, setPhase] = useState('enter'); // 'enter' | 'idle' | 'exit'
  const timerRef  = useRef(null);

  useEffect(() => {
    // New route — run enter animation
    setPhase('enter');
    timerRef.current = setTimeout(() => setPhase('idle'), 1000);
    return () => clearTimeout(timerRef.current);
  }, [location.key]);

  return (
    <div className={`pt pt--${phase}`} key={location.key}>
      {children}
    </div>
  );
}