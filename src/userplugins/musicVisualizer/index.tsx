/*
 * DDT Music Studio v4 LITE — built for low-end PCs
 *
 * Same look as the full edition (beat-synced EDM overlay + kinetic lyrics + pro HUD) but engineered to be cheap:
 *  - No mix-blend-mode, no backdrop-filter, no blur filters, no per-frame CSS-variable writes, no grain
 *  - FX canvas renders at a tiny internal resolution (192–384 px wide) and is upscaled by the compositor
 *  - Hard FPS cap + AUTO governor that measures real frame times and steps down quality tiers by itself
 *  - Lyric/title animations use transform + opacity only (no layout, no repaint)
 *  - Beat pulse / shake use the Web Animations API (compositor), never per-frame JS styling
 *  - Zero allocations in the hot loop (typed-array particles, no gradients per particle)
 */

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { React } from "@webpack/common";

const Native = (VencordNative?.pluginHelpers?.MusicVisualizer ?? {}) as PluginNative<typeof import("./native")>;

// ─── Settings ────────────────────────────────────────────────────────────────
const settings = definePluginSettings({
    overlayEnabled: {
        type: OptionType.BOOLEAN,
        description: "Cinematic overlay (EDM FX + kinetic lyrics) on top of Discord",
        default: true,
        onChange: () => refreshOverlay()
    },
    performance: {
        type: OptionType.SELECT,
        description: "Performance mode",
        options: [
            { label: "Auto (measures your PC and lowers quality if needed)", value: "auto", default: true },
            { label: "Balanced (full lite FX, fixed)", value: "balanced" },
            { label: "Minimal (bars + ring only, 15 FPS)", value: "minimal" },
            { label: "Text only (lyrics + title card, no canvas)", value: "textonly" },
        ],
        onChange: () => { tier = 0; resetGovernor(); refreshOverlay(); }
    },
    fpsCap: {
        type: OptionType.SELECT,
        description: "FPS cap for all visuals (lower = lighter)",
        options: [
            { label: "10 FPS", value: 10 },
            { label: "15 FPS", value: 15 },
            { label: "24 FPS", value: 24 },
            { label: "30 FPS", value: 30, default: true },
        ]
    },
    overlayOpacity: {
        type: OptionType.SLIDER,
        description: "EDM FX opacity",
        markers: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        default: 0.55,
        stickToMarkers: false
    },
    edmIntensity: {
        type: OptionType.SLIDER,
        description: "EDM intensity (particles, shockwaves, lasers)",
        markers: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5],
        default: 1,
        stickToMarkers: false
    },
    lyricStyle: {
        type: OptionType.SELECT,
        description: "Lyric animation style",
        options: [
            { label: "Auto (changes per line)", value: "auto", default: true },
            { label: "Pop", value: "pop" },
            { label: "Mask reveal", value: "mask" },
            { label: "Slam", value: "slam" },
            { label: "Glitch", value: "glitch" },
            { label: "Cinematic", value: "cinematic" },
        ]
    },
    lyricPosition: {
        type: OptionType.SELECT,
        description: "Lyric position",
        options: [
            { label: "Center", value: "center", default: true },
            { label: "Lower third", value: "lower" },
            { label: "Upper", value: "upper" },
        ]
    },
    lyricScale: {
        type: OptionType.SLIDER,
        description: "Lyric size",
        markers: [0.6, 0.8, 1, 1.2, 1.4, 1.6],
        default: 1,
        stickToMarkers: false
    },
    screenShake: {
        type: OptionType.BOOLEAN,
        description: "Camera shake on heavy kicks (overlay only)",
        default: false
    },
    letterbox: {
        type: OptionType.BOOLEAN,
        description: "Cinema letterbox bars",
        default: false
    },
    visualizerMode: {
        type: OptionType.SELECT,
        description: "HUD visualizer style",
        options: [
            { label: "Mirrored pills", value: "spotify", default: true },
            { label: "Stage bars", value: "edm" },
            { label: "Aurora line", value: "aurora" },
        ]
    },
    youtubeApiKey: {
        type: OptionType.STRING,
        description: "YouTube Data API key (used for search). Restrict/rotate this key — it was hardcoded before.",
        default: "AIzaSyB_Tw5LU_twNFDYqN9F5yjQAAxEBt5Q4Sk"
    },
    autoStartRelay: {
        type: OptionType.BOOLEAN,
        description: "Start the music relay server when Discord starts (otherwise it starts on first play)",
        default: false
    }
});

// ─── Constants ───────────────────────────────────────────────────────────────
const RELAY = "http://localhost:3124";
const STREAM = `${RELAY}/stream`;
const LYRICS_URL = `${RELAY}/lyrics`;
const LS_KEY = "ddt-mv-state-v4"; // shared with the full edition so your queue carries over
const BANDS = 32;
const LYRIC_LEAD = 0.12;

// Quality tiers. AUTO starts at 0 and only ever steps down.
interface Tier { fps: number; w: number; ring: number; lasers: number; maxP: number; leaks: boolean; canvas: boolean; }
const TIERS: Tier[] = [
    { fps: 30, w: 384, ring: 48, lasers: 4, maxP: 90, leaks: true, canvas: true },
    { fps: 24, w: 288, ring: 32, lasers: 0, maxP: 36, leaks: false, canvas: true },
    { fps: 15, w: 192, ring: 24, lasers: 0, maxP: 0, leaks: false, canvas: true },
    { fps: 10, w: 0, ring: 0, lasers: 0, maxP: 0, leaks: false, canvas: false },
];
let tier = 0;
function activeTier(): number {
    const p = settings.store.performance;
    return p === "balanced" ? 0 : p === "minimal" ? 2 : p === "textonly" ? 3 : tier;
}
const effFps = () => Math.min(settings.store.fpsCap || 30, TIERS[activeTier()].fps);

// ─── Types ───────────────────────────────────────────────────────────────────
interface SongItem { title: string; artist: string; videoId: string; thumb: string; }
interface LyricLine { time: number; text: string; }
type Repeat = "off" | "all" | "one";
type TabId = "search" | "lyrics" | "queue" | "fx";
type LyricsState = "idle" | "loading" | "synced" | "plain" | "none";

interface Persist {
    vol: number; muted: boolean;
    hud: { x: number; y: number }; mini: { x: number; y: number };
    repeat: Repeat; shuffle: boolean; tab: TabId;
    queue: SongItem[]; queueIdx: number;
}
const P: Persist = {
    vol: 0.8, muted: false,
    hud: { x: 120, y: 80 }, mini: { x: Math.max(16, window.innerWidth - 340), y: Math.max(16, window.innerHeight - 84) },
    repeat: "all", shuffle: false, tab: "search", queue: [], queueIdx: 0
};

function loadPersist() {
    try {
        const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        if (raw && typeof raw === "object") {
            if (typeof raw.vol === "number") P.vol = clamp(raw.vol, 0, 1);
            if (typeof raw.muted === "boolean") P.muted = raw.muted;
            if (raw.hud && isFinite(raw.hud.x) && isFinite(raw.hud.y)) P.hud = raw.hud;
            if (raw.mini && isFinite(raw.mini.x) && isFinite(raw.mini.y)) P.mini = raw.mini;
            if (["off", "all", "one"].includes(raw.repeat)) P.repeat = raw.repeat;
            if (typeof raw.shuffle === "boolean") P.shuffle = raw.shuffle;
            if (["search", "lyrics", "queue", "fx"].includes(raw.tab)) P.tab = raw.tab;
            if (Array.isArray(raw.queue)) P.queue = raw.queue.filter((s: any) => s && typeof s.videoId === "string").slice(0, 200);
            if (typeof raw.queueIdx === "number") P.queueIdx = clamp(raw.queueIdx | 0, 0, Math.max(0, P.queue.length - 1));
        }
    } catch { /* corrupted state — ignore */ }
}
function savePersist() { try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch { /* ignore */ } }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const HTML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, c => HTML_ESC[c]);
function decodeEntities(s: string) { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }
function fmt(sec: number) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
const hsla = (h: number, s: number, l: number, a = 1) =>
    `hsla(${(((h % 360) + 360) % 360) | 0},${s}%,${l}%,${clamp(a, 0, 1).toFixed(2)})`;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    if ((ctx as any).roundRect) { (ctx as any).roundRect(x, y, w, h, rr); return; }
    ctx.rect(x, y, w, h);
}

const ic = (size: number, d: string) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
const Icons = {
    play: ic(18, "M8 5v14l11-7z"),
    pause: ic(18, "M6 19h4V5H6v14zm8-14v14h4V5h-4z"),
    stop: ic(14, "M6 6h12v12H6z"),
    prev: ic(18, "M6 6h2v12H6zm3.5 6l8.5 6V6z"),
    next: ic(18, "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"),
    music: ic(18, "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"),
    search: ic(16, "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"),
    volume: ic(18, "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"),
    mute: ic(18, "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"),
    expand: ic(14, "M15 3l2.3 2.3-3.89 3.89 1.41 1.41L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 3.89 3.89 1.41-1.41L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 3.89-3.89-1.41-1.41L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-3.89-3.89-1.41 1.41 3.89 3.89L15 21h6v-6z"),
    shuffle: ic(16, "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"),
    repeat: ic(16, "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"),
    repeatOne: ic(16, "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"),
    close: ic(14, "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"),
    minimize: ic(14, "M6 19h12v2H6z"),
    add: ic(15, "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"),
    trash: ic(15, "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"),
    sparkle: ic(15, "M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"),
};

