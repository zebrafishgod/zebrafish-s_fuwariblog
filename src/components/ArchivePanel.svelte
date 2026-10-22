<script lang="ts">
import { onMount, tick } from "svelte";
import {
	type DiscoverPost,
	filterPosts,
	getCategoryTagOptions,
	parsePostFilters,
	retainAvailableTags,
} from "../utils/post-filter";
import { BOOKMARK_EVENT, readBookmarks } from "../utils/preferences";
import { getPostUrlBySlug } from "../utils/url-utils";
import BookmarkButton from "./BookmarkButton.svelte";

export let sortedPosts: DiscoverPost[] = [];
let filters = parsePostFilters(new URLSearchParams());
let bookmarks: string[] = [];
let ready = false;
$: categoryOptions = [
	...new Set(
		sortedPosts
			.map((post) => post.data.category?.trim())
			.filter((value): value is string => !!value),
	),
].sort();
$: tagOptions = getCategoryTagOptions(sortedPosts, filters);
$: filtered = filterPosts(sortedPosts, filters, bookmarks);

async function syncUrl() {
	await tick();
	const address = new URL(window.location.href);
	for (const name of ["q", "category", "tag", "saved", "sort", "uncategorized"])
		address.searchParams.delete(name);
	if (filters.query.trim()) address.searchParams.set("q", filters.query.trim());
	for (const category of filters.categories)
		address.searchParams.append("category", category);
	for (const tag of filters.tags) address.searchParams.append("tag", tag);
	if (filters.saved) address.searchParams.set("saved", "true");
	if (filters.uncategorized) address.searchParams.set("uncategorized", "true");
	if (filters.sort !== "newest") address.searchParams.set("sort", filters.sort);
	window.history.replaceState(window.history.state, "", address);
	window.dispatchEvent(new Event("zebrafish:navigation"));
}
function toggleTag(tag: string) {
	filters.tags = filters.tags.includes(tag)
		? filters.tags.filter((item) => item !== tag)
		: [...filters.tags, tag];
	syncUrl();
}
function changeCategory(value: string) {
	filters = retainAvailableTags(sortedPosts, {
		...filters,
		categories: value && value !== "__uncategorized" ? [value] : [],
		uncategorized: value === "__uncategorized",
	});
	syncUrl();
}
function reset() {
	filters = parsePostFilters(new URLSearchParams());
	syncUrl();
}
onMount(() => {
	const updateBookmarks = () => {
		bookmarks = readBookmarks();
	};
	const updateFilters = () => {
		const parsed = parsePostFilters(new URLSearchParams(window.location.search));
		filters = retainAvailableTags(sortedPosts, parsed);
		if (filters.tags.length !== parsed.tags.length) syncUrl();
	};
	updateFilters();
	updateBookmarks();
	ready = true;
	window.addEventListener(BOOKMARK_EVENT, updateBookmarks);
	window.addEventListener("storage", updateBookmarks);
	window.addEventListener("popstate", updateFilters);
	return () => {
		window.removeEventListener(BOOKMARK_EVENT, updateBookmarks);
		window.removeEventListener("storage", updateBookmarks);
		window.removeEventListener("popstate", updateFilters);
	};
});
function dateLabel(value: Date | string) {
	return new Intl.DateTimeFormat("zh-TW", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(value));
}
</script>

<section class="card-base archive-panel" aria-labelledby="archive-title">
  <p class="eyebrow">EXPLORE THE ARCHIVE</p>
  <h1 id="archive-title">{filters.saved ? "稍后阅读" : "文章探索"}</h1>
  <p class="section-description">{filters.saved ? "收藏感兴趣的文章，留给下一次静心阅读。收藏只存储在此浏览器。" : "从一个关键词出发，找到下一篇值得阅读的文章。"}</p>
  <div class="archive-controls">
    <label class="search-field"><span>搜索文章</span><input type="search" placeholder="标题、摘要或标签…" bind:value={filters.query} on:input={syncUrl} disabled={!ready}/></label>
    <label><span>分类</span><select value={filters.uncategorized ? "__uncategorized" : (filters.categories[0] || "")} disabled={!ready} on:change={(event) => changeCategory(event.currentTarget.value)}>
      <option value="">全部分类</option>{#each categoryOptions as category}<option value={category}>{category}</option>{/each}<option value="__uncategorized">未分类</option>
    </select></label>
    <label><span>排序</span><select bind:value={filters.sort} on:change={syncUrl} disabled={!ready}><option value="newest">最新优先</option><option value="oldest">最早优先</option><option value="title">按标题</option></select></label>
  </div>
  <div class="tag-filters" aria-label="按标签筛选，可选多个">
    {#each tagOptions as tag}<button class="filter-chip" aria-pressed={filters.tags.includes(tag)} disabled={!ready} on:click={() => toggleTag(tag)}># {tag}</button>{/each}
  </div>
  <div class="archive-summary">
    <p role="status">找到 <strong>{filtered.length}</strong> 篇文章</p>
    <label class="saved-filter"><input type="checkbox" bind:checked={filters.saved} on:change={syncUrl} disabled={!ready}/> 只看收藏</label>
    <button class="reset-filter" on:click={reset} disabled={!ready}>清除筛选</button>
  </div>
  <noscript><p class="section-description">以下为全部文章；启用 JavaScript 即可使用筛选与收藏。</p></noscript>
  <div class="archive-results">
    {#each filtered as post (post.slug)}
      <article class="archive-item">
        <div class="archive-item-meta"><time datetime={new Date(post.data.published).toISOString()}>{dateLabel(post.data.published)}</time><span>{post.data.category || "未分类"}</span></div>
        <h2><a href={getPostUrlBySlug(post.slug)}>{post.data.title}<span aria-hidden="true">↗</span></a></h2>
        {#if post.data.description}<p>{post.data.description}</p>{/if}
        <div class="archive-item-bottom"><div class="archive-item-tags">{#each post.data.tags as tag}<button on:click={() => toggleTag(tag)} disabled={!ready}>#{tag}</button>{/each}</div><BookmarkButton slug={post.slug} title={post.data.title}/></div>
      </article>
    {:else}
      <div class="empty-state"><span aria-hidden="true">⌕</span><h2>{filters.saved ? "还没有符合条件的收藏" : "暂时没有找到文章"}</h2><p>{filters.saved ? "在文章旁点击「稍后阅读」，或放宽筛选条件。" : "试试更短的关键词，或清除分类与标签。"}</p><button class="tool-button" on:click={reset}>浏览所有文章 →</button></div>
    {/each}
  </div>
</section>
