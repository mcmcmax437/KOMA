import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { chapterToken, isNewerChapter } from "../../domain/reading";
import { joinImage, mapChapters, mapPages, mapSearchItem, mapTitle, pickImageServer } from "./mangalib.mapper";

const dir = path.resolve(__dirname, "../../../../../tests/fixtures/mangalib");
const read = (name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
const site = "https://mangalib.me";

describe("mangalib mapper", () => {
  it("maps search and title fixtures", () => {
    const search = read("search.json").data[0];
    const result = mapSearchItem(search, site);
    assert.equal(result?.externalId, "206--one-piece");
    assert.equal(result?.title, "Ван Пис");
    assert.equal(result?.url, "https://mangalib.me/ru/manga/206--one-piece");

    const title = mapTitle(read("title.json").data, site);
    assert.equal(title.author, "Eiichiro Oda");
    assert.equal(title.status, "Онгоинг");
    assert.equal(title.description, "Пиратская история.");
  });

  it("keeps rating, type, and status on catalog cards", () => {
    const card = mapSearchItem({
      slug_url: "7580--i-alone-level-up",
      rus_name: "Поднятие уровня в одиночку",
      eng_name: "Solo Leveling",
      rating: { averageFormated: "9.5", average: "9.47" },
      type: { label: "Манхва" },
      status: { label: "Завершён" },
    }, site);
    assert.equal(card?.rating, "9.5");
    assert.equal(card?.kind, "Манхва");
    assert.equal(card?.status, "Завершён");
  });

  it("keeps the open branch and sorts chapters numerically", () => {
    const chapters = mapChapters("206--one-piece", read("chapters.json").data, site);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].externalId, "206--one-piece~1~1");
    assert.equal(chapters[1].externalId, "206--one-piece~108~1194~20");
    assert.equal(isNewerChapter(chapterToken(chapters[1]), chapterToken(chapters[0])), true);
  });

  it("joins relative page paths to the image server", () => {
    const pages = mapPages(read("pages.json").data.pages, pickImageServer([
      { id: "main", url: "https://img2.imglib.info", site_ids: [1] },
    ]));
    assert.equal(pages[0].imageUrl, "https://img2.imglib.info/manga/one-piece/chapters/1/a.jpg");
    assert.equal(pages[1].imageUrl, "https://img2.imglib.info/manga/one-piece/chapters/1/b.jpg");
    assert.equal(joinImage("https://img2.imglib.info", "//manga/a.jpg"), "https://img2.imglib.info/manga/a.jpg");
  });
});
