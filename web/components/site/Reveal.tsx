'use client';

import { useEffect, useRef } from 'react';

/**
 * Fades its children in when they scroll into view, once. Content is fully visible without JavaScript
 * and when the visitor prefers reduced motion (see globals.css).
 */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: {
  children: React.ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.92) return; // already on screen: don't hide it
    el.dataset.reveal = 'hidden';
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { el.dataset.reveal = 'shown'; io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} data-reveal="" className={className} style={{ ['--reveal-delay' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
