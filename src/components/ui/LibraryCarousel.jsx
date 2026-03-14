/**
 * LibraryCarousel.jsx
 * Reusable auto-advancing carousel showing library photos.
 * Used in both the Visitor sidebar panel and Admin dashboard.
 */
import React, { useState, useEffect } from 'react';
import './LibraryCarousel.css';

const SLIDES = [
  { src: '/images/carousellib1.jpg', caption: 'NEU Library' },
  { src: '/images/carousellib2.jpg', caption: 'Study Spaces' },
  { src: '/images/carousellib3.jpg', caption: 'Reading Area' },
  { src: '/images/carousellib4.jpg', caption: 'Collection' },
];

export default function LibraryCarousel({ className = '', interval = 4500 }) {
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), interval);
    return () => clearInterval(t);
  }, [paused, interval]);

  const prev = () => setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setIdx(i => (i + 1) % SLIDES.length);

  return (
    <div
      className={`lc ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div className="lc__track">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={`lc__slide${i === idx ? ' lc__slide--active' : ''}`}
            style={{ backgroundImage: `url('${s.src}')` }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="lc__overlay"/>

      {/* Caption */}
      <div className="lc__caption">{SLIDES[idx].caption}</div>

      {/* Dot indicators */}
      <div className="lc__dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`lc__dot${i === idx ? ' lc__dot--active' : ''}`}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button className="lc__arrow lc__arrow--prev" onClick={prev} aria-label="Previous">‹</button>
      <button className="lc__arrow lc__arrow--next" onClick={next} aria-label="Next">›</button>
    </div>
  );
}