// ─── Runtime state ───────────────────────────────────────────────────────────
let hudEl: HTMLDivElement | null = null;
let miniEl: HTMLDivElement | null = null;
let ovEl: HTMLDivElement | null = null;
let fxCanvas: HTMLCanvasElement | null = null;
let fxCtx: CanvasRenderingContext2D | null = null;
let hudCanvas: HTMLCanvasElement | null = null;
let miniCanvas: HTMLCanvasElement | null = null;
let resizeObs: ResizeObserver | null = null;

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let srcNode: MediaElementAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let gainNode: GainNode | null = null;
let freqBuf: Uint8Array | null = null;

let currentSong: SongItem | null = null;
let isPlaying = false;
let stopped = true;
let playToken = 0;
let retryCount = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

let searchResults: SongItem[] = [];
let lyrics: LyricLine[] = [];
let plainLyrics = "";
let lyricsState: LyricsState = "idle";
let lyricIdx = -1;

let serverReady = false;
let relayPromise: Promise<boolean> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

let scrubbing = false;
let scrubPreview = 0;

// ─── Relay management ────────────────────────────────────────────────────────
async function checkServer(): Promise<boolean> {
    try {
        const r = await fetch(`${RELAY}/health`, { signal: AbortSignal.timeout(1200) });
        return r.ok;
    } catch { return false; }
}

function setRelayBadge(ok: boolean) {
    serverReady = ok;
    byId("ddt-relay")?.classList.toggle("online", ok);
    const l = byId("ddt-relay-label");
    if (l) l.textContent = ok ? "Relay online" : "Relay offline";
}

function ensureRelay(): Promise<boolean> {
    if (relayPromise) return relayPromise;
    relayPromise = (async () => {
        try {
            if (await checkServer()) { setRelayBadge(true); return true; }
            setStatus("Starting relay…", true);
            await Native?.startServer?.();
            for (let i = 0; i < 20; i++) {
                if (await checkServer()) { setRelayBadge(true); return true; }
                await sleep(400);
            }
        } catch (e) { console.error("[DDT Music] relay start failed:", e); }
        setRelayBadge(false);
        return false;
    })().finally(() => { relayPromise = null; });
    return relayPromise;
}

function startPoll() {
    if (pollTimer) return;
    // Slow poll — only needed so the badge flips when the relay dies; skipped entirely while the HUD is closed.
    pollTimer = setInterval(async () => {
        if (!hudEl || hudEl.classList.contains("hidden")) return;
        const ok = await checkServer();
        if (ok !== serverReady) setRelayBadge(ok);
    }, 6000);
}
function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

// ─── Audio graph (source → analyser → gain → out) ────────────────────────────
const bands = new Float32Array(BANDS);
const peaks = new Float32Array(BANDS);
const tmpTargets = new Float32Array(BANDS);
let bandRanges: Array<[number, number]> = [];
let bassR: [number, number] = [1, 4], midR: [number, number] = [4, 40], highR: [number, number] = [40, 200];

function buildBands() {
    if (!audioCtx || !analyser) return;
    const binHz = audioCtx.sampleRate / analyser.fftSize;
    const fmin = 50, fmax = Math.min(14000, audioCtx.sampleRate / 2 - 100);
    const edge = (i: number) => fmin * Math.pow(fmax / fmin, i / BANDS);
    bandRanges = [];
    for (let i = 0; i < BANDS; i++) {
        const b0 = Math.max(1, Math.floor(edge(i) / binHz));
        const b1 = Math.max(b0 + 1, Math.ceil(edge(i + 1) / binHz));
        bandRanges.push([b0, b1]);
    }
    const r = (f0: number, f1: number): [number, number] => [Math.max(1, Math.floor(f0 / binHz)), Math.max(2, Math.ceil(f1 / binHz))];
    bassR = r(40, 160); midR = r(160, 2000); highR = r(2000, 12000);
}

function ensureAudio() {
    if (!audioEl) {
        const a = new Audio();
        a.crossOrigin = "anonymous";
        a.preload = "auto";
        audioEl = a;

        a.addEventListener("play", () => { isPlaying = true; onPlayState(); });
        a.addEventListener("playing", () => { retryCount = 0; setStatus("", false); isPlaying = true; onPlayState(); });
        a.addEventListener("pause", () => { isPlaying = false; onPlayState(); });
        a.addEventListener("waiting", () => setStatus("Buffering…", true));
        a.addEventListener("ended", onEnded);
        a.addEventListener("error", () => {
            if (!a.getAttribute("src") || !currentSong) return;
            if (retryCount < 1) {
                retryCount++;
                const resumeAt = a.currentTime;
                const song = currentSong;
                setStatus("Reconnecting…", true);
                ensureRelay().then(ok => {
                    if (!ok || !audioEl || currentSong !== song) { setStatus("Stream error — relay unreachable", false); return; }
                    audioEl.src = `${STREAM}/${encodeURIComponent(song.videoId)}`;
                    audioEl.addEventListener("loadedmetadata", () => { if (audioEl && resumeAt > 1) audioEl.currentTime = resumeAt; }, { once: true });
                    audioEl.play().catch(() => { });
                });
            } else {
                isPlaying = false; onPlayState();
                setStatus("Stream error — try another track", false);
            }
        });
    }

    if (!audioCtx) {
        try {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx = new AC({ latencyHint: "playback" }); // larger buffers = fewer glitches on slow CPUs
        } catch (e) { console.warn("[DDT Music] AudioContext unavailable:", e); }
    }

    if (audioCtx && audioEl && !srcNode) {
        try {
            srcNode = audioCtx.createMediaElementSource(audioEl);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.4;
            analyser.minDecibels = -85;
            analyser.maxDecibels = -20;
            gainNode = audioCtx.createGain();
            srcNode.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            freqBuf = new Uint8Array(analyser.frequencyBinCount);
            buildBands();
            applyVolume(true);
        } catch (e) {
            console.warn("[DDT Music] audio graph failed — plain playback:", e);
            srcNode = null; analyser = null; gainNode = null;
        }
    }
}

const gainFor = () => (P.muted ? 0 : P.vol * P.vol);

function applyVolume(instant = false, dur = 0.08) {
    if (gainNode && audioCtx) {
        const now = audioCtx.currentTime;
        const g = gainNode.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        if (instant) g.setValueAtTime(gainFor(), now);
        else g.linearRampToValueAtTime(gainFor(), now + dur);
        if (audioEl) audioEl.volume = 1;
    } else if (audioEl) audioEl.volume = gainFor();
}

function fadeOut(dur = 0.08) {
    if (!gainNode || !audioCtx) return;
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + dur);
}

// ─── Playback ────────────────────────────────────────────────────────────────
const streamUrl = (s: SongItem) => `${STREAM}/${encodeURIComponent(s.videoId)}`;

async function playSong(song: SongItem) {
    const token = ++playToken;
    ensureAudio();
    if (!audioEl) return;
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }

    if (isPlaying) { fadeOut(0.06); await sleep(70); if (token !== playToken) return; }

    currentSong = song;
    stopped = false;
    retryCount = 0;
    lyrics = []; plainLyrics = ""; lyricsState = "loading"; lyricIdx = -1;
    syncNowPlayingUI();
    renderLyricsTab();
    showOverlayLine(-1);
    refreshOverlay();
    triggerLowerThird();
    updateMediaSession();
    setStatus("Connecting…", true);

    if (!serverReady) {
        const ok = await ensureRelay();
        if (token !== playToken) return;
        if (!ok) { setStatus("Relay offline — click the relay badge to retry", false); return; }
    }

    audioEl.src = streamUrl(song);
    audioEl.load();
    void fetchLyrics(song, token);

    try {
        await audioCtx?.resume();
        applyVolume(true);
        await audioEl.play();
    } catch (e: any) {
        if (token !== playToken || e?.name === "AbortError") return;
        console.warn("[DDT Music] play() rejected:", e);
        setStatus("Press play to start", false);
    }
}

function togglePlay() {
    if (!audioEl || !audioEl.getAttribute("src")) {
        const s = currentSong ?? P.queue[P.queueIdx] ?? P.queue[0];
        if (s) void playSong(s);
        return;
    }
    if (audioEl.paused) {
        if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
        void audioCtx?.resume();
        audioEl.play().catch(() => { });
        applyVolume(false, 0.12);
    } else {
        fadeOut(0.08);
        pauseTimer = setTimeout(() => { pauseTimer = null; audioEl?.pause(); }, 90);
    }
}

function stopPlayback() {
    const tok = ++playToken;
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    fadeOut(0.06);
    const a = audioEl;
    setTimeout(() => {
        if (!a || tok !== playToken) return;
        a.pause();
        a.removeAttribute("src");
        a.load();
    }, 70);
    isPlaying = false;
    stopped = true;
    lyricIdx = -1;
    showOverlayLine(-1);
    onPlayState();
    refreshOverlay();
    setStatus("", false);
    kick();
}

function onEnded() {
    if (P.repeat === "one" && currentSong) { void playSong(currentSong); return; }
    const last = P.queueIdx >= P.queue.length - 1;
    if (P.repeat === "off" && last && !P.shuffle) { stopPlayback(); return; }
    playNext();
}

function playAt(i: number) {
    if (!P.queue.length) return;
    P.queueIdx = ((i % P.queue.length) + P.queue.length) % P.queue.length;
    savePersist();
    void playSong(P.queue[P.queueIdx]);
    renderQueueTab();
}

function playNext() {
    if (!P.queue.length) return;
    if (P.shuffle && P.queue.length > 1) {
        let n = P.queueIdx;
        while (n === P.queueIdx) n = Math.floor(Math.random() * P.queue.length);
        playAt(n);
    } else playAt(P.queueIdx + 1);
}

function playPrev() {
    if (audioEl && audioEl.currentTime > 4) { seek(0); return; }
    if (P.queue.length) playAt(P.queueIdx - 1);
}

