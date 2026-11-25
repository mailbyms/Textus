import darkCss from "./github/dark.css?raw";
import lightCss from "./github/light.css?raw";

/// Built-in themes that carry a whole stylesheet, not just `--doc-*`
/// variables. They go through the injected-style path an imported theme uses,
/// but ship with the app: no download, IPC call or file in the user's profile.
export const BUNDLED_THEME_CSS = {
  github: { light: lightCss, dark: darkCss },
} as const;

export type BundledThemeId = keyof typeof BUNDLED_THEME_CSS;

/** The stylesheet for a bundled theme's variant, or null for other ids. */
export function bundledThemeCss(id: string) {
  return isBundledThemeId(id) ? BUNDLED_THEME_CSS[id] : null;
}

export function isBundledThemeId(id: string): id is BundledThemeId {
  return Object.prototype.hasOwnProperty.call(BUNDLED_THEME_CSS, id);
}
