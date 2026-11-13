import { getVersion } from "@tauri-apps/api/app";
import { inBrowser } from "./runtime";

/** The app's version; empty in the browser. */
export function appVersion(): Promise<string> {
  return inBrowser ? Promise.resolve("") : getVersion();
}