function seek(sec: number) {
    if (!audioEl || !isFinite(audioEl.duration) || audioEl.duration <= 0) return;
    audioEl.currentTime = clamp(sec, 0, audioEl.duration);
    syncLyrics(true);
    updateTimeUI(true);
}

function setVolume(v: number) {
    P.vol = clamp(v, 0, 1);
    if (P.vol > 0) P.muted = false;
    applyVolume();
    refreshVolumeUI();
    savePersist();
}
function toggleMute() { P.muted = !P.muted; applyVolume(); refreshVolumeUI(); savePersist(); }

function addToQueue(song: SongItem, play = false) {
    let i = P.queue.findIndex(s => s.videoId === song.videoId);
    if (i < 0) { P.queue.push(song); i = P.queue.length - 1; }
    savePersist();
    if (play) playAt(i); else renderQueueTab();
    updateQueueBadge();
}

function onPlayState() {
    const html = isPlaying ? Icons.pause : Icons.play;
    const p = byId("ddt-play"); if (p) p.innerHTML = html;
    const m = byId("ddt-mini-play"); if (m) m.innerHTML = html;
    byId("ddt-music-launcher-btn")?.classList.toggle("playing", isPlaying);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = isPlaying ? "playing" : (stopped ? "none" : "paused");
    kick();
}

// ─── Media session ───────────────────────────────────────────────────────────
function bindMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, fn: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported */ } };
    set("play", () => { if (!isPlaying) togglePlay(); });
    set("pause", () => { if (isPlaying) togglePlay(); });
    set("previoustrack", playPrev);
    set("nexttrack", playNext);
    set("stop", stopPlayback);
}
function unbindMediaSession() {
    if (!("mediaSession" in navigator)) return;
    for (const a of ["play", "pause", "previoustrack", "nexttrack", "stop"] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(a, null); } catch { /* ignore */ }
    }
    navigator.mediaSession.metadata = null;
}
function updateMediaSession() {
    if (!("mediaSession" in navigator) || !currentSong) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title, artist: currentSong.artist,
            artwork: currentSong.thumb ? [{ src: currentSong.thumb }] : []
        });
    } catch { /* ignore */ }
}

// ─── Search & lyrics ─────────────────────────────────────────────────────────
function parseSong(item: any): SongItem | null {
    const id = item?.id?.videoId;
    if (!id) return null;
    const sn = item.snippet ?? {};
    const rawTitle = decodeEntities(String(sn.title ?? ""));
    const channel = decodeEntities(String(sn.channelTitle ?? "")).replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
    let title = rawTitle
        .replace(/\s*[(\[][^)\]]*(official|lyric|audio|video|visuali[sz]er|hd|4k|remaster)[^)\]]*[)\]]/gi, "")
        .trim();
    let artist = channel;
    const parts = title.split(/\s[-–—]\s/);
    if (parts.length >= 2) { artist = parts[0].trim(); title = parts.slice(1).join(" - ").trim(); }
    return {
        title: title || rawTitle, artist, videoId: id,
        // smallest thumbnail = least decode + memory on weak PCs
        thumb: sn.thumbnails?.default?.url || sn.thumbnails?.medium?.url || ""
    };
}

async function doSearch(query: string) {
    const q = query.trim();
    if (!q) return;
    const key = (settings.store.youtubeApiKey || "").trim();
    if (!key) { setStatus("Add a YouTube API key in plugin settings", false); return; }
    setStatus("Searching…", true);
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=12&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
            setStatus(res.status === 403 ? "YouTube quota exceeded or key restricted" : `Search failed (${res.status})`, false);
            return;
        }
        const data = await res.json();
        searchResults = (data.items ?? []).map(parseSong).filter(Boolean) as SongItem[];
        renderSearchTab();
        setStatus(searchResults.length ? "" : "No results", false);
    } catch (e) {
        console.error("[DDT Music] search failed:", e);
        setStatus("Search failed — check connection", false);
    }
}

function parseLrc(text: string): LyricLine[] {
    const out: LyricLine[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
        if (!stamps.length) continue;
        const line = raw.replace(/\[[^\]]*\]/g, "").replace(/<\d{1,3}:\d{2}(?:\.\d+)?>/g, "").trim();
        if (!line) continue;
        for (const m of stamps) {
            const frac = m[3] ? parseInt(m[3], 10) / Math.pow(10, m[3].length) : 0;
            out.push({ time: parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac, text: line });
        }
    }
    return out.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(song: SongItem, token: number) {
    try {
        const res = await fetch(LYRICS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track: song.title, artist: song.artist }),
            signal: AbortSignal.timeout(9000)
        });
        if (token !== playToken) return;
        if (res.ok) {
            const data = await res.json();
            if (token !== playToken) return;
            if (data?.syncedLyrics) {
                lyrics = parseLrc(String(data.syncedLyrics));
                lyricsState = lyrics.length ? "synced" : "none";
            } else if (data?.plainLyrics) {
                plainLyrics = String(data.plainLyrics);
                lyricsState = "plain";
            } else lyricsState = "none";
        } else lyricsState = "none";
    } catch {
        if (token !== playToken) return;
        lyricsState = "none";
    }
    renderLyricsTab();
    syncLyrics(true);
}

function syncLyrics(force = false) {
    if (lyricsState !== "synced" || !audioEl || !lyrics.length) {
        if (lyricIdx !== -1 && lyricsState !== "synced") { lyricIdx = -1; showOverlayLine(-1); }
        return;
    }
    const t = audioEl.currentTime + LYRIC_LEAD;
    let lo = 0, hi = lyrics.length - 1, idx = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lyrics[mid].time <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (idx !== lyricIdx || force) {
        lyricIdx = idx;
        showOverlayLine(idx);
        markActiveLyric();
    }
}

// ─── Analysis ────────────────────────────────────────────────────────────────
const fx = {
    bass: 0, mid: 0, high: 0, energy: 0,
    beat: 0, big: 0, maxBand: 0,
    bassAvg: 0, lastBass: 0, lastBeat: 0,
    hue: 260, mode: "idle" as "idle" | "live" | "sim",
    everLive: false, silentFrames: 0
};

function avgRange(buf: Uint8Array, r: [number, number]) {
    let s = 0; const e = Math.min(r[1], buf.length);
    for (let i = r[0]; i < e; i++) s += buf[i];
    return e > r[0] ? s / ((e - r[0]) * 255) : 0;
}

function updateAnalysis(dt: number, now: number) {
    const targets = tmpTargets;
    let bass = 0, mid = 0, high = 0;
    let live = false;

    if (analyser && freqBuf && isPlaying) {
        analyser.getByteFrequencyData(freqBuf as any);
        let sum = 0; for (let i = 1; i < 48; i++) sum += freqBuf[i];
        live = sum > 0;
    }

    if (live && freqBuf) {
        fx.everLive = true; fx.silentFrames = 0; fx.mode = "live";
        for (let i = 0; i < BANDS; i++) {
            const [b0, b1] = bandRanges[i] ?? [1, 2];
            let s = 0; for (let k = b0; k < b1 && k < freqBuf.length; k++) s += freqBuf[k];
            const v = s / (Math.max(1, b1 - b0) * 255);
            targets[i] = Math.pow(clamp(v * (0.8 + 0.55 * (i / BANDS)), 0, 1), 1.35);
        }
        bass = Math.pow(avgRange(freqBuf, bassR), 1.2);
        mid = Math.pow(avgRange(freqBuf, midR), 1.3);
        high = Math.pow(avgRange(freqBuf, highR), 1.4) * 1.4;
    } else if (isPlaying) {
        fx.silentFrames++;
        // Analyser never produced data (relay without CORS headers) → clearly synthetic fallback at 124 BPM
        if (!fx.everLive && fx.silentFrames > 45) {
            fx.mode = "sim";
            const t = (audioEl?.currentTime ?? now / 1000);
            const kickEnv = Math.exp(-((t * 124 / 60) % 1) * 6);
            for (let i = 0; i < BANDS; i++) {
                const w = 0.28 + 0.22 * Math.sin(t * 2.7 + i * 0.5) + 0.14 * Math.cos(t * 4.3 - i * 0.8);
                targets[i] = clamp(w + (i < 7 ? kickEnv * 0.55 : kickEnv * 0.08), 0, 1);
            }
            bass = kickEnv * 0.85; mid = 0.35 + 0.15 * Math.sin(t * 3); high = 0.25 + 0.12 * Math.sin(t * 5.1);
        } else targets.fill(0);
    } else {
        fx.mode = "idle";
        targets.fill(0);
    }

    // Frame-rate independent smoothing (dt is large at low FPS)
    const up = 1 - Math.exp(-dt * 38), down = 1 - Math.exp(-dt * 9);
    let mx = 0;
    for (let i = 0; i < BANDS; i++) {
        bands[i] += (targets[i] - bands[i]) * (targets[i] > bands[i] ? up : down);
        if (bands[i] > peaks[i]) peaks[i] = bands[i]; else peaks[i] = Math.max(0, peaks[i] - dt * 0.45);
        if (bands[i] > mx) mx = bands[i];
    }
    fx.maxBand = mx;

    const sm = (cur: number, tgt: number) => cur + (tgt - cur) * (tgt > cur ? up : down);
    fx.bass = sm(fx.bass, bass); fx.mid = sm(fx.mid, mid); fx.high = sm(fx.high, high);
    fx.energy += (fx.bass * 0.5 + fx.mid * 0.35 + fx.high * 0.15 - fx.energy) * (1 - Math.exp(-dt * 0.7));

    fx.bassAvg += (bass - fx.bassAvg) * (1 - Math.exp(-dt * 1.6));
    const thr = fx.bassAvg * 1.22 + 0.06;
    if (isPlaying && fx.mode !== "idle" && bass > thr && bass - fx.lastBass > 0.012 && now - fx.lastBeat > 190) {
        fx.lastBeat = now;
        const strength = clamp((bass - thr) / 0.25 + 0.5, 0.4, 1.4);
        fx.beat = Math.max(fx.beat, Math.min(1, strength));
        if (strength > 0.95) fx.big = 1;
        onBeat(strength);
    }
    fx.lastBass = bass;
    fx.beat *= Math.exp(-dt * 6.5);
    fx.big *= Math.exp(-dt * 4);

    fx.hue = 255 + 75 * Math.sin(now * 0.00018) + fx.high * 25;
}

