<script lang="ts">
import { onMount, tick } from "svelte";
import { url } from "../utils/url-utils";

type Result = { url: string; meta: { title: string }; excerpt: string };
type IndexPost = {
	url: string;
	title: string;
	description: string;
	tags: string[];
	category: string;
};
type Pagefind = {
	search: (
		query: string,
	) => Promise<{ results: { data: () => Promise<Result> }[] }>;
};
export let label = "搜索文章";
let dialog: HTMLDialogElement;
let input: HTMLInputElement;
let query = "";
let results: Result[] = [];
let busy = false;
let error = "";
let fallback = false;
let sequence = 0;
let timer: ReturnType<typeof setTimeout>;
let engine: Promise<Pagefind> | undefined;
let index: Promise<IndexPost[]> | undefined;
let previousFocus: HTMLElement | null = null;
function plainText(value: string) {
	return (
		new DOMParser().parseFromString(value, "text/html").body.textContent || ""
	);
}
async function open() {
	previousFocus = document.activeElement as HTMLElement;
	dialog.showModal();
	await tick();
	input.focus();
	if (query.trim()) schedule(query);
}
function close() {
	sequence++;
	clearTimeout(timer);
	busy = false;
	dialog?.close();
	previousFocus?.focus();
}
async function search(value: string, token: number) {
	try {
		let found: Result[];
		let usingFallback = false;
		try {
			if (import.meta.env.DEV)
				throw new Error("Use local metadata in development");
			engine ??= import(/* @vite-ignore */ url("/pagefind/pagefind.js"));
			const response = await (await engine).search(value);
			found = await Promise.all(
				response.results.slice(0, 8).map((item) => item.data()),
			);
			found = found.map((item) => ({
				...item,
				excerpt: plainText(item.excerpt),
			}));
		} catch {
			usingFallback = true;
			index ??= fetch(url("/search-index.json"))
				.then((response) => {
					if (!response.ok) throw new Error("Index unavailable");
					return response.json();
				})
				.catch((failure) => {
					index = undefined;
					throw failure;
				});
			const terms = value.normalize("NFKC").toLocaleLowerCase().split(/\s+/);
			found = (await index)
				.filter((post) => {
					const text = [
						post.title,
						post.description,
						post.category,
						...post.tags,
					]
						.join(" ")
						.normalize("NFKC")
						.toLocaleLowerCase();
					return terms.every((term) => text.includes(term));
				})
				.slice(0, 8)
				.map((post) => ({
					url: post.url,
					meta: { title: post.title },
					excerpt: post.description,
				}));
		}
		if (token !== sequence) return;
		results = found;
		fallback = usingFallback;
	} catch {
		if (token === sequence) error = "搜索暂时无法使用，请重试或前往文章探索。";
	} finally {
		if (token === sequence) busy = false;
	}
}
function schedule(value: string) {
	query = value;
	const token = ++sequence;
	clearTimeout(timer);
	results = [];
	error = "";
	fallback = false;
	busy = !!query.trim();
	if (query.trim()) timer = setTimeout(() => search(query.trim(), token), 180);
}
onMount(() => {
	const shortcut = (event: KeyboardEvent) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			if (dialog.open) close();
			else open();
		}
	};
	const navigating = () => {
		if (dialog.open) close();
	};
	window.addEventListener("keydown", shortcut);
	document.addEventListener("swup:visit:start", navigating);
	return () => {
		sequence++;
		clearTimeout(timer);
		window.removeEventListener("keydown", shortcut);
		document.removeEventListener("swup:visit:start", navigating);
	};
});
</script>

<button class="search-trigger btn-plain rounded-lg h-10" on:click={open} aria-label={label} aria-haspopup="dialog">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
  <span>搜索</span><kbd>⌘ / Ctrl K</kbd>
</button>
<dialog bind:this={dialog} class="search-dialog" aria-labelledby="search-title" on:cancel={() => close()}>
  <div class="search-dialog-heading"><h2 id="search-title">搜索文章</h2><button class="tool-button" on:click={close} aria-label="关闭搜索">Esc ×</button></div>
  <label class="search-input-label" for="site-search">输入关键词</label>
  <input bind:this={input} id="site-search" type="search" placeholder="搜索标题、内容与标签…" value={query} on:input={event => schedule(event.currentTarget.value)} autocomplete="off"/>
  <div role="status" class="search-status">
    {#if busy}正在搜索…{:else if error}{error}{:else if !query.trim()}从一个关键词开始。使用 Tab 选择结果，Enter 打开文章。{:else if !results.length}没有找到符合「{query}」的文章，试试其他关键词。{:else}显示 {results.length} 篇结果{/if}
    {#if fallback}<span>当前搜索标题、摘要与标签。</span>{/if}
  </div>
  <ul class="search-results">
    {#each results as item}
      <li><a href={item.url} on:click={close}><strong>{item.meta.title}<span aria-hidden="true">↗</span></strong><p>{item.excerpt}</p></a></li>
    {/each}
  </ul>
  <a class="search-all" href={url("/archive/")} on:click={close}>浏览全部文章 →</a>
</dialog>
<style>
.search-trigger { display:flex; gap:.55rem; padding:0 .8rem; color:var(--ink-soft); border-radius:999px; border:1px solid var(--hairline); transition: color .25s, border-color .25s, background-color .25s; }
.search-trigger:hover { color:var(--primary); border-color: color-mix(in oklch, var(--primary) 45%, transparent); background: color-mix(in oklch, var(--card-bg) 55%, transparent); }
.search-trigger kbd { font-family:var(--font-mono); font-size:.6rem; letter-spacing:.04em; padding:.15rem .35rem; border-radius:.4rem; border:1px solid var(--hairline); color:var(--ink-soft); }
.search-trigger span { font-size:.8rem; }
kbd { font: .6rem monospace; border:1px solid var(--outline); border-radius:.25rem; padding:.2rem .3rem; }
.search-dialog { width:min(40rem, calc(100vw - 2rem)); max-height:80dvh; margin:12dvh auto auto; padding:1.5rem; border:1px solid var(--outline); border-radius:1rem; color:var(--text-strong); background:var(--card-bg); box-shadow:0 24px 80px #00152655; overflow:auto; }
.search-dialog::backdrop { background:#071c32a6; backdrop-filter:blur(5px); }
.search-dialog-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }
h2 { font-size:1.2rem; font-weight:700; }
.search-input-label { display:block; font-size:.75rem; margin-bottom:.4rem; color:var(--text-muted); }
input { width:100%; background:var(--page-bg); border:1px solid var(--outline); padding:.85rem 1rem; border-radius:.5rem; font-size:1rem; }
.search-status { color:var(--text-muted); font-size:.8rem; padding:1rem 0; line-height:1.7; }
.search-status span { display:block; }
.search-results a { display:block; border-top:1px solid var(--outline); padding:1rem .4rem; border-radius:.3rem; }
.search-results a:hover { background:var(--btn-regular-bg); }
.search-results strong { display:flex; justify-content:space-between; gap:1rem; }
.search-results strong span { color:var(--btn-content); }
.search-results p { color:var(--text-muted); font-size:.85rem; line-height:1.7; margin-top:.4rem; }
.search-all { display:block; padding-top:1rem; border-top:1px solid var(--outline); color:var(--btn-content); font-size:.8rem; }
@media(max-width:1199px) { kbd {display:none;} }
@media(max-width:767px) { .search-trigger span {display:none;} .search-dialog {padding:1rem;} }
</style>
