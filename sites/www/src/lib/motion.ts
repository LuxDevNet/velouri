// motion.ts — shared reduced-motion / coarse-pointer checks. Every GSAP or
// parallax effect in the cinematic pages (Home, Plugins, Docs) gates on
// motionEnabled() before touching transform/opacity/filter/clip-path.

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function motionEnabled(): boolean {
  return !prefersReducedMotion() && !isCoarsePointer();
}
