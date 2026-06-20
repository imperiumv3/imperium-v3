import { useEffect } from "react";

/**
 * Theme is no longer page-wide. The blue water background applies from start
 * to end of the page; only the dedicated Transition section paints itself
 * black. This hook just ensures the light theme attribute is set so any
 * theme-aware tokens resolve to the light variants.
 */
export function useThemeScrollSync() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-lv2-theme", "light");
    return () => {
      root.removeAttribute("data-lv2-theme");
    };
  }, []);
}
