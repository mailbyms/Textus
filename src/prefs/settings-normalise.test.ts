import { describe, expect, it } from "vitest";
import { normaliseSettings } from "./settings-normalise";

const galleryCopy = (id: string) => ({
  id,
  name: "GitHub",
  hasDark: true,
  gallery: {
    id: "github",
    updated: "2026-11-05T22:00:00Z",
    source: "https://github.com/CatVinci-Studio/textus-themes",
  },
});

describe("the built-in GitHub theme", () => {
  it("is what a new installation opens with", () => {
    expect(normaliseSettings(null).themeId).toBe("github");
  });

  it("moves a selected gallery copy to the built-in id and drops the copy", () => {
    const settings = normaliseSettings({
      themeId: "user-1",
      userThemes: [
        galleryCopy("user-1"),
        { id: "user-2", name: "Other", hasDark: false },
      ],
    });
    expect(settings.themeId).toBe("github");
    expect(settings.userThemes.map((theme) => theme.id)).toEqual(["user-2"]);
  });

  it("keeps another theme selected when removing the gallery copy", () => {
    const settings = normaliseSettings({
      themeId: "user-2",
      userThemes: [
        galleryCopy("user-1"),
        { id: "user-2", name: "Other", hasDark: false },
      ],
    });
    expect(settings.themeId).toBe("user-2");
    expect(settings.userThemes.map((theme) => theme.id)).toEqual(["user-2"]);
  });

  it("leaves a manually imported theme of the same name alone", () => {
    const settings = normaliseSettings({
      themeId: "user-3",
      userThemes: [{ id: "user-3", name: "GitHub", hasDark: true }],
    });
    expect(settings.themeId).toBe("user-3");
    expect(settings.userThemes).toHaveLength(1);
  });
});
