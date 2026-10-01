import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chapterToken, isAllowedImageUrl, isNewerChapter, progressPercent, selectContinueId } from "./reading";

describe("progress", () => {
  it("computes a clamped percent", () => {
    assert.equal(progressPercent(27, 42), 64.29);
    assert.equal(progressPercent(99, 10), 100);
    assert.equal(progressPercent(1, 0), 0);
  });

  it("selects the newest unfinished position", () => {
    const id = selectContinueId([
      { id: "old-open", updatedAt: 10, completed: false },
      { id: "done", updatedAt: 30, completed: true },
      { id: "latest-open", updatedAt: 20, completed: false },
    ]);
    assert.equal(id, "latest-open");
  });

  it("falls back to the newest completed row", () => {
    assert.equal(
      selectContinueId([
        { id: "a", updatedAt: 1, completed: true },
        { id: "b", updatedAt: 2, completed: true },
      ]),
      "b",
    );
  });
});

describe("chapter updates", () => {
  it("treats a higher sort value as newer and ignores string ordering", () => {
    assert.equal(isNewerChapter("1150.5", "1150"), true);
    assert.equal(isNewerChapter("9", "10"), false);
    assert.equal(isNewerChapter(chapterToken({ displayNumber: "Extra" }), "10"), false);
    assert.equal(isNewerChapter("1151", null), false);
  });
});

describe("image allowlist", () => {
  const allow = ["com-x.life", "cdnlibs.org", "imglib.info", "mangalib.me"];

  it("allows configured source hosts and rejects open proxy targets", () => {
    assert.equal(isAllowedImageUrl("https://img.com-x.life/comix/a.jpg", allow), true);
    assert.equal(isAllowedImageUrl("https://img2.imglib.info/manga/a.jpg", allow), true);
    assert.equal(isAllowedImageUrl("https://evil.example/a.jpg", allow), false);
    assert.equal(isAllowedImageUrl("https://user:pass@img.com-x.life/a.jpg", allow), false);
    assert.equal(isAllowedImageUrl("http://img.com-x.life/a.jpg", allow), false);
    assert.equal(isAllowedImageUrl("not a url", allow), false);
  });
});
