import { describe, expect, it } from "vitest";
import { extraPandocArgs } from "./pandoc-args";

describe("extraPandocArgs", () => {
  it("is empty when nothing is configured", () => {
    expect(extraPandocArgs("", "docx", "")).toEqual([]);
  });

  it("keeps a quoted Windows path as one argument", () => {
    expect(
      extraPandocArgs('--lua-filter "C:\\my filters\\f.lua" --toc', "docx", ""),
    ).toEqual(["--lua-filter", "C:\\my filters\\f.lua", "--toc"]);
  });

  it("adds the template only for writers that accept it", () => {
    expect(extraPandocArgs("", "docx", " C:\\templates\\ref.docx ")).toEqual([
      "--reference-doc=C:\\templates\\ref.docx",
    ]);
    expect(extraPandocArgs("", "epub", "ref.docx")).toEqual([]);
  });

  it("drops switches the app owns, together with their values", () => {
    expect(
      extraPandocArgs(
        '--to html --output=other.docx -o x --from=gfm --reference-doc "old.docx" --metadata author=me',
        "docx",
        "new.docx",
      ),
    ).toEqual(["--metadata", "author=me", "--reference-doc=new.docx"]);
  });
});
