import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "zx-theme";

/** Runs before paint: explicit choice > system preference > dark default. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}var r=document.documentElement;r.classList.remove('dark','light');r.classList.add(t)}catch(e){}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);
  const setTheme = useCallback((t: Theme) => {
    const r = document.documentElement;
    r.classList.remove("dark", "light");
    r.classList.add(t);
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);
  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  return { theme, setTheme, toggle };
}
