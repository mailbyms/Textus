import { splitCommandLine } from "../prefs/mcp";

/** Writers whose output pandoc styles from a --reference-doc template. */
const REFERENCE_DOC_FORMATS = new Set(["docx", "odt", "pptx"]);

/** Switches the app sets itself. Pandoc takes the last of a repeated switch,
 *  so a custom one at the end would silently change the reader, the writer or
 *  where the export lands. */
const OWNED_SWITCHES = new Set([
  "--from",
  "-f",
  "--to",
  "-t",
  "--output",
  "-o",
  // The template has a row of its own: one setting, one source of truth.
  "--reference-doc",
]);

/**
 * Settings' custom command line as pandoc arguments, plus the template when
 * this writer accepts one. The words go to the process directly, never through
 * a shell, so a quoted path stays one argument. Windows paths are doubled for
 * splitCommandLine, which otherwise reads their backslashes as escapes.
 */
export function extraPandocArgs(
  line: string,
  format: string,
  referenceDoc: string,
): string[] {
  const words = splitCommandLine(line.replace(/\\/g, "\\\\"));
  const kept: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const name = word.split("=", 1)[0];
    if (OWNED_SWITCHES.has(name)) {
      if (
        !word.includes("=") &&
        i + 1 < words.length &&
        !words[i + 1].startsWith("-")
      )
        i += 1;
      continue;
    }
    kept.push(word);
  }
  const template = referenceDoc.trim();
  if (template && REFERENCE_DOC_FORMATS.has(format))
    kept.push(`--reference-doc=${template}`);
  return kept;
}
