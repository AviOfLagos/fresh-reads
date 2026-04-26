import { useEffect, useRef, useState } from "react";

/**
 * Lightweight pull-to-refresh hook for touch devices.
 *
 * Activates only when the page is scrolled to the very top and the user
 * pulls down on a touch screen. Calls `onRefresh` once the threshold is
 * crossed, then auto-resets when the promise resolves.
 *
 * Returns `pull` (0..1+) for visual progress and `refreshing` boolean.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown> | void,
  options: { threshold?: number; maxPull?: number } = {},
) {
  const { threshold = 70, maxPull = 120 } = options;
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    // Only activate on touch-capable viewports
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 2) {
        armed.current = false;
        return;
      }
      armed.current = true;
      startY.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current == null || refreshing) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) {
        if (pull !== 0) setPull(0);
        return;
      }
      // Resistance curve — easier to start, harder to overshoot
      const damped = Math.min(maxPull, dy * 0.55);
      setPull(damped);
    };

    const onTouchEnd = async () => {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, pull, refreshing, threshold, maxPull]);

  return {
    pull,
    refreshing,
    progress: Math.min(1, pull / threshold),
    threshold,
  };
}