// ─── FX engine (tiny canvas, no gradients per particle, no blend modes) ──────
const MAXP = 90;
const pX = new Float32Array(MAXP), pY = new Float32Array(MAXP), pVX = new Float32Array(MAXP), pVY = new Float32Array(MAXP);
const pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP), pSize = new Float32Array(MAXP), pHue = new Float32Array(MAXP);
let pCount = 0;
const rings: Array<{ r: number; a: number; v: number }> = [];
const pal: string[] = ["", "", "", "", ""]; // precomputed particle colours (no string building per particle)
let palHueKey = -999;

function refreshPalette(hue: number) {
    const key = Math.round(hue / 6);
    if (key === palHueKey) return;
    palHueKey = key;
    for (let i = 0; i < pal.length; i++) pal[i] = hsla(hue + i * 22 - 20, 100, 72, 1);
}

function spawnP(x: number, y: number, vx: number, vy: number, life: number, size: number, hue: number) {
    if (pCount >= Math.min(MAXP, TIERS[activeTier()].maxP)) return;
    const i = pCount++;
    pX[i] = x; pY[i] = y; pVX[i] = vx; pVY[i] = vy; pLife[i] = life; pMax[i] = life; pSize[i] = size; pHue[i] = hue;
}

function onBeat(strength: number) {
    if (!ovEl?.classList.contains("on")) return;
    const I = settings.store.edmIntensity;
    const T = TIERS[activeTier()];

    // Compositor-driven pulse on the lyric block (no per-frame JS styling)
    if (ovLyrics && I > 0.01 && !reducedMotion()) {
        try { ovLyrics.animate([{ transform: `scale(${1 + 0.045 * Math.min(1.2, strength)})` }, { transform: "scale(1)" }], { duration: 170, easing: "ease-out" }); } catch { /* ignore */ }
    }
    if (strength > 0.95 && settings.store.screenShake && ovStage && !reducedMotion()) {
        const m = 6 * Math.min(1.2, I || 0.5);
        try {
            ovStage.animate([
                { transform: `translate3d(${m}px,${-m * 0.6}px,0)` },
                { transform: `translate3d(${-m * 0.7}px,${m * 0.5}px,0)`, offset: 0.3 },
                { transform: `translate3d(${m * 0.4}px,0,0)`, offset: 0.6 },
                { transform: "translate3d(0,0,0)" }
            ], { duration: 200, easing: "ease-out" });
        } catch { /* ignore */ }
    }

    if (!T.canvas || !fxCanvas || I <= 0.01) return;
    const W = fxCanvas.width, H = fxCanvas.height, m = Math.min(W, H), u = m / 420;
    if (rings.length < 3) rings.push({ r: m * 0.17, a: (0.5 + 0.3 * strength) * Math.min(1, I), v: m * (0.9 + 0.5 * strength) });
    const n = Math.floor((5 + 12 * strength) * I);
    for (let k = 0; k < n; k++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (120 + Math.random() * 360) * u * (0.7 + strength * 0.6);
        spawnP(W / 2 + Math.cos(ang) * m * 0.17, H / 2 + Math.sin(ang) * m * 0.17, Math.cos(ang) * sp, Math.sin(ang) * sp,
            0.6 + Math.random() * 0.7, 1 + Math.random() * 1.6, fx.hue + Math.random() * 90 - 20);
    }
}

