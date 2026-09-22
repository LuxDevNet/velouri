import { useEffect } from "react";
import type { RefObject } from "react";

import { motionEnabled } from "./motion";

// useDepthParallax — pointer-driven parallax for elements carrying a
// data-depth attribute inside the given container. Animates only
// `transform`, matching the plan's motion constraint. No-ops entirely when
// prefers-reduced-motion or pointer:coarse is active.
export function useDepthParallax(containerRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    if (!motionEnabled()) return;
    const container = containerRef.current;
    if (!container) return;

    const layers = Array.from(container.querySelectorAll<HTMLElement>("[data-depth]"));
    if (layers.length === 0) return;

    function handleMove(event: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth ?? 0);
        const reach = depth * 12;
        layer.style.transform = `translate3d(${x * reach}px, ${y * reach}px, 0)`;
      }
    }

    container.addEventListener("pointermove", handleMove);
    return () => container.removeEventListener("pointermove", handleMove);
  }, [containerRef]);
}
