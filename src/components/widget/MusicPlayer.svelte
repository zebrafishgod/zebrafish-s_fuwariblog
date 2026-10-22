<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { musicConfig } from "../../config";
import { url } from "../../utils/url-utils";

type Props = { class?: string };
let { class: className = "" }: Props = $props();

const tracks = musicConfig.tracks;
const enabled = musicConfig.enable;
const empty = tracks.length === 0;

let index = $state(0);
let playing = $state(false);
let open = $state(false);
/** True once the toggle was clicked: the panel then stays put until a click elsewhere. */
let pinned = $state(false);
let muted = $state(musicConfig.muteByDefault ?? true);
let progress = $state(0);
let duration = $state(0);
let currentTime = $state(0);
let volume = $state(0.7);
let unavailable = $state(false);

let audio: HTMLAudioElement | undefined;

const track = $derived(tracks[index]);
const label = $derived(
	track ? `${track.name}${track.artist ? ` · ${track.artist}` : ""}` : "",
);

function fmt(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function src(t: (typeof tracks)[number]) {
	return t.url.startsWith("/") ? url(t.url) : t.url;
}

async function play() {
	if (!audio || !track) return;
	unavailable = false;
	try {
		await audio.play();
		playing = true;
	} catch {
		// Blocked or the file is missing: stay quiet rather than throw at the user.
		playing = false;
		unavailable = true;
	}
}

function pause() {
	audio?.pause();
	playing = false;
}

function toggle() {
	pinned = true;
	open = true;
	if (empty) return;
	if (playing) pause();
	else void play();
}

let closeTimer: ReturnType<typeof setTimeout> | undefined;

function cancelClose() {
	clearTimeout(closeTimer);
	closeTimer = undefined;
	if (!pinned) open = true;
}

/* Hovering is discoverable but fragile: a short grace period lets the pointer
   cross into the panel instead of the panel snapping shut on the way. */
function scheduleClose() {
	if (pinned) return;
	clearTimeout(closeTimer);
	closeTimer = setTimeout(() => {
		open = false;
	}, 260);
}

function closeNow() {
	cancelClose();
	pinned = false;
	open = false;
}

function onDocumentPointerDown(event: PointerEvent) {
	if (pinned && !(event.target as Element | null)?.closest?.(".music-root"))
		closeNow();
}

$effect(() => {
	if (!open) return;
	document.addEventListener("pointerdown", onDocumentPointerDown);
	return () =>
		document.removeEventListener("pointerdown", onDocumentPointerDown);
});

function step(delta: number) {
	if (!tracks.length) return;
	index = (index + delta + tracks.length) % tracks.length;
	progress = 0;
	currentTime = 0;
	if (playing) void play();
}

function seek(event: Event) {
	const value = Number((event.currentTarget as HTMLInputElement).value);
	if (audio && Number.isFinite(audio.duration)) {
		audio.currentTime = (value / 100) * audio.duration;
		progress = value;
		currentTime = audio.currentTime;
	}
}

function onVolume(event: Event) {
	volume = Number((event.currentTarget as HTMLInputElement).value) / 100;
	pinned = true; // adjusting volume means the pointer is on the panel; keep it there
	if (audio) {
		audio.volume = volume;
		audio.muted = volume === 0;
	}
}

function toggleMute() {
	if (!audio) return;
	muted = !muted;
	audio.muted = muted;
}

const volumeIcon = $derived(
	muted || volume === 0
		? "material-symbols:volume-off-rounded"
		: volume < 0.5
			? "material-symbols:volume-down-rounded"
			: "material-symbols:volume-up-rounded",
);

onMount(() => {
	if (!audio) return;
	audio.volume = volume;
	audio.muted = muted;
	// Autoplay is only attempted when the visitor opted in by not muting;
	// otherwise the first click starts it.
	if (!muted) void play();
	return () => audio?.pause();
});
</script>

{#if enabled}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="relative {className} music-root"
		role="group"
		aria-label="音乐播放器"
		onmouseleave={scheduleClose}
		onmouseenter={cancelClose}
		onfocusin={cancelClose}
		onfocusout={(event) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node)) scheduleClose();
		}}
		onkeydown={(event) => {
			if (event.key !== "Escape") return;
			closeNow();
			document.getElementById("music-switch")?.focus();
		}}
	>
		<button
			id="music-switch"
			class="music-switch btn-plain scale-animation rounded-lg h-10 w-10 relative"
			class:is-dim={empty}
			aria-label={empty ? "音乐播放器（未配置曲目）" : playing ? "暂停音乐" : "播放音乐"}
			aria-expanded={open}
			onclick={toggle}
			onmouseenter={cancelClose}
		>
			<Icon
				icon={playing ? "material-symbols:pause-rounded" : "material-symbols:music-note-rounded"}
				class="text-[1.25rem]"
			/>
		</button>

			<div class="music-panel float-panel absolute left-1/2 -translate-x-1/2 w-[19rem]"
				class:float-panel-closed={!open}
				class:is-pinned={pinned}
				inert={!open}
			>
				<!-- Unpainted strip that joins the toggle to the panel, so the pointer
				can travel between them without crossing dead space. -->
				<div class="music-bridge" aria-hidden="true"></div>
					<div class="music-body">
						<div class="flex items-center gap-3.5">
							<div class="music-cover" aria-hidden="true">
								<Icon icon="material-symbols:graphic-eq-rounded" class="text-[1.5rem]" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="music-name" title={label} lang="ja">{track?.name ?? musicConfig.name}</p>
								<p class="music-artist" lang="ja">{track?.artist ?? "NO TRACKS"}</p>
							</div>
						</div>

						{#if empty}
							<p class="music-hint">
							还没有曲目。把音频放进 <code>public/music/</code>，再到 <code>src/config.ts</code> 的
							<code>musicConfig.tracks</code> 里登记，播放器就会自动出现。
						</p>
					{:else}
						{#if unavailable}
							<p class="music-hint">音频文件不可用，请确认 <code>public/music/</code> 下的路径正确。</p>
						{/if}

						<div class="music-track">
							<span class="music-time">{fmt(currentTime)}</span>
							<span class="music-bar">
							<span class="music-bar-fill" style={`width:${progress}%`}></span>
							<input
							type="range"
							min="0"
							max="100"
							step="0.1"
							value={progress}
							aria-label="播放进度"
							oninput={seek}
							/>
						</span>
						<span class="music-time">{fmt(duration)}</span>
					</div>

					<div class="flex items-center justify-between mt-3">
						<div class="flex items-center gap-0.5">
							<button class="music-btn btn-plain" aria-label="上一首" onclick={() => step(-1)}>
							<Icon icon="material-symbols:skip-previous-rounded" />
						</button>
						<button class="music-btn btn-plain is-main" aria-label={playing ? "暂停" : "播放"} onclick={toggle}>
						<Icon icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} />
					</button>
					<button class="music-btn btn-plain" aria-label="下一首" onclick={() => step(1)}>
					<Icon icon="material-symbols:skip-next-rounded" />
				</button>
			</div>
			<div class="flex items-center gap-2">
				<button class="music-btn btn-plain" aria-label={muted ? "取消静音" : "静音"} onclick={toggleMute}>
				<Icon icon={volumeIcon} />
			</button>
			<input
			class="music-volume"
			type="range"
			min="0"
			max="100"
			value={volume * 100}
			aria-label="音量"
			oninput={onVolume}
			/>
		</div>
	</div>
{/if}
</div>
			</div>

	</div>

	<audio
		bind:this={audio}
		src={track ? src(track) : undefined}
		preload="metadata"
		onplay={() => (playing = true)}
		onpause={() => (playing = false)}
		onloadedmetadata={(event) => (duration = event.currentTarget.duration)}
		ontimeupdate={(event) => {
			const el = event.currentTarget;
			currentTime = el.currentTime;
			progress = Number.isFinite(el.duration) && el.duration > 0 ? (el.currentTime / el.duration) * 100 : 0;
		}}
		onended={() => step(1)}
		onerror={() => {
			playing = false;
			unavailable = true;
		}}
	></audio>
{/if}

<style>
	.music-switch {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* Open means something is showing under this toggle — give it a resting
	   tint so the panel's origin is obvious at a glance. */
	.music-switch[aria-expanded="true"] {
		color: var(--primary);
	}
	/* No tracks configured: keep the control discoverable but visually recede,
	   so the header never looks like it is missing a button. */
	.music-switch.is-dim {
		opacity: 0.42;
	}
	.music-switch.is-dim:hover {
		opacity: 1;
	}
	/* The panel element only positions and animates; the surface is painted once,
	   by .music-body. Previously both the panel and an inner .card-base carried
	   .float-panel, so the background, border, radius, shadow and backdrop-blur
	   were all drawn twice and the doubled edge read as a ghost.
	   top is the toggle's height (2.5rem) minus 1px: the overlap removes the
	   hairline row the rounded edges leave, which would end the hover when the
	   pointer crossed it. */
	.music-panel {
		top: calc(2.5rem - 1px);
		background: none;
		border: 0;
		box-shadow: none;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		overflow: visible;
	}
	.music-body {
		border-radius: var(--radius-large);
		background: color-mix(in oklch, var(--float-panel-bg) 84%, transparent);
		backdrop-filter: blur(24px) saturate(170%);
		-webkit-backdrop-filter: blur(24px) saturate(170%);
		border: 1px solid var(--hairline-strong);
		box-shadow: 0 30px 60px -24px oklch(0.25 0.08 var(--hue) / 0.38);
		padding: 1rem;
	}
	.music-bridge {
		position: relative;
		height: 0.85rem;
	}
	.music-bridge::after {
		content: "";
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: -0.25rem;
		transform: translateY(50%) rotate(45deg);
		background: color-mix(in oklch, var(--float-panel-bg) 84%, transparent);
		border-left: 1px solid var(--hairline-strong);
		border-top: 1px solid var(--hairline-strong);
	}
	/* Pinned (opened by click) reads as "locked on", so the state is legible. */
	.music-panel.is-pinned .card-base {
		border-color: color-mix(in oklch, var(--primary) 32%, var(--hairline-strong));
	}
	/* The toggle sits near the right edge on narrow screens, so centring the
	   panel under it would push it past the viewport. Anchor it to the right
	   instead, and let it be a little narrower there. */
	@media (max-width: 767px) {
		.music-panel {
			left: auto;
			right: -0.5rem;
			transform: none;
			width: min(19rem, calc(100vw - 2rem));
		}
	}
	.music-cover {
		display: grid;
		place-items: center;
		width: 2.85rem;
		height: 2.85rem;
		flex: none;
		border-radius: 0.7rem;
		border: 1px solid var(--hairline-strong);
		background: color-mix(in oklch, var(--btn-regular-bg) 90%, transparent);
		color: var(--primary);
	}
	/* Track names are Japanese, and this panel is on every page -- including the
	   home page -- where it sits inside an `inert`, visibility:hidden container.
	   Hidden text still takes part in font matching, so leaving these on the
	   CJK-capable stacks made the browser fetch two Noto Serif SC slices for one
	   never-seen line, on first paint of every page. `font-display: swap` then
	   repainted the line in the fallback face, which is what showed up as the
	   whole page settling into its real fonts a moment after load.
	   These two rules therefore name Latin-only faces explicitly: a Japanese
	   glyph has no match here, falls straight through to the system Japanese
	   font in the generic fallback, and never reaches the CJK webfont.
	   `lang="ja"` is set on the elements so the fallback gets language-correct
	   glyph shapes. */
	.music-name {
		font-family: "Instrument Serif", Georgia, serif;
		font-size: 0.86rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.music-artist {
		margin-top: 0.2rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.56rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--ink-soft);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.music-hint {
		margin-top: 0.7rem;
		font-size: 0.68rem;
		line-height: 1.6;
		color: var(--ink-soft);
	}
	.music-hint code {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		padding: 0.1rem 0.3rem;
		border-radius: 0.3rem;
		background: var(--btn-regular-bg);
	}

	.music-track {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 0.95rem;
	}
	.music-time {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	.music-bar {
		position: relative;
		flex: 1;
		height: 1.1rem;
		display: flex;
		align-items: center;
	}
	/* hairline track that fills with the accent colour — no chrome */
	.music-bar::before {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 2px;
		background: var(--hairline-strong);
	}
	.music-bar-fill {
		position: absolute;
		left: 0;
		height: 2px;
		border-radius: 2px;
		background: var(--primary);
		transition: width 0.15s linear;
	}
	.music-bar input {
		position: relative;
		z-index: 1;
		width: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.music-bar input:focus-visible + *,
	.music-bar input:focus-visible {
		outline: none;
	}
	.music-bar:has(input:focus-visible)::before {
		box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 35%, transparent);
	}

	/* Buttons stay transparent until touched, matching the rest of the header. */
	.music-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 999px;
		font-size: 1.15rem;
		color: var(--ink-soft);
		transition: color 0.25s, background-color 0.25s;
	}
	.music-btn:hover {
		color: var(--primary);
		background: var(--btn-regular-bg);
	}
	.music-btn.is-main {
		width: 2.35rem;
		height: 2.35rem;
		font-size: 1.4rem;
		color: var(--ink);
		border: 1px solid var(--hairline-strong);
	}

	.music-volume {
		width: 3.5rem;
		height: 1rem;
		cursor: pointer;
		accent-color: var(--primary);
	}
</style>
