export type Theme = "light" | "dark";
export const THEME_KEY = "stash-theme";
const colors = { light: "#f9f8f5", dark: "#191a1d" };

// Runs in the head before the page paints; no account data or cookies involved.
export const themeBootstrap = `(function(){var saved;try{saved=localStorage.getItem('${THEME_KEY}')}catch{}var theme=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'${colors.dark}':'${colors.light}'})()`;

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta) meta.content = colors[theme];
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The current page still switches when browser storage is unavailable.
  }
  window.dispatchEvent(new Event("stash-theme-change"));
}
