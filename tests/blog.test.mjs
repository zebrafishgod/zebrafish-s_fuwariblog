import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { filterPosts, getCategoryTagOptions, parsePostFilters, retainAvailableTags } from "../src/utils/post-filter.ts";
import { BOOKMARK_EVENT, BOOKMARK_KEY, readBookmarks, readPreference, toggleBookmark, writePreference } from "../src/utils/preferences.ts";

const posts = [
  { slug: "alpha", data: { title: "Astro 入門", description: "靜態網站", category: "技術", tags: ["Astro", "Web"], published: "2026-01-01" } },
  { slug: "beta", data: { title: "生活筆記", description: "海邊旅行", category: null, tags: ["生活"], published: "2026-02-01" } },
  { slug: "gamma", data: { title: "Svelte 元件", description: "Astro 整合", category: "技術", tags: ["Svelte"], published: "2026-02-01" } },
];
const filters = query => parsePostFilters(new URLSearchParams(query));
const slugs = result => result.map(post => post.slug);

test("tag options follow categories, including all, uncategorized and unknown categories", () => {
  assert.deepEqual(getCategoryTagOptions(posts, filters("category=技術")), ["Astro", "Svelte", "Web"]);
  assert.deepEqual(getCategoryTagOptions(posts, filters("")), ["Astro", "Svelte", "Web", "生活"]);
  assert.deepEqual(getCategoryTagOptions(posts, filters("uncategorized=true")), ["生活"]);
  assert.deepEqual(getCategoryTagOptions(posts, filters("category=missing")), []);
  assert.deepEqual(getCategoryTagOptions(posts, filters("category=技術&category=missing")), ["Astro", "Svelte", "Web"]);
});

test("category changes remove hidden tag selections while preserving valid tags and other filters", () => {
  const initial = filters("category=技術&tag=生活&tag=Web&q=Astro&saved=true&sort=oldest");
  const result = retainAvailableTags(posts, initial);
  assert.deepEqual(result, { ...initial, tags: ["Web"] });
  assert.deepEqual(initial.tags, ["生活", "Web"]);
  assert.deepEqual(slugs(filterPosts(posts, result, ["alpha"])), ["alpha"]);
  assert.deepEqual(retainAvailableTags(posts, filters("uncategorized=true&tag=Web")).tags, []);
});

test("category tag options trim category names and deduplicate shared tags without following search results", () => {
  const extra = [...posts, { slug: "extra", data: { ...posts[0].data, category: " 技術 ", tags: ["Web"] } }];
  assert.deepEqual(getCategoryTagOptions(extra, filters("category=技術&q=no-match&tag=Web&saved=true")), ["Astro", "Svelte", "Web"]);
});

test("sorts tied dates deterministically without mutating source", () => {
  assert.deepEqual(slugs(filterPosts(posts, filters(""))), ["beta", "gamma", "alpha"]);
  assert.deepEqual(slugs(filterPosts(posts, filters("sort=oldest"))), ["alpha", "beta", "gamma"]);
  assert.deepEqual(slugs(posts), ["alpha", "beta", "gamma"]);
});
test("normalizes full-width search and combines keyword terms", () => {
  assert.deepEqual(slugs(filterPosts(posts, filters("q=ＡＳＴＲＯ 入門"))), ["alpha"]);
  assert.deepEqual(slugs(filterPosts(posts, filters("q=Astro 不存在"))), []);
});
test("combines category, tags and saved filters; tag selection is OR", () => {
  assert.deepEqual(slugs(filterPosts(posts, filters("category=技術&tag=Web&tag=Svelte&saved=true"), ["gamma", "beta"])), ["gamma"]);
});
test("handles uncategorized posts, unknown bookmarks and unknown sort", () => {
  assert.deepEqual(slugs(filterPosts(posts, filters("uncategorized=true"))), ["beta"]);
  assert.deepEqual(slugs(filterPosts(posts, filters("saved=true"), ["deleted"])), []);
  assert.equal(filters("sort=bad").sort, "newest");
  assert.deepEqual(filters("category=A&category=B").categories, ["A", "B"]);
});
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage); else delete globalThis.localStorage;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else delete globalThis.window;
});
function useStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value),
  } });
  return map;
}
test("recovers from invalid bookmark JSON and removes invalid entries", () => {
  useStorage({ [BOOKMARK_KEY]: "invalid" });
  assert.deepEqual(readBookmarks(), []);
  useStorage({ [BOOKMARK_KEY]: JSON.stringify(["alpha", 2, "alpha", null, "beta"]) });
  assert.deepEqual(readBookmarks(), ["alpha", "beta"]);
});
test("toggles bookmarks and broadcasts only successful writes", () => {
  useStorage();
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  let count = 0;
  target.addEventListener(BOOKMARK_EVENT, () => count++);
  assert.equal(toggleBookmark("alpha"), true);
  assert.deepEqual(readBookmarks(), ["alpha"]);
  toggleBookmark("alpha");
  assert.deepEqual(readBookmarks(), []);
  assert.equal(count, 2);
});
test("storage denial does not crash readers or report a saved bookmark", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage denied"); } });
  assert.equal(readPreference("theme"), null);
  assert.deepEqual(readBookmarks(), []);
  assert.equal(writePreference("theme", "dark"), false);
  assert.equal(toggleBookmark("alpha"), false);
});

