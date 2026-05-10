import { useState, useEffect } from 'react';

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
type Breakpoint = keyof typeof BREAKPOINTS;

function getBreakpoint(): Breakpoint | 'xs' {
  const w = window.innerWidth;
  if (w < BREAKPOINTS.sm) return 'xs';
  if (w < BREAKPOINTS.md) return 'sm';
  if (w < BREAKPOINTS.lg) return 'md';
  if (w < BREAKPOINTS.xl) return 'lg';
  return 'xl';
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint | 'xs'>(() =>
    typeof window !== 'undefined' ? getBreakpoint() : 'lg'
  );

  useEffect(() => {
    const handler = () => setBp(getBreakpoint());
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    breakpoint: bp,
    isMobile: bp === 'xs' || bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg' || bp === 'xl',
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
  };
}
