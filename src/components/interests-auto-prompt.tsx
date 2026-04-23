import { useEffect, useRef, useState } from "react";
import { InterestsModal } from "@/components/interests-modal";
import { readInterests } from "@/lib/interests";

/**
 * Watches scroll behavior and opens the interests modal once the user
 * has performed at least 2 distinct downward scroll "gestures".
 *
 * Will not re-trigger after the user has saved or skipped — they must
 * reopen via the "Select interests" button (header or footer).
 */
export function InterestsAutoPrompt() {
  const [open, setOpen] = useState(false);
  const scrollCount = useRef(0);
  const lastY = useRef(0);
  const triggered = useRef(false);

  useEffect(() => {
    // Don't auto-prompt if user already configured (or skipped) interests.
    if (readInterests().configured) return;

    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (triggered.current) return;
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        // Count meaningful downward scrolls (> 200px).
        if (delta > 200) {
          scrollCount.current += 1;
          lastY.current = y;
          if (scrollCount.current >= 2) {
            triggered.current = true;
            setOpen(true);
          }
        } else if (delta < -200) {
          // Reset baseline on large upward scroll.
          lastY.current = y;
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <InterestsModal open={open} onOpenChange={setOpen} />;
}
