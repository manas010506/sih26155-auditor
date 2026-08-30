import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/\\[]';

/**
 * Scrambles characters on mount then resolves to the final string.
 * Respects prefers-reduced-motion — skips the effect if reduced motion is set.
 *
 * Props:
 *   text       — the final string to reveal
 *   duration   — total scramble duration in ms (default 900)
 *   delay      — ms before scramble starts (default 0)
 *   className  — forwarded to the span
 *   style      — forwarded to the span
 */
export default function GlitchText({ text, duration = 900, delay = 0, className = '', style }) {
  const [displayed, setDisplayed] = useState(text);
  const frameRef = useRef(null);

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let startTime = null;
    let timeoutId = null;

    const animate = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Reveal characters left-to-right as progress advances
      const resolvedCount = Math.floor(progress * text.length);

      setDisplayed(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ' || char === '\n') return char;
            if (i < resolvedCount) return char;
            // Still scrambling — pick a random char
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(text);
      }
    };

    timeoutId = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, duration, delay]);

  return (
    <span className={className} style={{ ...style, whiteSpace: 'pre' }}>
      {displayed}
    </span>
  );
}
