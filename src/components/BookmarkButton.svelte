<script lang="ts">
import { onMount } from "svelte";
import {
	BOOKMARK_EVENT,
	readBookmarks,
	toggleBookmark,
} from "../utils/preferences";

export let slug: string;
export let title: string;
let saved = false;
let ready = false;
let failed = false;

onMount(() => {
	const update = () => {
		saved = readBookmarks().includes(slug);
	};
	update();
	ready = true;
	window.addEventListener(BOOKMARK_EVENT, update);
	window.addEventListener("storage", update);
	return () => {
		window.removeEventListener(BOOKMARK_EVENT, update);
		window.removeEventListener("storage", update);
	};
});
</script>

<span class="bookmark-control">
	<button class="tool-button" class:is-saved={saved} aria-pressed={saved} aria-label={`${saved ? "取消收藏" : "稍后阅读"}：${title}`} disabled={!ready} on:click={() => { failed = !toggleBookmark(slug); }}>
		<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.7"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke-linejoin="round"/></svg>
		{saved ? "已收藏" : "稍后阅读"}
	</button>
	{#if failed}<span class="storage-error" role="status">浏览器无法存储收藏，请检查存储空间设置。</span>{/if}
</span>
