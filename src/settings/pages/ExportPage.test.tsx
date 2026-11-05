// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportPage } from "./ExportPage";
import type { SettingsPageProps } from "./types";
import { resolveStrings } from "../../i18n/strings";
import { DEFAULT_SETTINGS } from "../../prefs/settings-types";
import { SettingsProvider } from "../../prefs/SettingsContext";

afterEach(cleanup);

const t = resolveStrings("en");
const setup = (indexing = false) =>
  render(
    <SettingsProvider>
      <ExportPage
        {...({
          t,
          settings: DEFAULT_SETTINGS,
          setSettings: vi.fn(),
          indexing,
        } as unknown as SettingsPageProps)}
      />
    </SettingsProvider>,
  );

describe("Settings › Export", () => {
  it("opens on docx with the two pandoc rows under a General / docx tab bar", () => {
    setup();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((b) => b.textContent)).toEqual(["General", "docx"]);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-label", "docx");
    expect(screen.getByLabelText(t.pandocExtraArgsLabel)).toBeInTheDocument();
    expect(
      screen.getByLabelText(t.pandocReferenceDocLabel),
    ).toBeInTheDocument();
  });

  it("leaves General empty", () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "General" }));
    expect(screen.getByRole("tabpanel")).toBeEmptyDOMElement();
    expect(screen.queryByLabelText(t.pandocExtraArgsLabel)).toBeNull();
  });

  it("indexes the rows without the tab bar, so search can reach them", () => {
    setup(true);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByLabelText(t.pandocExtraArgsLabel)).toBeInTheDocument();
  });
});
