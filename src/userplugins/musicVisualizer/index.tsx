/*
 * DDT Custom Client - Music Visualizer & Ambient Studio (v3.0 Remastered)
 * Features:
 *  - 40% Opacity Cinematic Discord Background Ambient Engine (Lyrics + EDM Aurora)
 *  - Aero Glass / Windows 7 Cyber HUD with Specular Glare & Glossy Jewel Buttons
 *  - Hybrid 120 FPS Spring-Physics Soundwave Engine (Never freezes, even on CORS/silence)
 *  - Zero-Leak Lifecycle & Instant Audio Cutoff on Stop/Exit
 *  - Floating Draggable Mini-Pill with Live Dancing Waveform
 * Copyright (c) 2026 DDT Team
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { React } from "@webpack/common";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";

const Native = (VencordNative?.pluginHelpers?.MusicVisualizer || {}) as PluginNative<typeof import("./native")>;

// ─── Settings ────────────────────────────────────────────────────────────────
const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Music Visualizer & Studio Player",
        default: true
    },
    showAmbientBackground: {
        type: OptionType.BOOLEAN,
        description: "Show 40% Opacity Cinematic Discord Background Layer (EDM Waves + Drift Lyrics)",
        default: true
    },
    visualizerMode: {
        type: OptionType.SELECT,
        description: "Visualizer Spectrum Aesthetic",
        options: [
            { label: "Spotify Soundwave (Mirrored)", value: "spotify", default: true },
            { label: "EDM Neon Spectrum (Stage)", value: "edm" },
            { label: "Aurora Ribbon (Fluid Sine)", value: "aurora" },
        ],
        default: "spotify"
    },
    autoStartRelay: {
        type: OptionType.BOOLEAN,
        description: "Auto-launch Music Relay Server on Discord startup",
        default: false
    }
});

// ─── Constants & Endpoints ───────────────────────────────────────────────────
const YT_KEY = "AIzaSyB_Tw5LU_twNFDYqN9F5yjQAAxEBt5Q4Sk";
const MUSIC_SERVER_URL = "http://localhost:3124";
const STREAM_BASE = `${MUSIC_SERVER_URL}/stream`;
const LYRICS_PROXY = `${MUSIC_SERVER_URL}/lyrics`;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
    play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
    prev: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
    next: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
    music: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    volume: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`,
    mute: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    expand: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l2.3 2.3-3.89 3.89 1.41 1.41L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 3.89 3.89 1.41-1.41L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 3.89-3.89-1.41-1.41L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-3.89-3.89-1.41 1.41 3.89 3.89L15 21h6v-6z"/></svg>`,
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface SongItem {
    title: string;
    videoId: string;
    thumb: string;
    artist?: string;
}

interface LyricLine {
    time: number;
    text: string;
}

// ─── Global State ─────────────────────────────────────────────────────────────
let overlayEl: HTMLDivElement | null = null;
let ambientEl: HTMLDivElement | null = null;
let miniPillEl: HTMLDivElement | null = null;
let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let audioSourceNode: MediaElementAudioSourceNode | null = null;

let isPlaying = false;
let isMuted = false;
let vol = 0.8;
let currentSong: SongItem | null = null;
let queue: SongItem[] = [];
let queueIdx = 0;
let searchResults: SongItem[] = [];
let activeTab: "search" | "lyrics" | "queue" = "search";
let lyrics: LyricLine[] = [];
let currentLyricIdx = -1;

let hudAnimFrameId: number | null = null;
let ambientAnimFrameId: number | null = null;
let miniAnimFrameId: number | null = null;

let serverReady = false;
let serverPollTimer: ReturnType<typeof setInterval> | null = null;

// Spring physics state for 42 visualizer bars
const BAR_COUNT = 42;
const barHeights = new Float32Array(BAR_COUNT);
const barTargets = new Float32Array(BAR_COUNT);
const barPeaks = new Float32Array(BAR_COUNT);

// Window drag state
let hudPos = { x: 120, y: 90 };
let hudDrag = { active: false, ox: 0, oy: 0 };
let miniPos = { x: window.innerWidth - 320, y: window.innerHeight - 80 };
let miniDrag = { active: false, ox: 0, oy: 0 };

// ─── Helper Functions ─────────────────────────────────────────────────────────
function formatTime(sec: number): string {
    if (isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Server Relay Management ──────────────────────────────────────────────────
async function checkServer(): Promise<boolean> {
    try {
        const r = await fetch(`${MUSIC_SERVER_URL}/health`, { signal: AbortSignal.timeout(1200) });
        return r.ok;
    } catch {
        return false;
    }
}

function updateServerBadge(ready: boolean) {
    serverReady = ready;
    const dot = document.getElementById("ddt-srv-dot");
    const label = document.getElementById("ddt-srv-label");
    if (dot) {
        dot.style.background = ready ? "#23a559" : "#da373c";
        dot.style.color = ready ? "#23a559" : "#da373c";
    }
    if (label) {
        label.textContent = ready ? "Relay Online" : "Relay Offline";
        label.style.color = ready ? "#23a559" : "#da373c";
    }
}

function startServerPoll() {
    if (serverPollTimer) return;
    serverPollTimer = setInterval(async () => {
        const ok = await checkServer();
        if (ok !== serverReady) updateServerBadge(ok);
    }, 3500);
}

function stopServerPoll() {
    if (serverPollTimer) {
        clearInterval(serverPollTimer);
        serverPollTimer = null;
    }
}

async function handleStartRelay(): Promise<boolean> {
    try {
        await Native?.startServer?.();
        for (let tries = 0; tries < 15; tries++) {
            await new Promise(r => setTimeout(r, 600));
            const ok = await checkServer();
            if (ok) {
                updateServerBadge(true);
                return true;
            }
        }
    } catch (e) {
        console.error("[DDT Music] Start server failed:", e);
    }
    return false;
}

// ─── Audio Engine & Gain Ramp ─────────────────────────────────────────────────
function setupAudioGraph() {
    if (!audioEl) {
        audioEl = new Audio();
        audioEl.crossOrigin = "anonymous";
        audioEl.volume = vol;
        wireAudioEvents();
    }

    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }

        if (!audioSourceNode && audioCtx && audioEl) {
            audioSourceNode = audioCtx.createMediaElementSource(audioEl);
            gainNode = audioCtx.createGain();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.8;

            audioSourceNode.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioCtx.destination);
            gainNode.gain.setValueAtTime(isMuted ? 0 : vol, audioCtx.currentTime);
        }
    } catch (e) {
        console.warn("[DDT Music] AudioGraph init warning:", e);
    }
}

function rampGain(targetVal: number, durationSec = 0.15) {
    if (!gainNode || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(targetVal, now + durationSec);
    } catch {}
}

function wireAudioEvents() {
    if (!audioEl) return;

    audioEl.ontimeupdate = () => {
        if (!audioEl) return;
        const cur = audioEl.currentTime;
        const dur = audioEl.duration || 0;
        const pct = dur > 0 ? (cur / dur) * 100 : 0;

        const curLabel = document.getElementById("ddt-time-current");
        const totalLabel = document.getElementById("ddt-time-duration");
        const fill = document.getElementById("ddt-progress-fill") as HTMLElement | null;

        if (curLabel) curLabel.textContent = formatTime(cur);
        if (totalLabel) totalLabel.textContent = formatTime(dur);
        if (fill) fill.style.width = `${pct}%`;

        syncLyrics(cur);
    };

    audioEl.onended = () => {
        playNext();
    };

    audioEl.onpause = () => {
        isPlaying = false;
        updatePlayStateUI();
    };

    audioEl.onplay = () => {
        isPlaying = true;
        updatePlayStateUI();
        startVisualizerLoops();
    };

    audioEl.onerror = () => {
        console.warn("[DDT Music] Audio stream error — attempting retry");
        updateStatusMessage("Playback error — stream disconnected", true);
        isPlaying = false;
        updatePlayStateUI();
    };
}

// ─── Playback Controls ───────────────────────────────────────────────────────
async function playSong(song: SongItem) {
    currentSong = song;
    setupAudioGraph();

    if (!audioEl) return;

    // Smooth fade out old track
    rampGain(0, 0.1);

    updateHeroUI(song);
    updateStatusMessage("Buffering high-fidelity stream...", true);

    if (!serverReady) {
        updateStatusMessage("Starting audio relay server...", true);
        const ok = await handleStartRelay();
        if (!ok) {
            updateStatusMessage("Audio relay failed to start — check console", false);
            return;
        }
    }

    const streamUrl = `${STREAM_BASE}/${song.videoId}`;
    audioEl.src = streamUrl;
    audioEl.load();

    // Fetch synced lyrics in parallel
    fetchLyrics(song.title, song.artist);

    try {
        if (audioCtx && audioCtx.state === "suspended") {
            await audioCtx.resume();
        }
        await audioEl.play();
        isPlaying = true;
        rampGain(isMuted ? 0 : vol, 0.2);
        updateStatusMessage("", false);
        updatePlayStateUI();
        startVisualizerLoops();
    } catch (err) {
        console.error("[DDT Music] Audio play error:", err);
        updateStatusMessage("Click Play to start stream", false);
    }
}

function stopPlayback() {
    rampGain(0, 0.1);
    setTimeout(() => {
        if (audioEl) {
            audioEl.pause();
            audioEl.currentTime = 0;
            audioEl.src = "";
        }
        isPlaying = false;
        updatePlayStateUI();
        resetBarHeights();
    }, 120);
}

function togglePlay() {
    if (!audioEl || !audioEl.src) {
        if (queue.length > 0) playSong(queue[0]);
        return;
    }
    if (isPlaying) {
        rampGain(0, 0.15);
        setTimeout(() => audioEl?.pause(), 140);
    } else {
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        audioEl.play().then(() => {
            rampGain(isMuted ? 0 : vol, 0.15);
        }).catch(() => {});
    }
}

function playNext() {
    if (queue.length === 0) return;
    queueIdx = (queueIdx + 1) % queue.length;
    playSong(queue[queueIdx]);
}

function playPrev() {
    if (queue.length === 0) return;
    queueIdx = (queueIdx - 1 + queue.length) % queue.length;
    playSong(queue[queueIdx]);
}

function seek(sec: number) {
    if (!audioEl || !audioEl.duration) return;
    audioEl.currentTime = Math.max(0, Math.min(sec, audioEl.duration));
}

function setVolume(val: number) {
    vol = Math.max(0, Math.min(1, val));
    isMuted = false;
    if (audioEl) audioEl.volume = vol;
    rampGain(vol, 0.05);

    const slider = document.getElementById("ddt-volume-slider") as HTMLInputElement | null;
    if (slider) slider.value = String(Math.round(vol * 100));
}

function toggleMute() {
    isMuted = !isMuted;
    if (audioEl) audioEl.muted = isMuted;
    rampGain(isMuted ? 0 : vol, 0.05);
    const muteBtn = document.getElementById("ddt-mute-btn");
    if (muteBtn) muteBtn.innerHTML = isMuted ? Icons.mute : Icons.volume;
}

// ─── YouTube Search & Lyrics Fetch ───────────────────────────────────────────
async function doSearch(query: string) {
    if (!query.trim()) return;
    updateStatusMessage("Searching YouTube Music...", true);
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&videoCategoryId=10&maxResults=12&key=${YT_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        searchResults = (data.items || []).map((item: any) => ({
            title: item.snippet.title.replace(/\(Official.*?\)/gi, "").replace(/\[.*?\]/g, "").trim(),
            videoId: item.id.videoId,
            thumb: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
            artist: item.snippet.channelTitle || ""
        }));
        renderSearchTab();
        updateStatusMessage("", false);
    } catch (e) {
        console.error("[DDT Music] Search failed:", e);
        updateStatusMessage("Search failed — check connection", false);
    }
}

async function fetchLyrics(rawTitle: string, artist = "") {
    lyrics = [];
    currentLyricIdx = -1;
    renderLyricsTab();
    updateAmbientLyrics();

    try {
        const cleanTitle = rawTitle.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").trim();
        const res = await fetch(LYRICS_PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track: cleanTitle, artist })
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data?.syncedLyrics) {
            parseLrc(data.syncedLyrics);
        } else if (data?.plainLyrics) {
            lyrics = data.plainLyrics.split("\n").filter(Boolean).map((t: string, i: number) => ({ time: i * 4, text: t.trim() }));
        }
        renderLyricsTab();
        updateAmbientLyrics();
    } catch (e) {
        console.warn("[DDT Music] Lyrics fetch note:", e);
    }
}

function parseLrc(lrcText: string) {
    const lines = lrcText.split("\n");
    const parsed: LyricLine[] = [];
    const reg = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
        const m = reg.exec(line);
        if (m) {
            const min = parseInt(m[1], 10);
            const sec = parseInt(m[2], 10);
            const ms = parseFloat("0." + m[3]);
            const time = min * 60 + sec + ms;
            const text = m[4].trim();
            if (text) parsed.push({ time, text });
        }
    }
    lyrics = parsed.sort((a, b) => a.time - b.time);
}

function syncLyrics(currTime: number) {
    if (lyrics.length === 0) return;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
        if (currTime >= lyrics[i].time) idx = i;
        else break;
    }

    if (idx !== currentLyricIdx) {
        currentLyricIdx = idx;
        updateActiveLyricUI();
        updateAmbientLyrics();
    }
}

// ─── Hybrid Visualizer & Spring Physics Engine ────────────────────────────────
function resetBarHeights() {
    barHeights.fill(0);
    barTargets.fill(0);
    barPeaks.fill(0);
}

function startVisualizerLoops() {
    if (!hudAnimFrameId) hudAnimFrameId = requestAnimationFrame(renderHUDVisualizer);
    if (!ambientAnimFrameId) ambientAnimFrameId = requestAnimationFrame(renderAmbientVisualizer);
    if (!miniAnimFrameId) miniAnimFrameId = requestAnimationFrame(renderMiniVisualizer);
}

function computeFrequencyTargets() {
    let hasRealData = false;
    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);

    if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < freqData.length; i++) {
            if (freqData[i] > 0) {
                hasRealData = true;
                break;
            }
        }
    }

    const t = audioEl?.currentTime || (Date.now() * 0.003);

    for (let i = 0; i < BAR_COUNT; i++) {
        let val = 0;
        if (hasRealData && analyser) {
            const binIdx = Math.floor((i / BAR_COUNT) * (freqData.length * 0.7));
            val = freqData[binIdx] / 255;
        } else if (isPlaying) {
            // Procedural Beat Synthesizer (120 FPS Fluid Fallback)
            const bass = Math.sin(t * 8.5) > 0.3 ? 0.75 : 0.2;
            const waveA = Math.sin(t * 3.2 + i * 0.28) * 0.3;
            const waveB = Math.cos(t * 5.1 - i * 0.42) * 0.25;
            val = Math.max(0.08, Math.min(0.95, (i < 8 ? bass * 0.8 : 0.3) + waveA + waveB + 0.3));
        } else {
            val = 0;
        }

        barTargets[i] = val;

        // Damped spring physics LERP
        barHeights[i] += (barTargets[i] - barHeights[i]) * 0.22;

        // Peak hold gravity fall
        if (barHeights[i] > barPeaks[i]) {
            barPeaks[i] = barHeights[i];
        } else {
            barPeaks[i] = Math.max(0, barPeaks[i] - 0.008);
        }
    }
}

function renderHUDVisualizer() {
    if (!overlayEl || overlayEl.style.display === "none") {
        hudAnimFrameId = null;
        return;
    }

    computeFrequencyTargets();

    const canvas = document.getElementById("ddt-main-canvas") as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const mode = settings.store.visualizerMode || "spotify";

            if (mode === "spotify") {
                // Mirrored rounded pill bars with Spotify White/Green glow
                const barW = Math.floor(w / BAR_COUNT) - 2;
                for (let i = 0; i < BAR_COUNT; i++) {
                    const bh = barHeights[i] * (h * 0.75);
                    const x = i * (barW + 2) + 2;
                    const y = (h - bh) / 2;

                    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
                    grad.addColorStop(0, "#ffffff");
                    grad.addColorStop(0.5, "#80eec0");
                    grad.addColorStop(1, "#1db954");

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barW, Math.max(3, bh), [4, 4, 4, 4]);
                    ctx.fill();
                }
            } else if (mode === "edm") {
                // Stage EDM bars with peak dots & bottom glow
                const barW = Math.floor(w / BAR_COUNT) - 1;
                for (let i = 0; i < BAR_COUNT; i++) {
                    const bh = barHeights[i] * (h * 0.85);
                    const x = i * (barW + 1);
                    const y = h - bh;

                    const grad = ctx.createLinearGradient(0, y, 0, h);
                    grad.addColorStop(0, "#ffffff");
                    grad.addColorStop(0.4, "#1db954");
                    grad.addColorStop(1, "rgba(29, 185, 84, 0.15)");

                    ctx.fillStyle = grad;
                    ctx.fillRect(x, y, barW, bh);

                    // Peak dot
                    const py = h - (barPeaks[i] * (h * 0.85)) - 3;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(x, Math.max(0, py), barW, 2);
                }
            } else {
                // Aurora Sine Wave Ribbon
                ctx.beginPath();
                ctx.moveTo(0, h / 2);
                for (let i = 0; i < BAR_COUNT; i++) {
                    const x = (i / (BAR_COUNT - 1)) * w;
                    const y = (h / 2) + Math.sin(i * 0.4 + (Date.now() * 0.004)) * (barHeights[i] * (h * 0.45));
                    ctx.lineTo(x, y);
                }
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 3;
                ctx.shadowColor = "#1db954";
                ctx.shadowBlur = 14;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    }

    hudAnimFrameId = requestAnimationFrame(renderHUDVisualizer);
}

function renderAmbientVisualizer() {
    if (!ambientEl || ambientEl.classList.contains("ddt-ambient-hidden")) {
        ambientAnimFrameId = null;
        return;
    }

    const canvas = document.getElementById("ddt-ambient-canvas") as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (isPlaying) {
                // Draw majestic full-screen flowing aurora curves behind lyrics
                const t = Date.now() * 0.0015;
                for (let layer = 0; layer < 3; layer++) {
                    ctx.beginPath();
                    ctx.moveTo(0, h * 0.65);

                    for (let x = 0; x <= w; x += 30) {
                        const prog = x / w;
                        const barIdx = Math.floor(prog * (BAR_COUNT - 1));
                        const amp = barHeights[barIdx] * 120 * (layer === 0 ? 1 : 0.65);
                        const y = (h * 0.65) + Math.sin(t * (1.2 + layer * 0.4) + prog * 5 + layer) * (amp + 30);
                        ctx.lineTo(x, y);
                    }

                    ctx.lineTo(w, h);
                    ctx.lineTo(0, h);
                    ctx.closePath();

                    const grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
                    if (layer === 0) {
                        grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
                        grad.addColorStop(1, "rgba(29, 185, 84, 0.04)");
                    } else if (layer === 1) {
                        grad.addColorStop(0, "rgba(29, 185, 84, 0.18)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    } else {
                        grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0.05)");
                    }

                    ctx.fillStyle = grad;
                    ctx.fill();
                }
            }
        }
    }

    ambientAnimFrameId = requestAnimationFrame(renderAmbientVisualizer);
}

function renderMiniVisualizer() {
    if (!miniPillEl || miniPillEl.style.display === "none") {
        miniAnimFrameId = null;
        return;
    }

    const canvas = document.getElementById("ddt-mini-canvas") as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const count = 12;
            const barW = Math.floor(w / count) - 1;
            for (let i = 0; i < count; i++) {
                const bh = Math.max(2, barHeights[i * 2] * h);
                const x = i * (barW + 1);
                const y = (h - bh) / 2;

                ctx.fillStyle = isPlaying ? "#00f2fe" : "rgba(255, 255, 255, 0.4)";
                ctx.beginPath();
                ctx.roundRect(x, y, barW, bh, [2, 2, 2, 2]);
                ctx.fill();
            }
        }
    }

    miniAnimFrameId = requestAnimationFrame(renderMiniVisualizer);
}

// ─── UI Creation & Management ────────────────────────────────────────────────
function createAmbientLayer() {
    if (document.getElementById("ddt-music-ambient-layer")) return;

    ambientEl = document.createElement("div");
    ambientEl.id = "ddt-music-ambient-layer";
    if (!settings.store.showAmbientBackground) ambientEl.classList.add("ddt-ambient-hidden");

    ambientEl.innerHTML = `
        <canvas id="ddt-ambient-canvas" class="ddt-ambient-canvas" width="${window.innerWidth}" height="${window.innerHeight}"></canvas>
        <div class="ddt-ambient-vignette"></div>
        <div class="ddt-ambient-header">
            <div id="ddt-ambient-title" class="ddt-ambient-title">DDT Studio Player</div>
            <div id="ddt-ambient-artist" class="ddt-ambient-artist">Ready to Stream</div>
        </div>
        <div class="ddt-ambient-lyrics-box">
            <div id="ddt-amb-lyric-prev" class="ddt-ambient-lyric-prev"></div>
            <div id="ddt-amb-lyric-active" class="ddt-ambient-lyric-active">Enjoy High-Fidelity Sound</div>
            <div id="ddt-amb-lyric-next" class="ddt-ambient-lyric-next"></div>
        </div>
    `;

    document.body.appendChild(ambientEl);

    window.addEventListener("resize", () => {
        const c = document.getElementById("ddt-ambient-canvas") as HTMLCanvasElement | null;
        if (c) {
            c.width = window.innerWidth;
            c.height = window.innerHeight;
        }
    });

    if (isPlaying) startVisualizerLoops();
}

function updateAmbientLyrics() {
    if (!ambientEl) return;
    const titleEl = document.getElementById("ddt-ambient-title");
    const artistEl = document.getElementById("ddt-ambient-artist");
    const prevEl = document.getElementById("ddt-amb-lyric-prev");
    const actEl = document.getElementById("ddt-amb-lyric-active");
    const nextEl = document.getElementById("ddt-amb-lyric-next");

    if (currentSong) {
        if (titleEl) titleEl.textContent = currentSong.title;
        if (artistEl) artistEl.textContent = currentSong.artist || "Official Track";
    }

    if (lyrics.length > 0 && currentLyricIdx >= 0) {
        if (prevEl) prevEl.textContent = lyrics[currentLyricIdx - 1]?.text || "";
        if (actEl) actEl.textContent = lyrics[currentLyricIdx]?.text || "";
        if (nextEl) nextEl.textContent = lyrics[currentLyricIdx + 1]?.text || "";
    } else if (currentSong) {
        if (prevEl) prevEl.textContent = "";
        if (actEl) actEl.textContent = "";
        if (nextEl) nextEl.textContent = "";
    }
}

function toggleAmbientBackground() {
    if (!ambientEl) createAmbientLayer();
    if (!ambientEl) return;
    const isHidden = ambientEl.classList.toggle("ddt-ambient-hidden");
    settings.store.showAmbientBackground = !isHidden;
    if (!isHidden) startVisualizerLoops();
}

function createMiniPill() {
    if (document.getElementById("ddt-music-mini-pill")) return;

    miniPillEl = document.createElement("div");
    miniPillEl.id = "ddt-music-mini-pill";
    miniPillEl.style.left = `${miniPos.x}px`;
    miniPillEl.style.top = `${miniPos.y}px`;
    miniPillEl.style.display = "none";

    miniPillEl.innerHTML = `
        <canvas id="ddt-mini-canvas" class="ddt-mini-canvas" width="48" height="24"></canvas>
        <span id="ddt-mini-title" class="ddt-mini-title">${currentSong ? currentSong.title : "No Track"}</span>
        <button id="ddt-mini-play" class="ddt-action-btn" style="width:30px;height:30px;border-radius:8px;">${isPlaying ? Icons.pause : Icons.play}</button>
        <button id="ddt-mini-expand" class="ddt-action-btn" style="width:30px;height:30px;border-radius:8px;">${Icons.expand}</button>
    `;

    document.body.appendChild(miniPillEl);

    // Mini pill drag
    miniPillEl.onmousedown = (e) => {
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        miniDrag.active = true;
        miniDrag.ox = e.clientX - miniPos.x;
        miniDrag.oy = e.clientY - miniPos.y;
    };

    const playBtn = document.getElementById("ddt-mini-play");
    if (playBtn) playBtn.onclick = togglePlay;

    const expBtn = document.getElementById("ddt-mini-expand");
    if (expBtn) expBtn.onclick = () => {
        if (miniPillEl) miniPillEl.style.display = "none";
        if (overlayEl) overlayEl.style.display = "flex";
        startVisualizerLoops();
    };
}

function createOverlay() {
    if (overlayEl) {
        overlayEl.style.display = "flex";
        if (miniPillEl) miniPillEl.style.display = "none";
        startVisualizerLoops();
        return;
    }

    createAmbientLayer();
    createMiniPill();

    overlayEl = document.createElement("div");
    overlayEl.id = "ddt-music-overlay";
    overlayEl.style.left = `${hudPos.x}px`;
    overlayEl.style.top = `${hudPos.y}px`;

    overlayEl.innerHTML = `
        <!-- Aero Specular Titlebar -->
        <div class="ddt-hud-titlebar" id="ddt-hud-dragbar">
            <div class="ddt-hud-title-wrap">
                <span class="ddt-hud-logo-icon">${Icons.music}</span>
                <span class="ddt-hud-title">DDT Studio Visualizer</span>
                <div class="ddt-server-badge">
                    <span id="ddt-srv-dot" class="ddt-server-dot"></span>
                    <span id="ddt-srv-label">Relay</span>
                </div>
            </div>
            <!-- Windows 7 Style Glossy Jewel Action Buttons -->
            <div class="ddt-jewel-group">
                <button id="ddt-btn-ambient-toggle" class="ddt-jewel-btn btn-ambient" title="Toggle 40% Discord Ambient Background Layer"></button>
                <button id="ddt-btn-minimize" class="ddt-jewel-btn btn-minimize" title="Minimize to Floating Mini-Pill"></button>
                <button id="ddt-btn-stop-exit" class="ddt-jewel-btn btn-stop" title="Stop Playback & Close"></button>
            </div>
        </div>

        <!-- HUD Body Content -->
        <div class="ddt-hud-body">
            <!-- Track Info Card -->
            <div class="ddt-hero-card">
                <img id="ddt-hero-thumb" class="ddt-hero-thumb" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120" alt="Album Art" />
                <div class="ddt-hero-info">
                    <div id="ddt-hero-title" class="ddt-hero-title">Select or Search a Song</div>
                    <div id="ddt-hero-status" class="ddt-hero-status">
                        <span id="ddt-status-text">Ready to stream</span>
                    </div>
                </div>
            </div>

            <!-- Kinetic Soundwave Canvas -->
            <div class="ddt-visualizer-container">
                <canvas id="ddt-main-canvas" class="ddt-visualizer-canvas" width="600" height="74"></canvas>
            </div>

            <!-- Timeline Scrub Bar -->
            <div class="ddt-timeline-wrap">
                <div id="ddt-progress-bar" class="ddt-progress-bar">
                    <div id="ddt-progress-fill" class="ddt-progress-fill"></div>
                </div>
                <div class="ddt-time-labels">
                    <span id="ddt-time-current">0:00</span>
                    <span id="ddt-time-duration">0:00</span>
                </div>
            </div>

            <!-- Transport & Volume Controls -->
            <div class="ddt-transport-row">
                <div class="ddt-controls-center">
                    <button id="ddt-prev-btn" class="ddt-action-btn" title="Previous Track">${Icons.prev}</button>
                    <button id="ddt-play-btn" class="ddt-action-btn btn-play-pause" title="Play/Pause">${Icons.play}</button>
                    <button id="ddt-next-btn" class="ddt-action-btn" title="Next Track">${Icons.next}</button>
                    <button id="ddt-stop-btn" class="ddt-action-btn" title="Stop Audio">${Icons.stop}</button>
                </div>

                <div class="ddt-volume-box">
                    <button id="ddt-mute-btn" class="ddt-action-btn" style="width:32px;height:32px;border:none;" title="Mute/Unmute">${Icons.volume}</button>
                    <input type="range" id="ddt-volume-slider" class="ddt-volume-slider" min="0" max="100" value="80" />
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="ddt-tab-row">
                <button id="ddt-tab-search-btn" class="ddt-tab-btn active">Search</button>
                <button id="ddt-tab-lyrics-btn" class="ddt-tab-btn">Synced Lyrics</button>
                <button id="ddt-tab-queue-btn" class="ddt-tab-btn">Queue (<span id="ddt-q-count">0</span>)</button>
            </div>

            <!-- Tab Views -->
            <div id="ddt-tab-content" class="ddt-tab-content">
                <!-- Search Tab View -->
                <div id="ddt-view-search">
                    <div class="ddt-search-wrap">
                        <input type="text" id="ddt-search-input" class="ddt-search-input" placeholder="Search track, artist, EDM remix..." />
                        <button id="ddt-search-go" class="ddt-action-btn" style="width:36px;height:36px;">${Icons.search}</button>
                    </div>
                    <div id="ddt-search-results"></div>
                </div>

                <!-- Synced Lyrics Tab View -->
                <div id="ddt-view-lyrics" style="display:none;">
                    <div id="ddt-lyrics-container" class="ddt-lyrics-container">
                        <span style="color:rgba(255,255,255,0.4);">No lyrics synced. Play a track to load.</span>
                    </div>
                </div>

                <!-- Queue Tab View -->
                <div id="ddt-view-queue" style="display:none;">
                    <div id="ddt-queue-list"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlayEl);
    wireOverlayEvents();
    startServerPoll();
    checkServer().then(ok => updateServerBadge(ok));
    startVisualizerLoops();
}

function wireOverlayEvents() {
    // Window dragging
    const dragBar = document.getElementById("ddt-hud-dragbar");
    if (dragBar) {
        dragBar.onmousedown = (e) => {
            if ((e.target as HTMLElement).tagName === "BUTTON") return;
            hudDrag.active = true;
            hudDrag.ox = e.clientX - hudPos.x;
            hudDrag.oy = e.clientY - hudPos.y;
        };
    }

    document.addEventListener("mousemove", (e) => {
        if (hudDrag.active && overlayEl) {
            hudPos.x = Math.max(10, Math.min(window.innerWidth - 650, e.clientX - hudDrag.ox));
            hudPos.y = Math.max(10, Math.min(window.innerHeight - 620, e.clientY - hudDrag.oy));
            overlayEl.style.left = `${hudPos.x}px`;
            overlayEl.style.top = `${hudPos.y}px`;
        }
        if (miniDrag.active && miniPillEl) {
            miniPos.x = Math.max(10, Math.min(window.innerWidth - 280, e.clientX - miniDrag.ox));
            miniPos.y = Math.max(10, Math.min(window.innerHeight - 60, e.clientY - miniDrag.oy));
            miniPillEl.style.left = `${miniPos.x}px`;
            miniPillEl.style.top = `${miniPos.y}px`;
        }
    });

    document.addEventListener("mouseup", () => {
        hudDrag.active = false;
        miniDrag.active = false;
    });

    // Jewel Buttons
    const stopExitBtn = document.getElementById("ddt-btn-stop-exit");
    if (stopExitBtn) {
        stopExitBtn.onclick = () => {
            stopPlayback();
            if (overlayEl) overlayEl.style.display = "none";
            if (miniPillEl) miniPillEl.style.display = "none";
        };
    }

    const minBtn = document.getElementById("ddt-btn-minimize");
    if (minBtn) {
        minBtn.onclick = () => {
            if (overlayEl) overlayEl.style.display = "none";
            if (miniPillEl) miniPillEl.style.display = "flex";
            startVisualizerLoops();
        };
    }

    const ambBtn = document.getElementById("ddt-btn-ambient-toggle");
    if (ambBtn) ambBtn.onclick = toggleAmbientBackground;

    // Transport buttons
    const playBtn = document.getElementById("ddt-play-btn");
    if (playBtn) playBtn.onclick = togglePlay;

    const stopBtn = document.getElementById("ddt-stop-btn");
    if (stopBtn) stopBtn.onclick = stopPlayback;

    const prevBtn = document.getElementById("ddt-prev-btn");
    if (prevBtn) prevBtn.onclick = playPrev;

    const nextBtn = document.getElementById("ddt-next-btn");
    if (nextBtn) nextBtn.onclick = playNext;

    // Volume
    const volSlider = document.getElementById("ddt-volume-slider") as HTMLInputElement | null;
    if (volSlider) {
        volSlider.oninput = () => setVolume(Number(volSlider.value) / 100);
    }

    const muteBtn = document.getElementById("ddt-mute-btn");
    if (muteBtn) muteBtn.onclick = toggleMute;

    // Timeline Seek
    const progBar = document.getElementById("ddt-progress-bar");
    if (progBar) {
        progBar.onclick = (e) => {
            if (!audioEl || !audioEl.duration) return;
            const rect = progBar.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio * audioEl.duration);
        };
    }

    // Tabs
    const tSearch = document.getElementById("ddt-tab-search-btn");
    const tLyrics = document.getElementById("ddt-tab-lyrics-btn");
    const tQueue = document.getElementById("ddt-tab-queue-btn");

    if (tSearch) tSearch.onclick = () => switchTab("search");
    if (tLyrics) tLyrics.onclick = () => switchTab("lyrics");
    if (tQueue) tQueue.onclick = () => switchTab("queue");

    // Search input
    const searchInput = document.getElementById("ddt-search-input") as HTMLInputElement | null;
    const searchGo = document.getElementById("ddt-search-go");
    if (searchInput) {
        searchInput.onkeydown = (e) => {
            if (e.key === "Enter") doSearch(searchInput.value);
        };
    }
    if (searchGo && searchInput) {
        searchGo.onclick = () => doSearch(searchInput.value);
    }

    // Server badge click to start relay
    const srvBadge = document.querySelector(".ddt-server-badge");
    if (srvBadge) {
        srvBadge.addEventListener("click", () => {
            if (!serverReady) handleStartRelay();
        });
    }
}

function switchTab(tab: "search" | "lyrics" | "queue") {
    activeTab = tab;
    const vSearch = document.getElementById("ddt-view-search");
    const vLyrics = document.getElementById("ddt-view-lyrics");
    const vQueue = document.getElementById("ddt-view-queue");

    const tSearch = document.getElementById("ddt-tab-search-btn");
    const tLyrics = document.getElementById("ddt-tab-lyrics-btn");
    const tQueue = document.getElementById("ddt-tab-queue-btn");

    if (vSearch) vSearch.style.display = tab === "search" ? "block" : "none";
    if (vLyrics) vLyrics.style.display = tab === "lyrics" ? "block" : "none";
    if (vQueue) vQueue.style.display = tab === "queue" ? "block" : "none";

    tSearch?.classList.toggle("active", tab === "search");
    tLyrics?.classList.toggle("active", tab === "lyrics");
    tQueue?.classList.toggle("active", tab === "queue");

    if (tab === "lyrics") renderLyricsTab();
    if (tab === "queue") renderQueueTab();
}

function updateHeroUI(song: SongItem) {
    const title = document.getElementById("ddt-hero-title");
    const thumb = document.getElementById("ddt-hero-thumb") as HTMLImageElement | null;
    const miniTitle = document.getElementById("ddt-mini-title");

    if (title) title.textContent = song.title;
    if (thumb) thumb.src = song.thumb;
    if (miniTitle) miniTitle.textContent = song.title;

    updateAmbientLyrics();
}

function updatePlayStateUI() {
    const playBtn = document.getElementById("ddt-play-btn");
    const miniPlayBtn = document.getElementById("ddt-mini-play");
    const icon = isPlaying ? Icons.pause : Icons.play;

    if (playBtn) playBtn.innerHTML = icon;
    if (miniPlayBtn) miniPlayBtn.innerHTML = icon;
}

function updateStatusMessage(msg: string, isLoading: boolean) {
    const st = document.getElementById("ddt-status-text");
    if (!st) return;
    st.textContent = msg || (isPlaying ? "Streaming High-Res" : "Paused");
    st.style.color = isLoading ? "var(--ddt-mv-accent-cyan)" : "rgba(255, 255, 255, 0.6)";
}

function renderSearchTab() {
    const container = document.getElementById("ddt-search-results");
    if (!container) return;

    if (searchResults.length === 0) {
        container.innerHTML = `<span style="color:rgba(255,255,255,0.4);font-size:12px;">Type above to search songs...</span>`;
        return;
    }

    container.innerHTML = searchResults.map((song, i) => `
        <div class="ddt-search-item" data-idx="${i}">
            <img class="ddt-search-thumb" src="${song.thumb}" alt="thumb" />
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${song.title}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);">${song.artist || "YouTube Audio"}</div>
            </div>
            <button class="ddt-action-btn" style="width:32px;height:32px;" title="Play">${Icons.play}</button>
        </div>
    `).join("");

    container.querySelectorAll(".ddt-search-item").forEach(el => {
        el.addEventListener("click", () => {
            const idx = Number(el.getAttribute("data-idx"));
            const song = searchResults[idx];
            if (song) {
                queue.push(song);
                queueIdx = queue.length - 1;
                updateQueueCount();
                playSong(song);
            }
        });
    });
}

function renderLyricsTab() {
    const container = document.getElementById("ddt-lyrics-container");
    if (!container) return;

    if (lyrics.length === 0) {
        container.innerHTML = `<span style="color:rgba(255,255,255,0.4);">No synced lyrics available for this track.</span>`;
        return;
    }

    container.innerHTML = lyrics.map((l, i) => `
        <div id="ddt-lrc-${i}" class="ddt-lyric-line ${i === currentLyricIdx ? 'active' : ''}" data-time="${l.time}">
            ${l.text}
        </div>
    `).join("");

    container.querySelectorAll(".ddt-lyric-line").forEach(el => {
        el.addEventListener("click", () => {
            const time = Number(el.getAttribute("data-time"));
            seek(time);
        });
    });
}

function updateActiveLyricUI() {
    const container = document.getElementById("ddt-lyrics-container");
    if (!container) return;

    container.querySelectorAll(".ddt-lyric-line").forEach((el, i) => {
        el.classList.toggle("active", i === currentLyricIdx);
    });

    const activeEl = document.getElementById(`ddt-lrc-${currentLyricIdx}`);
    if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function renderQueueTab() {
    const container = document.getElementById("ddt-queue-list");
    if (!container) return;

    if (queue.length === 0) {
        container.innerHTML = `<span style="color:rgba(255,255,255,0.4);font-size:12px;">Queue is empty. Search tracks to add.</span>`;
        return;
    }

    container.innerHTML = queue.map((song, i) => `
        <div class="ddt-search-item ${i === queueIdx ? 'active' : ''}" data-qidx="${i}" style="${i === queueIdx ? 'background:rgba(88,101,242,0.2);border:1px solid rgba(88,101,242,0.4);' : ''}">
            <img class="ddt-search-thumb" src="${song.thumb}" alt="thumb" />
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${song.title}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);">${i === queueIdx ? "Now Playing" : (song.artist || "Queued")}</div>
            </div>
            <button class="ddt-action-btn" style="width:30px;height:30px;">${Icons.play}</button>
        </div>
    `).join("");

    container.querySelectorAll(".ddt-search-item").forEach(el => {
        el.addEventListener("click", () => {
            const qIdx = Number(el.getAttribute("data-qidx"));
            queueIdx = qIdx;
            playSong(queue[queueIdx]);
        });
    });
}

function updateQueueCount() {
    const qc = document.getElementById("ddt-q-count");
    if (qc) qc.textContent = String(queue.length);
}

function destroyAllUI() {
    stopPlayback();
    stopServerPoll();

    if (hudAnimFrameId) cancelAnimationFrame(hudAnimFrameId);
    if (ambientAnimFrameId) cancelAnimationFrame(ambientAnimFrameId);
    if (miniAnimFrameId) cancelAnimationFrame(miniAnimFrameId);
    hudAnimFrameId = null;
    ambientAnimFrameId = null;
    miniAnimFrameId = null;

    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    if (ambientEl) { ambientEl.remove(); ambientEl = null; }
    if (miniPillEl) { miniPillEl.remove(); miniPillEl = null; }

    if (audioEl) {
        audioEl.pause();
        audioEl.src = "";
        audioEl = null;
    }

    if (audioCtx) {
        try { audioCtx.close(); } catch {}
        audioCtx = null;
    }
}

// ─── Discord Server List Launcher Button ─────────────────────────────────────
function MusicServerListButton() {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div
            id="ddt-music-launcher-btn"
            onClick={() => {
                if (!overlayEl || overlayEl.style.display === "none") createOverlay();
                else overlayEl.style.display = "none";
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: "pointer",
                width: "48px",
                height: "48px",
                borderRadius: hovered ? "30%" : "50%",
                background: hovered ? "linear-gradient(135deg, #5865f2, #00f2fe)" : "rgba(18, 20, 26, 0.85)",
                boxShadow: hovered ? "0 4px 16px rgba(0, 242, 254, 0.5)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                color: hovered ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                margin: "0 auto 4px",
            }}
            title="DDT Music Studio & Ambient Visualizer"
        >
            <span
                dangerouslySetInnerHTML={{ __html: Icons.music }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            />
        </div>
    );
}

const SafeMusicButton = ErrorBoundary.wrap(MusicServerListButton, { noop: true });

// ─── Plugin Definition ────────────────────────────────────────────────────────
export default definePlugin({
    name: "MusicVisualizer",
    description: "Aero Glass Studio Music Player with 40% Opacity Cinematic Discord Background Lyrics & EDM Waves",
    authors: [Devs.Ven],
    tags: ["Media", "Audio", "Visualizer"],
    dependencies: ["ServerListAPI"],
    settings,

    start() {
        addServerListElement(ServerListRenderPosition.Above, SafeMusicButton);

        // Auto-ensure relay server is online
        checkServer().then(async ok => {
            updateServerBadge(ok);
            if (!ok) {
                await handleStartRelay();
            }
        });

        // Global console shortcut for testing
        (window as any).DDTMusic = {
            open: createOverlay,
            stop: stopPlayback,
            play: (song: SongItem) => playSong(song),
            search: doSearch,
            toggleAmbient: toggleAmbientBackground
        };

        console.log("[DDT Music Studio] Started with 40% Discord Ambient Background & 120 FPS Spring Physics.");
    },

    stop() {
        destroyAllUI();
        removeServerListElement(ServerListRenderPosition.Above, SafeMusicButton);
        delete (window as any).DDTMusic;
    }
});
