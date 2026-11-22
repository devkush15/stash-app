"use client";
import { useSyncExternalStore } from "react";
import { Menu } from "@base-ui/react/menu";
import { Moon, Sun } from "lucide-react";
import { applyTheme, THEME_KEY, type Theme } from "@/lib/theme";
import { useClientReady } from "@/lib/use-client-ready";

const snapshot = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const serverSnapshot = (): Theme => "light";
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (
      event.key === THEME_KEY &&
      (event.newValue === "dark" || event.newValue === "light")
    )
      applyTheme(event.newValue);
  };
  window.addEventListener("stash-theme-change", notify);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("stash-theme-change", notify);
    window.removeEventListener("storage", storage);
  };
}
export function ThemeToggle({ menu = false }: { menu?: boolean }) {
  const ready = useClientReady();
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  const Control = menu ? Menu.Item : "button";
  return (
    <Control
      type="button"
      className={menu ? "menu-item" : "icon-button theme-toggle"}
      disabled={!ready}
      aria-label={label}
      title={label}
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
      {menu && label}
    </Control>
  );
}
