"use client";
import { useSyncExternalStore } from "react";
export const tagColors = {
  neutral: "#77716b",
  purple: "#795697",
  blue: "#376aa2",
  green: "#397455",
  amber: "#956317",
  rose: "#a04968",
};
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("stash-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("stash-preferences", callback);
  };
}
export function usePreference(key: string, fallback = "") {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  return [
    value,
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event("stash-preferences"));
    },
  ] as const;
}
