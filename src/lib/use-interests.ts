import { useEffect, useState, useCallback } from "react";
import {
  readInterests,
  writeInterests,
  DEFAULT_INTERESTS,
  type UserInterests,
} from "@/lib/interests";

export function useInterests() {
  const [interests, setInterests] = useState<UserInterests>(DEFAULT_INTERESTS);

  useEffect(() => {
    setInterests(readInterests());
    const onChange = () => setInterests(readInterests());
    window.addEventListener("interests:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("interests:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback((next: Partial<UserInterests>) => {
    const merged: UserInterests = {
      ...readInterests(),
      ...next,
      updatedAt: new Date().toISOString(),
      configured: true,
    };
    writeInterests(merged);
    setInterests(merged);
  }, []);

  const skip = useCallback(() => {
    const current = readInterests();
    const merged: UserInterests = {
      ...current,
      updatedAt: new Date().toISOString(),
      configured: true,
    };
    writeInterests(merged);
    setInterests(merged);
  }, []);

  return { interests, save, skip };
}
