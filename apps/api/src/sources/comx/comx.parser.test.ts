import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { SourceError } from "../errors/source-errors";
import {
  detectComxBlock,
  parseChapterPages,
  parseChaptersFromHtml,
  parseSearchHtml,
  parseTitleHtml,
} from "./comx.parser";

const base = "https://com-x.life";
const dir = path.resolve(__dirname, "../../../../../tests/fixtures/comx");
const read = (name: string) => readFileSync(path.join(dir, name), "utf8");

describe("com-x parser", () => {
  it("maps search cards to normalized results", () => {
    const results = parseSearchHtml(read("search.html"), base);
    assert.equal(results.length, 2);
    assert.equal(results[0].externalId, "9514-one-piece");
    assert.equal(results[0].title, "One Piece");
    assert.deepEqual(results[0].alternativeTitles, ["Ван Пис"]);
    assert.equal(results[0].coverUrl, "https://com-x.life/uploads/one.jpg");
    assert.equal(results[1].externalId, "11082-chainsaw");
    assert.equal(results[1].coverUrl, "https://com-x.life/uploads/extra.jpg");
  });

  it("maps title metadata and chapters in reading order", () => {
    const html = read("title.html");
    const title = parseTitleHtml(html, base, "9514-one-piece");
    assert.equal(title.title, "Ван Пис");
    assert.equal(title.author, "Эйитиро Ода");
    assert.equal(title.status, "Продолжается");
    assert.match(title.description ?? "", /Пиратская/);
    const chapters = parseChaptersFromHtml(html, base);
    assert.deepEqual(
      chapters.map((chapter) => chapter.externalId),
      ["9514~9", "9514~401200", "9514~401269"],
    );
    assert.equal(chapters[2].displayNumber, "Глава 1150");
    assert.equal(chapters[2].sortValue, 1150);
  });

  it("extracts page urls from the reader payload", () => {
    const parsed = parseChapterPages(read("chapter.html"), "9514~401269", base);
    assert.equal(parsed.pages.length, 2);
    assert.equal(parsed.pages[0].imageUrl, "https://img.com-x.life/comix/one/1150/01.jpg");
    assert.equal(parsed.pages[1].number, 2);
  });

  it("recognizes an access check and does not treat it as a catalog page", () => {
    const html = read("challenge.html");
    assert.equal(detectComxBlock(html, "https://com-x.life/_c?t=abc"), true);
    assert.throws(() => parseSearchHtml(html, base), (error: unknown) => {
      assert.ok(error instanceof SourceError);
      assert.equal(error.code, "SOURCE_UNAVAILABLE");
      return true;
    });
  });
});