function drawFx(dt: number, now: number) {
    const T = TIERS[activeTier()];
    const c = fxCanvas, ctx = fxCtx;
    if (!c || !ctx || !T.canvas) return;
    const W = c.width, H = c.height, m = Math.min(W, H), u = m / 420;
    ctx.clearRect(0, 0, W, H);

    const I = settings.store.edmIntensity;
    const active = fx.mode !== "idle";
    if (I <= 0.01 || (!active && pCount === 0 && rings.length === 0 && fx.energy < 0.004)) return;

    const hue = fx.hue;
    const iA = Math.min(1, I);

    if (T.leaks && active) {
        let g = ctx.createRadialGradient(W * 0.12, H * 0.08, 0, W * 0.12, H * 0.08, W * 0.6);
        g.addColorStop(0, hsla(hue, 100, 60, 0.06 + fx.bass * 0.3));
        g.addColorStop(1, hsla(hue, 100, 60, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        g = ctx.createRadialGradient(W * 0.92, H * 0.96, 0, W * 0.92, H * 0.96, W * 0.55);
        g.addColorStop(0, hsla(hue + 70, 100, 60, 0.05 + fx.mid * 0.28));
        g.addColorStop(1, hsla(hue + 70, 100, 60, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    if (fx.big > 0.03) {
        ctx.fillStyle = `rgba(255,255,255,${(fx.big * 0.1 * iA).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Lasers: solid-colour strokes
    if (active && T.lasers > 0) {
        const len = Math.hypot(W, H);
        ctx.lineWidth = Math.max(1, (1 + fx.high * 2 + fx.beat * 2) * u * 2);
        for (let k = 0; k < T.lasers; k++) {
            const ox = W * (k + 0.5) / T.lasers;
            const ang = Math.PI / 2 + Math.sin(now * 0.0006 * (1 + k * 0.13) + k * 1.7) * 0.55;
            ctx.strokeStyle = hsla(hue + k * 18, 100, 68, (0.05 + fx.mid * 0.18 + fx.beat * 0.2) * I);
            ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + Math.cos(ang) * len, Math.sin(ang) * len); ctx.stroke();
        }
    }

    // Stage bars (solid fill, no per-bar gradient)
    {
        const area = H * 0.34, bw = W / BANDS, gap = Math.max(1, bw * 0.22);
        ctx.fillStyle = hsla(hue + 20, 90, 62, 0.75 * iA);
        for (let i = 0; i < BANDS; i++) {
            const h = bands[i] * area;
            if (h > 0.5) ctx.fillRect(i * bw, H - h, bw - gap, h);
        }
        ctx.fillStyle = hsla(hue + 40, 100, 88, 0.85 * iA);
        for (let i = 0; i < BANDS; i++) {
            if (peaks[i] > 0.03) ctx.fillRect(i * bw, H - peaks[i] * area - 2, bw - gap, 1.5);
        }
    }

    // Radial spectrum (one path, two strokes)
    if (T.ring > 0) {
        const cx = W / 2, cy = H / 2, segs = T.ring;
        const R0 = m * 0.17 * (1 + fx.beat * 0.12 + fx.bass * 0.05);
        const rot = now * 0.00006, maxLen = m * 0.16;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < segs; i++) {
            const t = i / segs;
            const bi = Math.min(BANDS - 1, Math.floor((t < 0.5 ? t * 2 : (1 - t) * 2) * (BANDS - 1)));
            const ang = t * Math.PI * 2 + rot - Math.PI / 2;
            const l = 1.5 + bands[bi] * maxLen * Math.min(1.4, I);
            ctx.moveTo(cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0);
            ctx.lineTo(cx + Math.cos(ang) * (R0 + l), cy + Math.sin(ang) * (R0 + l));
        }
        ctx.strokeStyle = hsla(hue, 100, 60, 0.28 * iA); ctx.lineWidth = Math.max(3, 7 * u * 2); ctx.stroke();
        ctx.strokeStyle = hsla(hue + 30, 100, 82, 0.9 * iA); ctx.lineWidth = Math.max(1.2, 2.2 * u * 2); ctx.stroke();
    }

    // Shockwaves
    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += r.v * dt; r.a -= dt * 1.2;
        if (r.a <= 0) { rings.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r.r, 0, 6.2832);
        ctx.strokeStyle = hsla(hue + 20, 100, 74, r.a);
        ctx.lineWidth = Math.max(1, (1.5 + r.a * 6) * u * 2);
        ctx.stroke();
    }

    // Particles (fillRect from a 5-colour palette)
    if (T.maxP > 0) {
        refreshPalette(hue);
        if (active && Math.random() < fx.high * 0.5 * Math.min(1.2, I)) {
            spawnP(Math.random() * W, H, (Math.random() - 0.5) * 30 * u, -(50 + Math.random() * 140) * u, 0.9 + Math.random() * 0.9, 1 + Math.random() * 1.4, hue + Math.random() * 80);
        }
        const drag = Math.exp(-dt * 0.9);
        for (let i = 0; i < pCount;) {
            pLife[i] -= dt;
            if (pLife[i] <= 0) {
                const l = --pCount;
                if (i !== l) {
                    pX[i] = pX[l]; pY[i] = pY[l]; pVX[i] = pVX[l]; pVY[i] = pVY[l];
                    pLife[i] = pLife[l]; pMax[i] = pMax[l]; pSize[i] = pSize[l]; pHue[i] = pHue[l];
                }
                continue;
            }
            pVX[i] *= drag; pVY[i] *= drag;
            pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt;
            ctx.globalAlpha = (pLife[i] / pMax[i]) * 0.95 * iA;
            ctx.fillStyle = pal[i % pal.length];
            const s = pSize[i];
            ctx.fillRect(pX[i], pY[i], s, s);
            i++;
        }
        ctx.globalAlpha = 1;
    } else pCount = 0;
}

function resizeFx() {
    if (!fxCanvas) return;
    const T = TIERS[activeTier()];
    if (!T.canvas) { fxCanvas.style.display = "none"; pCount = 0; rings.length = 0; return; }
    fxCanvas.style.display = "block";
    const w = T.w, h = Math.max(2, Math.round(w * window.innerHeight / Math.max(1, window.innerWidth)));
    if (fxCanvas.width !== w || fxCanvas.height !== h) { fxCanvas.width = w; fxCanvas.height = h; }
}

// ─── Overlay (kinetic type, transform/opacity only) ──────────────────────────
let ovStage: HTMLElement | null = null;
let ovLyrics: HTMLElement | null = null;
let ovLineBox: HTMLElement | null = null;
let ovNext: HTMLElement | null = null;
let ovCur: HTMLElement | null = null;
let ovLower: HTMLElement | null = null;
let ovProg: HTMLElement | null = null;
let ovClassKey = "";
let lastHueSet = -9999;
let lastProgSet = 0;

function buildOverlay() {
    if (ovEl) return;
    ovEl = document.createElement("div");
    ovEl.id = "ddt-ov";
    ovEl.className = "ddt-ov";
    ovEl.innerHTML = `
        <canvas class="ddt-ov-fx"></canvas>
        <div class="ddt-ov-stage">
            <div class="ddt-ov-lyrics">
                <div class="ddt-ov-linebox"></div>
                <div class="ddt-ov-next"></div>
            </div>
        </div>
        <div class="ddt-ov-lower">
            <div class="lt-bar"></div>
            <div class="lt-text"><div class="lt-title"></div><div class="lt-artist"></div></div>
        </div>
        <div class="ddt-ov-bars top"></div>
        <div class="ddt-ov-bars bottom"></div>
        <div class="ddt-ov-prog"><i></i></div>`;
    document.body.appendChild(ovEl);

    fxCanvas = ovEl.querySelector(".ddt-ov-fx");
    fxCtx = fxCanvas?.getContext("2d") ?? null;
    ovStage = ovEl.querySelector(".ddt-ov-stage");
    ovLyrics = ovEl.querySelector(".ddt-ov-lyrics");
    ovLineBox = ovEl.querySelector(".ddt-ov-linebox");
    ovNext = ovEl.querySelector(".ddt-ov-next");
    ovLower = ovEl.querySelector(".ddt-ov-lower");
    ovProg = ovEl.querySelector(".ddt-ov-prog i");
    resizeFx();
}

function destroyOverlay() {
    ovEl?.remove();
    ovEl = fxCanvas = ovStage = ovLyrics = ovLineBox = ovNext = ovCur = ovLower = ovProg = null;
    fxCtx = null; ovClassKey = ""; pCount = 0; rings.length = 0;
}

const overlayShouldShow = () => settings.store.overlayEnabled && !!currentSong && !stopped;

function refreshOverlay() {
    if (!started) return;
    if (overlayShouldShow()) buildOverlay();
    if (ovEl) { ovEl.classList.toggle("on", overlayShouldShow()); resizeFx(); ovClassKey = ""; }
    byId("ddt-win-fx")?.classList.toggle("off", !settings.store.overlayEnabled);
    kick();
}

function syncOverlayClasses() {
    if (!ovEl) return;
    const s = settings.store;
    const key = `${s.lyricPosition}|${s.letterbox}|${s.overlayOpacity}`;
    if (key === ovClassKey) return;
    ovClassKey = key;
    ovEl.classList.remove("pos-center", "pos-lower", "pos-upper");
    ovEl.classList.add(`pos-${s.lyricPosition}`);
    ovEl.classList.toggle("lb", !!s.letterbox);
    if (fxCanvas) fxCanvas.style.opacity = String(s.overlayOpacity);
}

function pickStyle(idx: number, text: string): string {
    const mode = settings.store.lyricStyle;
    if (mode !== "auto") return mode;
    const words = text.trim().split(/\s+/).length;
    if (words <= 2) return "slam";
    const hot = fx.energy > 0.45;
    const pool = hot ? ["pop", "slam", "glitch", "mask"] : ["cinematic", "mask", "pop"];
    let pick = words > 9 && !hot ? "cinematic" : pool[idx % pool.length];
    if (pick === "slam" && words > 5) pick = "pop";
    return pick;
}

function showOverlayLine(idx: number) {
    if (!ovLineBox || !ovNext) return;
    if (ovCur) {
        const old = ovCur;
        old.classList.add("out");
        setTimeout(() => old.remove(), 380);
        ovCur = null;
    }
    const text = idx >= 0 ? lyrics[idx]?.text ?? "" : "";
    ovNext.textContent = idx >= 0 ? lyrics[idx + 1]?.text ?? "" : "";
    if (!text) return;

    const style = pickStyle(idx, text);
    const words = text.split(/\s+/).filter(Boolean);
    const el = document.createElement("div");
    el.className = `ddt-ov-line st-${style}`;
    const len = text.length;
    const base = len <= 18 ? 1 : len <= 36 ? 0.82 : len <= 60 ? 0.66 : 0.54;
    el.style.setProperty("--fs", String(base * settings.store.lyricScale));

    const lineDur = ((lyrics[idx + 1]?.time ?? lyrics[idx].time + 4) - lyrics[idx].time);
    const stagger = clamp((lineDur * 0.35 * 1000) / words.length, 22, 85);
    let keyIdx = -1;
    if (words.length >= 3) { let best = 0; words.forEach((w, i) => { if (w.length > best) { best = w.length; keyIdx = i; } }); }

    words.forEach((w, i) => {
        const outer = document.createElement("span");
        outer.className = "w" + (i === keyIdx ? " key" : "");
        const inner = document.createElement("span");
        inner.className = "wi";
        inner.textContent = w;
        inner.style.setProperty("--d", `${Math.round(i * stagger)}ms`);
        outer.appendChild(inner);
        el.appendChild(outer);
    });
    ovLineBox.appendChild(el);
    ovCur = el;
}

function triggerLowerThird() {
    if (!ovLower || !currentSong) return;
    (ovLower.querySelector(".lt-title") as HTMLElement).textContent = currentSong.title;
    (ovLower.querySelector(".lt-artist") as HTMLElement).textContent = currentSong.artist || "";
    ovLower.classList.remove("show");
    void ovLower.offsetWidth;
    ovLower.classList.add("show");
}

function renderOverlay(dt: number, now: number) {
    if (!ovEl || !ovEl.classList.contains("on")) return;
    syncOverlayClasses();

    // The ONLY style writes outside canvas: hue once per second, progress hairline 4×/s
    if (now - lastHueSet > 1000) { lastHueSet = now; ovEl.style.setProperty("--ddt-hue", String(Math.round(fx.hue))); }
    if (ovProg && now - lastProgSet > 250 && audioEl && isFinite(audioEl.duration) && audioEl.duration > 0) {
        lastProgSet = now;
        ovProg.style.transform = `scaleX(${(audioEl.currentTime / audioEl.duration).toFixed(4)})`;
    }
    drawFx(dt, now);
}

// ─── HUD / mini visualizers ──────────────────────────────────────────────────
let vizColor = "", vizColor2 = "", vizHueKey = -999;
function refreshVizColors() {
    const key = Math.round(fx.hue / 5);
    if (key === vizHueKey) return;
    vizHueKey = key;
    vizColor = hsla(fx.hue + 30, 100, 68, 1);
    vizColor2 = hsla(fx.hue + 70, 100, 85, 1);
}

function renderHudViz() {
    const c = hudCanvas;
    if (!c || !c.width || !c.height || !hudEl || hudEl.classList.contains("hidden")) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = c.width / Math.max(1, c.clientWidth);
    const w = c.clientWidth, h = c.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    refreshVizColors();
    const mode = settings.store.visualizerMode;

    if (mode === "edm") {
        const bw = w / BANDS;
        ctx.fillStyle = vizColor;
        for (let i = 0; i < BANDS; i++) { const bh = bands[i] * h * 0.92; ctx.fillRect(i * bw + 0.5, h - bh, bw - 1, bh); }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (let i = 0; i < BANDS; i++) ctx.fillRect(i * bw + 0.5, h - peaks[i] * h * 0.92 - 3, bw - 1, 2);
    } else if (mode === "aurora") {
        ctx.beginPath();
        for (let i = 0; i < BANDS; i++) {
            const x = (i / (BANDS - 1)) * w;
            const y = h / 2 + Math.sin(i * 0.7 + performance.now() * 0.002) * bands[i] * h * 0.4;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = vizColor2; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
    } else {
        const bw = w / BANDS;
        ctx.fillStyle = vizColor;
        ctx.beginPath();
        for (let i = 0; i < BANDS; i++) {
            const bh = Math.max(3, bands[i] * h * 0.9);
            rrect(ctx, i * bw + 1, (h - bh) / 2, bw - 2, bh, 3);
        }
        ctx.fill();
    }
}

function renderMiniViz() {
    const c = miniCanvas;
    if (!c || !c.width || !miniEl || miniEl.classList.contains("hidden")) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = c.width / Math.max(1, c.clientWidth);
    const w = c.clientWidth, h = c.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    refreshVizColors();
    const n = 12, bw = w / n;
    ctx.fillStyle = isPlaying ? vizColor2 : "rgba(255,255,255,0.35)";
    for (let i = 0; i < n; i++) {
        const bh = Math.max(2, bands[Math.floor((i / n) * 20)] * h);
        ctx.fillRect(i * bw + 0.5, (h - bh) / 2, bw - 1.5, bh);
    }
}

// ─── Render loop: setTimeout-paced rAF, FPS cap, adaptive governor ───────────
let rafId = 0;
let timerId: ReturnType<typeof setTimeout> | 0 = 0;
let lastFrame = 0;
let lastTimeUi = 0;
let ema = 33;
let govFrames = 0;
let perfTextAt = 0;

function resetGovernor() { ema = 1000 / effFps(); govFrames = 0; }

const hudVisible = () => !!hudEl && !hudEl.classList.contains("hidden");
const miniVisible = () => !!miniEl && !miniEl.classList.contains("hidden");
const overlayVisible = () => !!ovEl && ovEl.classList.contains("on");

function kick() {
    if (rafId || timerId || !started) return;
    lastFrame = performance.now() - 1000 / effFps();
    rafId = requestAnimationFrame(frame);
}

function governor(elapsed: number) {
    if (settings.store.performance !== "auto" || !overlayVisible() || !isPlaying) { govFrames = 0; return; }
    if (elapsed > 250) return; // pause/tab-hidden gap, not a perf signal
    ema = ema * 0.9 + elapsed * 0.1;
    if (++govFrames < 45) return;
    govFrames = 0;
    // Real interval much longer than we asked for ⇒ the machine can't keep up ⇒ step down
    if (ema > (1000 / effFps()) * 1.7 && tier < TIERS.length - 1) {
        tier++;
        resizeFx();
        ema = 1000 / effFps();
        console.log(`[DDT Music Lite] auto-lowered quality to tier ${tier}`);
    }
}

function frame(now: number) {
    rafId = 0;
    if (!started) return;
    const elapsed = now - lastFrame;
    lastFrame = now;
    governor(elapsed);
    const dt = clamp(elapsed / 1000, 0.001, 0.1);

    updateAnalysis(dt, now);
    syncLyrics();
    if (overlayVisible()) renderOverlay(dt, now);
    if (hudVisible()) {
        renderHudViz();
        updateTimeUI(false, now);
        if (P.tab === "fx" && now - perfTextAt > 600) {
            perfTextAt = now;
            const el = byId("ddt-perf");
            if (el) el.textContent = `Tier ${activeTier()} · ~${Math.round(1000 / Math.max(1, ema))} FPS · ${fx.mode === "sim" ? "simulated audio" : "live audio"}`;
        }
    }
    if (miniVisible()) renderMiniViz();

    const settling = fx.beat > 0.004 || fx.energy > 0.004 || fx.maxBand > 0.004 || pCount > 0 || rings.length > 0;
    const visible = hudVisible() || miniVisible() || overlayVisible();
    if (visible && (isPlaying || settling)) {
        const wait = Math.max(0, 1000 / effFps() - (performance.now() - now) - 4);
        timerId = setTimeout(() => { timerId = 0; if (started) rafId = requestAnimationFrame(frame); }, wait);
    }
}

// ─── HUD UI ──────────────────────────────────────────────────────────────────
function setStatus(msg: string, loading: boolean) {
    const el = byId("ddt-status");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("loading", loading);
    el.classList.toggle("empty", !msg);
}

function syncNowPlayingUI() {
    const s = currentSong;
    const t = byId("ddt-np-title"), a = byId("ddt-np-artist"), mt = byId("ddt-mini-title");
    const img = byId<HTMLImageElement>("ddt-art-img");
    if (t) t.textContent = s ? s.title : "Nothing playing";
    if (a) a.textContent = s ? s.artist : "Search a track to start";
    if (mt) mt.textContent = s ? `${s.artist ? s.artist + " — " : ""}${s.title}` : "No track";
    if (img) { if (s?.thumb) { img.src = s.thumb; img.style.display = "block"; } else { img.removeAttribute("src"); img.style.display = "none"; } }
    updateQueueBadge();
}

function updateTimeUI(force: boolean, now = performance.now()) {
    if (!force && now - lastTimeUi < 250) return;
    lastTimeUi = now;
    const cur = audioEl?.currentTime ?? 0;
    const dur = audioEl && isFinite(audioEl.duration) ? audioEl.duration : 0;
    const shown = scrubbing ? scrubPreview * dur : cur;
    const pct = dur > 0 ? clamp((scrubbing ? scrubPreview : cur / dur) * 100, 0, 100) : 0;
    const c = byId("ddt-t-cur"), d = byId("ddt-t-dur"), f = byId("ddt-scrub-fill"), k = byId("ddt-scrub-knob");
    if (c) c.textContent = fmt(shown);
    if (d) d.textContent = dur ? fmt(dur) : (isPlaying ? "LIVE" : "0:00");
    if (f) f.style.width = `${pct}%`;
    if (k) k.style.left = `${pct}%`;
}

function refreshVolumeUI() {
    const b = byId("ddt-mute"); if (b) b.innerHTML = P.muted || P.vol === 0 ? Icons.mute : Icons.volume;
    const s = byId<HTMLInputElement>("ddt-vol"); if (s) { s.value = String(Math.round(P.vol * 100)); s.style.setProperty("--p", `${P.muted ? 0 : P.vol * 100}%`); }
}
function updateQueueBadge() { const q = byId("ddt-q-count"); if (q) q.textContent = String(P.queue.length); }

function refreshTransportUI() {
    byId("ddt-shuffle")?.classList.toggle("active", P.shuffle);
    const r = byId("ddt-repeat");
    if (r) { r.innerHTML = P.repeat === "one" ? Icons.repeatOne : Icons.repeat; r.classList.toggle("active", P.repeat !== "off"); r.title = `Repeat: ${P.repeat}`; }
}

function songRow(song: SongItem, opts: { idx: number; kind: "search" | "queue"; active?: boolean }) {
    const art = song.thumb ? `<img class="ddt-row-art" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(song.thumb)}" alt="">` : `<div class="ddt-row-art noart"></div>`;
    const actions = opts.kind === "search"
        ? `<button class="ddt-ib" data-act="addq" data-i="${opts.idx}" title="Add to queue">${Icons.add}</button>`
        : `<button class="ddt-ib" data-act="qrm" data-i="${opts.idx}" title="Remove">${Icons.trash}</button>`;
    return `<div class="ddt-row${opts.active ? " active" : ""}" data-act="${opts.kind === "search" ? "pick" : "qplay"}" data-i="${opts.idx}">
        ${art}
        <div class="ddt-row-meta"><div class="ddt-row-title">${esc(song.title)}</div><div class="ddt-row-sub">${opts.active ? "Now playing" : esc(song.artist || "YouTube")}</div></div>
        ${actions}
    </div>`;
}

function renderSearchTab() {
    const el = byId("ddt-search-results"); if (!el) return;
    el.innerHTML = searchResults.length
        ? searchResults.map((s, i) => songRow(s, { idx: i, kind: "search" })).join("")
        : `<div class="ddt-empty">Search for a track, artist or remix.</div>`;
}

function renderQueueTab() {
    const el = byId("ddt-queue-list"); if (!el) return;
    updateQueueBadge();
    if (!P.queue.length) { el.innerHTML = `<div class="ddt-empty">Queue is empty. Add tracks from Search.</div>`; return; }
    el.innerHTML = `<div class="ddt-queue-head"><span>${P.queue.length} track${P.queue.length === 1 ? "" : "s"}</span><button class="ddt-link" data-act="qclear">Clear all</button></div>` +
        P.queue.map((s, i) => songRow(s, { idx: i, kind: "queue", active: i === P.queueIdx && !!currentSong && currentSong.videoId === s.videoId })).join("");
}

function renderLyricsTab() {
    const el = byId("ddt-lyrics-list"); if (!el) return;
    if (lyricsState === "loading") { el.innerHTML = `<div class="ddt-empty">Loading lyrics…</div>`; return; }
    if (lyricsState === "synced") {
        el.innerHTML = lyrics.map((l, i) => `<div class="ddt-lyric${i === lyricIdx ? " active" : ""}" id="ddt-lrc-${i}" data-act="lseek" data-t="${l.time}">${esc(l.text)}</div>`).join("");
        return;
    }
    if (lyricsState === "plain") {
        el.innerHTML = `<div class="ddt-note">Unsynced lyrics — the overlay needs timestamps, so it stays off for this track.</div><div class="ddt-plain">${esc(plainLyrics)}</div>`;
        return;
    }
    el.innerHTML = `<div class="ddt-empty">${currentSong ? "No lyrics found for this track." : "Play a track to load lyrics."}</div>`;
}

function markActiveLyric() {
    const box = byId("ddt-lyrics-list"); if (!box) return;
    box.querySelector(".ddt-lyric.active")?.classList.remove("active");
    const cur = byId(`ddt-lrc-${lyricIdx}`);
    if (!cur) return;
    cur.classList.add("active");
    if (P.tab === "lyrics" && hudVisible()) {
        const pane = byId("ddt-pane-lyrics");
        if (pane) pane.scrollTop = cur.offsetTop - pane.clientHeight / 2 + cur.clientHeight / 2; // instant, no smooth-scroll cost
    }
}

const FX_CTLS: Array<{ key: string; label: string; kind: "toggle" | "range" | "select"; min?: number; max?: number; step?: number; num?: boolean; opts?: Array<[string, string]> }> = [
    { key: "overlayEnabled", label: "Cinematic overlay", kind: "toggle" },
    { key: "performance", label: "Performance mode", kind: "select", opts: [["auto", "Auto"], ["balanced", "Balanced"], ["minimal", "Minimal"], ["textonly", "Text only"]] },
    { key: "fpsCap", label: "FPS cap", kind: "select", num: true, opts: [["10", "10"], ["15", "15"], ["24", "24"], ["30", "30"]] },
    { key: "overlayOpacity", label: "FX opacity", kind: "range", min: 0.1, max: 1, step: 0.05 },
    { key: "edmIntensity", label: "EDM intensity", kind: "range", min: 0, max: 1.5, step: 0.05 },
    { key: "lyricStyle", label: "Lyric style", kind: "select", opts: [["auto", "Auto"], ["pop", "Pop"], ["mask", "Mask reveal"], ["slam", "Slam"], ["glitch", "Glitch"], ["cinematic", "Cinematic"]] },
    { key: "lyricPosition", label: "Lyric position", kind: "select", opts: [["center", "Center"], ["lower", "Lower"], ["upper", "Upper"]] },
    { key: "lyricScale", label: "Lyric size", kind: "range", min: 0.6, max: 1.6, step: 0.05 },
    { key: "screenShake", label: "Kick shake", kind: "toggle" },
    { key: "letterbox", label: "Letterbox", kind: "toggle" },
    { key: "visualizerMode", label: "HUD visualizer", kind: "select", opts: [["spotify", "Pills"], ["edm", "Stage"], ["aurora", "Line"]] },
];

function renderFxTab() {
    const el = byId("ddt-fx-list"); if (!el) return;
    const st = settings.store as any;
    el.innerHTML = `<div class="ddt-perf mono" id="ddt-perf">—</div>` + FX_CTLS.map(c => {
        const v = st[c.key];
        let ctl = "";
        if (c.kind === "toggle") ctl = `<label class="ddt-sw"><input type="checkbox" data-fx="${c.key}" ${v ? "checked" : ""}><i></i></label>`;
        else if (c.kind === "range") ctl = `<input class="ddt-range" type="range" data-fx="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}"><b class="mono" data-fxv="${c.key}">${Number(v).toFixed(2)}</b>`;
        else ctl = `<select class="ddt-select" data-fx="${c.key}">${c.opts!.map(([val, lab]) => `<option value="${val}" ${val === String(v) ? "selected" : ""}>${lab}</option>`).join("")}</select>`;
        return `<div class="ddt-fx-row"><span>${c.label}</span><div class="ddt-fx-ctl">${ctl}</div></div>`;
    }).join("");
}

function switchTab(tab: TabId) {
    P.tab = tab; savePersist();
    for (const t of ["search", "lyrics", "queue", "fx"] as TabId[]) {
        byId(`ddt-pane-${t}`)?.toggleAttribute("hidden", t !== tab);
        byId(`ddt-tab-${t}`)?.classList.toggle("active", t === tab);
    }
    if (tab === "queue") renderQueueTab();
    if (tab === "fx") renderFxTab();
    if (tab === "lyrics") { renderLyricsTab(); markActiveLyric(); }
}

function handleAct(t: HTMLElement, e?: Event) {
    const i = Number(t.dataset.i);
    switch (t.dataset.act) {
        case "play": togglePlay(); break;
        case "prev": playPrev(); break;
        case "next": playNext(); break;
        case "stop": stopPlayback(); break;
        case "mute": toggleMute(); break;
        case "shuffle": P.shuffle = !P.shuffle; refreshTransportUI(); savePersist(); break;
        case "repeat": P.repeat = P.repeat === "all" ? "one" : P.repeat === "one" ? "off" : "all"; refreshTransportUI(); savePersist(); break;
        case "tab": switchTab(t.dataset.tab as TabId); break;
        case "search": void doSearch(byId<HTMLInputElement>("ddt-search-input")?.value ?? ""); break;
        case "pick": { const s = searchResults[i]; if (s) addToQueue(s, true); break; }
        case "addq": { e?.stopPropagation(); const s = searchResults[i]; if (s) { addToQueue(s); t.classList.add("done"); } break; }
        case "qplay": playAt(i); break;
        case "qrm": {
            e?.stopPropagation();
            if (i < P.queueIdx) P.queueIdx--;
            P.queue.splice(i, 1);
            P.queueIdx = clamp(P.queueIdx, 0, Math.max(0, P.queue.length - 1));
            savePersist(); renderQueueTab();
            break;
        }
        case "qclear": P.queue = []; P.queueIdx = 0; savePersist(); renderQueueTab(); break;
        case "lseek": seek(Number(t.dataset.t) - 0.05); break;
        case "relay": void ensureRelay().then(ok => setStatus(ok ? "" : "Relay failed to start", false)); break;
        case "fx-toggle": settings.store.overlayEnabled = !settings.store.overlayEnabled; refreshOverlay(); if (P.tab === "fx") renderFxTab(); break;
        case "minimize": hideHud(); if (currentSong) showMini(); break;
        case "expand": hideMini(); showHud(); break;
        case "close": stopPlayback(); hideHud(); hideMini(); break;
    }
}

function placeEl(el: HTMLElement, pos: { x: number; y: number }) {
    const w = el.offsetWidth || 300, h = el.offsetHeight || 60;
    pos.x = clamp(pos.x, 8, Math.max(8, window.innerWidth - w - 8));
    pos.y = clamp(pos.y, 8, Math.max(8, window.innerHeight - h - 8));
    el.style.transform = `translate3d(${Math.round(pos.x)}px,${Math.round(pos.y)}px,0)`;
}

function makeDraggable(el: HTMLElement, handle: HTMLElement, pos: { x: number; y: number }) {
    let on = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", e => {
        if ((e.target as HTMLElement).closest("button,input,select")) return;
        on = true; sx = e.clientX; sy = e.clientY; ox = pos.x; oy = pos.y;
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    handle.addEventListener("pointermove", e => {
        if (!on) return;
        pos.x = ox + e.clientX - sx; pos.y = oy + e.clientY - sy;
        placeEl(el, pos);
    });
    const end = (e: PointerEvent) => {
        if (!on) return;
        on = false;
        try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        savePersist();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
}

function wireScrub() {
    const bar = byId("ddt-scrub"), tip = byId("ddt-scrub-tip");
    if (!bar) return;
    const ratio = (e: PointerEvent) => { const r = bar.getBoundingClientRect(); return clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1); };
    const dur = () => (audioEl && isFinite(audioEl.duration) ? audioEl.duration : 0);
    bar.addEventListener("pointerdown", e => {
        if (!dur()) return;
        scrubbing = true; scrubPreview = ratio(e);
        bar.setPointerCapture(e.pointerId); updateTimeUI(true);
    });
    bar.addEventListener("pointermove", e => {
        const r = ratio(e);
        if (tip) { tip.textContent = fmt(r * dur()); tip.style.left = `${r * 100}%`; }
        if (scrubbing) { scrubPreview = r; updateTimeUI(true); }
    });
    const end = (e: PointerEvent) => {
        if (!scrubbing) return;
        scrubbing = false;
        try { bar.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        seek(scrubPreview * dur());
    };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", () => { scrubbing = false; });
}

function buildHud() {
    if (hudEl) return;
    hudEl = document.createElement("div");
    hudEl.id = "ddt-music-hud";
    hudEl.className = "ddt-hud hidden";
    hudEl.tabIndex = -1;
    hudEl.innerHTML = `
        <div class="ddt-hud-head" id="ddt-hud-head">
            <div class="ddt-brand"><span class="ddt-brand-ic">${Icons.music}</span><span class="ddt-brand-t">DDT STUDIO · LITE</span></div>
            <button class="ddt-relay" id="ddt-relay" data-act="relay" title="Relay status — click to (re)start"><i></i><span id="ddt-relay-label">Relay</span></button>
            <div class="ddt-win">
                <button id="ddt-win-fx" data-act="fx-toggle" title="Toggle cinematic overlay">${Icons.sparkle}</button>
                <button data-act="minimize" title="Minimize to pill">${Icons.minimize}</button>
                <button data-act="close" class="danger" title="Stop & close">${Icons.close}</button>
            </div>
        </div>
        <div class="ddt-hud-body">
            <div class="ddt-np">
                <div class="ddt-art"><img id="ddt-art-img" alt="" decoding="async" style="display:none"></div>
                <div class="ddt-np-meta">
                    <div id="ddt-np-title" class="ddt-np-title">Nothing playing</div>
                    <div id="ddt-np-artist" class="ddt-np-artist">Search a track to start</div>
                    <div id="ddt-status" class="ddt-status empty"></div>
                </div>
            </div>
            <div class="ddt-viz"><canvas id="ddt-viz"></canvas></div>
            <div class="ddt-time">
                <span id="ddt-t-cur" class="mono">0:00</span>
                <div class="ddt-scrub" id="ddt-scrub">
                    <div class="ddt-scrub-fill" id="ddt-scrub-fill"></div>
                    <div class="ddt-scrub-knob" id="ddt-scrub-knob"></div>
                    <div class="ddt-scrub-tip mono" id="ddt-scrub-tip">0:00</div>
                </div>
                <span id="ddt-t-dur" class="mono">0:00</span>
            </div>
            <div class="ddt-transport">
                <div class="ddt-tr-side"><button class="ddt-ib" id="ddt-shuffle" data-act="shuffle" title="Shuffle">${Icons.shuffle}</button></div>
                <div class="ddt-tr-main">
                    <button class="ddt-ib" data-act="prev" title="Previous">${Icons.prev}</button>
                    <button class="ddt-play" id="ddt-play" data-act="play" title="Play / Pause (Space)">${Icons.play}</button>
                    <button class="ddt-ib" data-act="next" title="Next">${Icons.next}</button>
                    <button class="ddt-ib" data-act="stop" title="Stop">${Icons.stop}</button>
                </div>
                <div class="ddt-tr-side right">
                    <button class="ddt-ib" id="ddt-repeat" data-act="repeat" title="Repeat">${Icons.repeat}</button>
                    <button class="ddt-ib" id="ddt-mute" data-act="mute" title="Mute (M)">${Icons.volume}</button>
                    <input type="range" id="ddt-vol" class="ddt-vol" min="0" max="100" value="80" aria-label="Volume">
                </div>
            </div>
            <div class="ddt-tabs">
                <button id="ddt-tab-search" class="active" data-act="tab" data-tab="search">Search</button>
                <button id="ddt-tab-lyrics" data-act="tab" data-tab="lyrics">Lyrics</button>
                <button id="ddt-tab-queue" data-act="tab" data-tab="queue">Queue <span id="ddt-q-count" class="pill">0</span></button>
                <button id="ddt-tab-fx" data-act="tab" data-tab="fx">FX</button>
            </div>
            <div class="ddt-panes">
                <div id="ddt-pane-search" class="ddt-pane">
                    <div class="ddt-searchbar">
                        <input id="ddt-search-input" class="ddt-input" type="text" placeholder="Search track, artist, remix…" autocomplete="off" spellcheck="false">
                        <button class="ddt-ib solid" data-act="search" title="Search">${Icons.search}</button>
                    </div>
                    <div id="ddt-search-results"></div>
                </div>
                <div id="ddt-pane-lyrics" class="ddt-pane" hidden><div id="ddt-lyrics-list"></div></div>
                <div id="ddt-pane-queue" class="ddt-pane" hidden><div id="ddt-queue-list"></div></div>
                <div id="ddt-pane-fx" class="ddt-pane" hidden><div id="ddt-fx-list"></div></div>
            </div>
        </div>`;
    document.body.appendChild(hudEl);

    hudCanvas = byId<HTMLCanvasElement>("ddt-viz");
    if (hudCanvas) resizeObs?.observe(hudCanvas);

    hudEl.addEventListener("click", e => {
        const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
        if (t && hudEl!.contains(t)) handleAct(t, e);
    });

    hudEl.addEventListener("keydown", e => {
        const tgt = e.target as HTMLElement;
        if (tgt.id === "ddt-search-input") { if (e.key === "Enter") void doSearch((tgt as HTMLInputElement).value); return; }
        if (tgt.matches("input[type=text],select")) return;
        switch (e.key) {
            case " ": e.preventDefault(); togglePlay(); break;
            case "ArrowRight": if (audioEl) seek(audioEl.currentTime + 5); break;
            case "ArrowLeft": if (audioEl) seek(audioEl.currentTime - 5); break;
            case "ArrowUp": e.preventDefault(); setVolume(P.vol + 0.05); break;
            case "ArrowDown": e.preventDefault(); setVolume(P.vol - 0.05); break;
            case "m": case "M": toggleMute(); break;
        }
    });

    const onFx = (e: Event) => {
        const t = e.target as HTMLInputElement | HTMLSelectElement;
        const key = t.dataset?.fx; if (!key) return;
        const def = FX_CTLS.find(c => c.key === key); if (!def) return;
        let val: any;
        if (def.kind === "toggle") val = (t as HTMLInputElement).checked;
        else if (def.kind === "range") { val = Number(t.value); const lab = hudEl!.querySelector(`[data-fxv="${key}"]`); if (lab) lab.textContent = val.toFixed(2); }
        else val = def.num ? Number(t.value) : t.value;
        (settings.store as any)[key] = val;
        if (key === "performance") { tier = 0; resetGovernor(); }
        if (key === "fpsCap") resetGovernor();
        if (key === "overlayEnabled" || key === "performance") refreshOverlay();
        if (key === "lyricStyle" || key === "lyricScale") showOverlayLine(lyricIdx);
        kick();
    };
    hudEl.addEventListener("input", e => { if ((e.target as HTMLElement).id === "ddt-vol") setVolume(Number((e.target as HTMLInputElement).value) / 100); else onFx(e); });
    hudEl.addEventListener("change", onFx);

    makeDraggable(hudEl, byId("ddt-hud-head")!, P.hud);
    wireScrub();
    syncNowPlayingUI();
    refreshVolumeUI();
    refreshTransportUI();
    renderSearchTab();
    renderLyricsTab();
    renderQueueTab();
    switchTab(P.tab);
    setRelayBadge(serverReady);
    onPlayState();
}

function buildMini() {
    if (miniEl) return;
    miniEl = document.createElement("div");
    miniEl.id = "ddt-music-mini";
    miniEl.className = "ddt-mini hidden";
    miniEl.innerHTML = `
        <canvas id="ddt-mini-canvas" class="ddt-mini-canvas"></canvas>
        <span id="ddt-mini-title" class="ddt-mini-title">No track</span>
        <button class="ddt-ib" data-act="prev" title="Previous">${Icons.prev}</button>
        <button class="ddt-ib solid" id="ddt-mini-play" data-act="play" title="Play / Pause">${isPlaying ? Icons.pause : Icons.play}</button>
        <button class="ddt-ib" data-act="next" title="Next">${Icons.next}</button>
        <button class="ddt-ib" data-act="expand" title="Open studio">${Icons.expand}</button>
        <button class="ddt-ib" data-act="close" title="Stop & close">${Icons.close}</button>`;
    document.body.appendChild(miniEl);
    miniCanvas = byId<HTMLCanvasElement>("ddt-mini-canvas");
    if (miniCanvas) resizeObs?.observe(miniCanvas);
    miniEl.addEventListener("click", e => {
        const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
        if (t) handleAct(t, e);
    });
    makeDraggable(miniEl, miniEl, P.mini);
    syncNowPlayingUI();
}

function showHud() {
    buildHud();
    hudEl!.classList.remove("hidden");
    placeEl(hudEl!, P.hud);
    if (!serverReady) void checkServer().then(setRelayBadge);
    kick();
}
function hideHud() { hudEl?.classList.add("hidden"); }
function showMini() { buildMini(); miniEl!.classList.remove("hidden"); placeEl(miniEl!, P.mini); kick(); }
function hideMini() { miniEl?.classList.add("hidden"); }

function toggleLauncher() {
    if (hudVisible()) { hideHud(); if (currentSong && !stopped) showMini(); return; }
    hideMini(); showHud();
}

let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
function onWindowResize() {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => { // debounce: window drag-resizing must not thrash the canvas
        resizeFx();
        if (hudEl) placeEl(hudEl, P.hud);
        if (miniEl) placeEl(miniEl, P.mini);
    }, 120);
}

// ─── Server-list launcher ────────────────────────────────────────────────────
function LauncherButton() {
    return React.createElement("div", { className: "ddt-launcher-wrap" },
        React.createElement("div", {
            id: "ddt-music-launcher-btn",
            className: "ddt-launcher" + (isPlaying ? " playing" : ""),
            role: "button",
            tabIndex: 0,
            title: "DDT Music Studio (Lite)",
            onClick: toggleLauncher,
            onKeyDown: (e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLauncher(); } },
            dangerouslySetInnerHTML: { __html: Icons.music }
        }));
}

const SafeLauncherButton = ErrorBoundary.wrap(LauncherButton, { noop: true });

// ─── Lifecycle ───────────────────────────────────────────────────────────────
function teardown() {
    started = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (timerId) { clearTimeout(timerId); timerId = 0; }
    if (resizeDebounce) { clearTimeout(resizeDebounce); resizeDebounce = null; }
    stopPoll();
    window.removeEventListener("resize", onWindowResize);
    resizeObs?.disconnect(); resizeObs = null;
    unbindMediaSession();

    playToken++;
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    if (audioEl) { audioEl.pause(); audioEl.removeAttribute("src"); audioEl.load(); audioEl = null; }
    if (audioCtx) { try { void audioCtx.close(); } catch { /* ignore */ } }
    audioCtx = null; srcNode = null; analyser = null; gainNode = null; freqBuf = null;

    hudEl?.remove(); miniEl?.remove(); hudEl = miniEl = null; hudCanvas = miniCanvas = null;
    destroyOverlay();

    isPlaying = false; stopped = true; currentSong = null;
    lyrics = []; lyricIdx = -1; lyricsState = "idle"; scrubbing = false;
    bands.fill(0); peaks.fill(0);
    fx.beat = fx.big = fx.energy = fx.bass = fx.mid = fx.high = fx.maxBand = 0;
    fx.everLive = false; fx.silentFrames = 0; fx.mode = "idle";
    tier = 0; vizHueKey = -999; palHueKey = -999;
}

export default definePlugin({
    name: "MusicVisualizer",
    description: "Lite edition: cinematic EDM overlay + kinetic lyrics + HUD player, tuned for low-end PCs",
    authors: [{ name: "DDT Team", id: 0n }],
    tags: ["Media", "Audio", "Visualizer"],
    dependencies: ["ServerListAPI"],
    settings,

    start() {
        loadPersist();
        started = true;
        tier = 0;
        resetGovernor();

        resizeObs = new ResizeObserver(entries => {
            for (const en of entries) {
                const c = en.target as HTMLCanvasElement;
                const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
                const w = Math.max(1, Math.round(en.contentRect.width * dpr)), h = Math.max(1, Math.round(en.contentRect.height * dpr));
                if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
            }
        });
        window.addEventListener("resize", onWindowResize);
        bindMediaSession();
        addServerListElement(ServerListRenderPosition.Above, SafeLauncherButton);
        startPoll();

        checkServer().then(async ok => {
            setRelayBadge(ok);
            if (!ok && settings.store.autoStartRelay) await ensureRelay();
        });

        (window as any).DDTMusic = {
            open: showHud, stop: stopPlayback, search: doSearch,
            play: (s: SongItem) => addToQueue(s, true),
        };
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, SafeLauncherButton);
        teardown();
        delete (window as any).DDTMusic;
    }
});
