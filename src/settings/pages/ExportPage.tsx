import { useState } from "react";
import type { SettingsPageProps } from "./types";
import { SettingsGroup } from "./SettingsGroup";
import { SettingRow, VERBATIM_INPUT } from "../sections/controls";
import { canExportWithPandoc } from "../../platform/capabilities";
import { fs } from "../../platform/ipc";

/** Settings › Export: one tab for every writer the user can configure.
 *  General stays empty until a switch applies to all exports, not just one
 *  writer; docx holds the switches for the pandoc Word export. */
type ExportTab = "general" | "docx";

type DocxProps = Pick<SettingsPageProps, "t" | "settings" | "setSettings">;

export function ExportPage({
  t,
  settings,
  setSettings,
  indexing,
}: SettingsPageProps) {
  // docx is the only tab with anything in it yet, so open on it: General
  // would look like a broken, blank page.
  const [tab, setTab] = useState<ExportTab>("docx");
  const labels: Record<ExportTab, string> = {
    general: t.exportTabGeneral,
    docx: t.exportTabDocx,
  };
  const docx = <DocxTab t={t} settings={settings} setSettings={setSettings} />;
  // The search reads the rows behind the tabs, but never the tab bar: a
  // result has to land on a row, not on a button that opens another tab.
  if (indexing) return docx;
  return (
    <>
      <div
        className="auth-tabs export-tabs"
        role="tablist"
        aria-label={t.navExport}
      >
        {(["general", "docx"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`auth-tab${tab === id ? " auth-tab-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label={labels[tab]}
        className="export-tab-panel"
      >
        {tab === "docx" && docx}
      </div>
    </>
  );
}

/** The two switches passed to a user-installed pandoc when it writes a Word
 *  document. Other writers get their own tab as they gain settings. */
function DocxTab({ t, settings, setSettings }: DocxProps) {
  if (!canExportWithPandoc) return null;
  return (
    <SettingsGroup title={t.exportDocxGroup}>
      <SettingRow label={t.pandocExtraArgsLabel} help={t.pandocExtraArgsHelp}>
        <input
          className="settings-text-input"
          aria-label={t.pandocExtraArgsLabel}
          {...VERBATIM_INPUT}
          value={settings.pandocExtraArgs}
          placeholder="--toc --number-sections"
          onChange={(e) => setSettings({ pandocExtraArgs: e.target.value })}
        />
      </SettingRow>
      <SettingRow
        label={t.pandocReferenceDocLabel}
        help={t.pandocReferenceDocHelp}
      >
        <input
          className="settings-text-input"
          aria-label={t.pandocReferenceDocLabel}
          {...VERBATIM_INPUT}
          value={settings.pandocReferenceDoc}
          onChange={(e) => setSettings({ pandocReferenceDoc: e.target.value })}
        />
        <button
          type="button"
          className="text-button settings-inline-button"
          onClick={async () => {
            // The templates pandoc's writers accept: Word, OpenDocument and
            // PowerPoint.
            const picked = await fs.openImageFileDialog(
              t.pandocReferenceDocLabel,
              ["docx", "odt", "pptx"],
            );
            if (picked) setSettings({ pandocReferenceDoc: picked });
          }}
        >
          {t.pandocPickTemplate}
        </button>
      </SettingRow>
    </SettingsGroup>
  );
}
