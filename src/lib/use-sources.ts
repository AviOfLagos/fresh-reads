import { useEffect, useState, useCallback } from "react";
import { readEnabledSources, writeEnabledSources, SOURCES } from "./sources";

export function useSources() {
  const [enabled, setEnabled] = useState<string[]>(SOURCES.map((s) => s.id));

  useEffect(() => {
    setEnabled(readEnabledSources());
    const onChange = () => setEnabled(readEnabledSources());
    window.addEventListener("sources:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("sources:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = readEnabledSources();
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    writeEnabledSources(next.length ? next : [id]); // never allow empty
  }, []);

  const isEnabled = useCallback((id: string) => enabled.includes(id), [enabled]);

  return { enabled, toggle, isEnabled, all: SOURCES };
}
