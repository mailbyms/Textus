import { useEffect, useState } from "react";
import type { Strings } from "../../i18n/strings";
import {
  cli,
  defaultEditor,
  type CliStatus,
  type DefaultEditorStatus,
} from "../../platform/ipc";
import { SettingRow } from "./controls";
import { explainError } from "../../utils/error-explain";

const CLI_STATUS: Record<CliStatus, (t: Strings) => [string, string]> = {
  installed: (t) => [t.cliCommandInstalled, t.cliCommandReinstallButton],
  outdated: (t) => [t.cliCommandOutdated, t.cliCommandUpdateButton],
  missing: (t) => [t.cliCommandNotInstalled, t.cliCommandInstallButton],
};

/**
 * Startup already tries a silent install; this row covers when that failed
 * (an older Textus's script, or none) and retries through an
 * admin-privileged prompt.
 */
export function CliCommandSection({ t }: { t: Strings }) {
  const [status, setStatus] = useState<CliStatus>("missing");
  const [phase, setPhase] = useState<"idle" | "installing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cli.cliCommandStatus().then(setStatus);
  }, []);

  async function install() {
    setPhase("installing");
    setError(null);
    try {
      await cli.installCliCommand();
      setStatus("installed");
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setError(explainError(err, t));
    }
  }

  const [state, action] = CLI_STATUS[status](t);
  return (
    <SettingRow
      label={t.cliCommandLabel}
      error={error && `${t.cliCommandFailed} ${error}`}
    >
      {!error && <span className="settings-row-value">{state}</span>}
      <button
        className="text-button settings-inline-button"
        onClick={install}
        disabled={phase === "installing"}
      >
        {phase === "installing" ? t.cliCommandInstalling : action}
      </button>
    </SettingRow>
  );
}

/**
 * Make Textus the app that opens .md files. Windows only lets the user
 * choose, so there it opens Default apps and re-reads the status on return.
 */
export function DefaultEditorSection({ t }: { t: Strings }) {
  const [status, setStatus] = useState<DefaultEditorStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () =>
      void defaultEditor
        .status()
        .then(setStatus)
        .catch(() => setStatus(null));
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function makeDefault() {
    setBusy(true);
    setError(null);
    try {
      await defaultEditor.set();
      if (status?.chooseInSettings) setOpened(true);
      else setStatus(await defaultEditor.status());
    } catch (err) {
      setError(explainError(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;
  if (!status.supported)
    return (
      <SettingRow
        label={t.defaultEditorLabel}
        hint={t.defaultEditorUnsupported}
      />
    );
  return (
    <SettingRow
      label={t.defaultEditorLabel}
      hint={opened && !status.isDefault ? t.defaultEditorChooseHint : undefined}
      error={error && `${t.defaultEditorFailed} ${error}`}
    >
      {!error && (
        <span className="settings-row-value">
          {status.isDefault
            ? t.defaultEditorIsDefault
            : t.defaultEditorNotDefault}
        </span>
      )}
      {!status.isDefault && (
        <button
          className="text-button settings-inline-button"
          onClick={makeDefault}
          disabled={busy}
        >
          {t.defaultEditorButton}
        </button>
      )}
    </SettingRow>
  );
}
