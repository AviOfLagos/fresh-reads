import { useEffect, useState } from "react";

export interface GeoState {
  city: string | null;
  country: string | null; // ISO-2 lowercase
  status: "idle" | "asking" | "ok" | "denied" | "error" | "unsupported";
}

const STORAGE_KEY = "newsroom.geolocation.v1";

interface CachedGeo {
  city: string;
  country: string;
  ts: number;
}

function readCache(): CachedGeo | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGeo;
    // Cache for 7 days
    if (Date.now() - parsed.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(city: string, country: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ city, country, ts: Date.now() } satisfies CachedGeo),
    );
  } catch {
    /* ignore */
  }
}

/** Reverse-geocode using BigDataCloud's free, no-key endpoint. */
async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string } | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      city?: string;
      locality?: string;
      countryCode?: string;
    };
    const city = (json.city || json.locality || "").trim();
    const country = (json.countryCode || "").toLowerCase();
    if (!city || !country) return null;
    return { city, country };
  } catch {
    return null;
  }
}

export function useGeolocation(autoRequest = false) {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [state, setState] = useState<GeoState>(
    cached
      ? { city: cached.city, country: cached.country, status: "ok" }
      : { city: null, country: null, status: "idle" },
  );

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, status: "unsupported" }));
      return;
    }
    setState((s) => ({ ...s, status: "asking" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (!r) {
          setState((s) => ({ ...s, status: "error" }));
          return;
        }
        writeCache(r.city, r.country);
        setState({ city: r.city, country: r.country, status: "ok" });
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
        }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    if (autoRequest && state.status === "idle") {
      request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  const reset = () => {
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    setState({ city: null, country: null, status: "idle" });
  };

  return { ...state, request, reset };
}
