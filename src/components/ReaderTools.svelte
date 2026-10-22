<script lang="ts">
import { onMount } from "svelte";
import { readPreference, writePreference } from "../utils/preferences";
import BookmarkButton from "./BookmarkButton.svelte";
export let slug: string;
export let title: string;
export let canonical: string;
let size = 1;
let focus = false;
let progress = 0;
let ready = false;
let status = "";
function setSize(value: number) {
	size = Math.max(0.9, Math.min(1.3, Math.round(value * 10) / 10));
	document.documentElement.style.setProperty(
		"--reader-font-size",
		size + "rem",
	);
	if (!writePreference("zebrafish:reader-size", String(size)))
		status = "字号已应用，但浏览器无法存储偏好。";
}
function setFocus() {
	focus = !focus;
	document.documentElement.classList.toggle("reader-focus", focus);
	if (!writePreference("zebrafish:reader-focus", String(focus)))
		status = "专注模式已应用，但浏览器无法存储偏好。";
}
async function share() {
	try {
		await navigator.clipboard.writeText(canonical);
		status = "文章链接已复制。";
	} catch {
		status = "无法使用剪贴板，请复制此链接：" + canonical;
	}
}
onMount(() => {
	const storedSize = Number(readPreference("zebrafish:reader-size"));
	size = storedSize >= 0.9 && storedSize <= 1.3 ? storedSize : 1;
	focus = readPreference("zebrafish:reader-focus") === "true";
	document.documentElement.style.setProperty(
		"--reader-font-size",
		size + "rem",
	);
	document.documentElement.classList.toggle("reader-focus", focus);
	const bar = document.querySelector<HTMLProgressElement>("#reading-progress");
	const article = document.querySelector<HTMLElement>(
		"#post-container .markdown-content",
	);
	let frame = 0;
	const update = () => {
		frame = 0;
		if (!article) return;
		const rect = article.getBoundingClientRect();
		const distance = Math.max(0, rect.height - window.innerHeight);
		progress =
			distance > 0
				? Math.round(Math.min(1, Math.max(0, -rect.top / distance)) * 100)
				: rect.bottom <= window.innerHeight
					? 100
					: 0;
		if (bar) {
			bar.hidden = false;
			bar.value = progress;
		}
	};
	const queue = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};
	window.addEventListener("scroll", queue, { passive: true });
	window.addEventListener("resize", queue);
	const observer = new ResizeObserver(queue);
	if (article) observer.observe(article);
	update();
	ready = true;
	return () => {
		window.removeEventListener("scroll", queue);
		window.removeEventListener("resize", queue);
		observer.disconnect();
		cancelAnimationFrame(frame);
		if (bar) {
			bar.hidden = true;
			bar.value = 0;
		}
		document.documentElement.classList.remove("reader-focus");
		document.documentElement.style.removeProperty("--reader-font-size");
	};
});
</script>
<div class="reader-tools" aria-label="阅读工具" data-pagefind-ignore>
  <button class="tool-button" aria-label="縮小文章字号" disabled={!ready || size <= .9} on:click={() => setSize(size - .1)}>A−</button>
  <button class="tool-button" aria-label="重置文章字号" disabled={!ready} on:click={() => setSize(1)}>{Math.round(size * 100)}%</button>
  <button class="tool-button" aria-label="放大文章字号" disabled={!ready || size >= 1.3} on:click={() => setSize(size + .1)}>A＋</button>
  <button class="tool-button" aria-pressed={focus} disabled={!ready} on:click={setFocus}>{focus ? "退出专注" : "专注阅读"}</button>
  <BookmarkButton {slug} {title}/>
  <button class="tool-button" disabled={!ready} on:click={share}>复制链接 ↗</button>
  <span aria-hidden="true">已读 {progress}%</span>
  {#if status}<span class="share-status" role="status">{status}</span>{/if}
</div>

