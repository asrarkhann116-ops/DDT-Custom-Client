/*
 * DDT Custom Client - Music Player (REWRITE v2)
 * Real audio via cobalt.tools + Synced Lyrics + Premium UI
 * Copyright (c) 2024 DDT Team
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { React } from "@webpack/common";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";

const Native = (VencordNative?.pluginHelpers?.MusicVisualizer || {}) as PluginNative<typeof import("./native")>;

// ─── Design Tokens (Ultra-Premium OLED Obsidian & Cyber Glass) ─────────────
const T = {
    bg:       "rgba(10, 11, 14, 0.94)",     // Deep obsidian background
    surface:  "rgba(18, 19, 24, 0.85)",     // Frosted glass card
    elevated: "rgba(28, 30, 38, 0.70)",     // Floating pill/element
    border:   "rgba(255, 255, 255, 0.08)",  // Subtle diamond edge
    borderGlow: "rgba(88, 101, 242, 0.35)", // Cyber glow border
    accent:   "#5865f2",                   // Discord blurple
    accentCyan: "#00f2fe",                 // Electric cyber cyan
    accentHov:"#4752c4",
    green:    "#23a559",
    text:     "#ffffff",
    muted:    "#949ba4",
    subtle:   "#4e5058",
    danger:   "#da373c",
    radius:   "12px",
    font:     "-apple-system, BlinkMacSystemFont, 'gg sans', 'Segoe UI', Roboto, 'Noto Sans', sans-serif",
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
    play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    music: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    volume: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
    mute: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
    lyrics: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>`,
    loader: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`,
    pip: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`,
};

// ─── Global State ─────────────────────────────────────────────────────────────
let overlayEl: HTMLDivElement | null = null;
let floatingLyricsEl: HTMLDivElement | null = null;
let isFloatingLyricsOpen = false;
let floatDragData = { active: false, ox: 0, oy: 0 };
let floatPos = { x: window.innerWidth / 2 - 275, y: window.innerHeight - 150 };
let audioEl: HTMLAudioElement | null = null;
let lyricTimer: number | null = null;
let dragData: { active: boolean; ox: number; oy: number } = { active: false, ox: 0, oy: 0 };
let position = { x: 80, y: 80 };
let vol = 0.8;
let isMuted = false;
let isPlaying = false;
let currentVideoId = "";
let lyrics: Array<{ time: number; text: string }> = [];
let queue: Array<{ title: string; videoId: string; thumb: string }> = [];
let queueIdx = 0;
let activeTab: "search" | "lyrics" | "queue" = "search";
let searchCache: Array<{ title: string; videoId: string; thumb: string }> = [];
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioSourceNode: MediaElementAudioSourceNode | null = null;
let animFrameId: number | null = null;
let hudAnimFrameId: number | null = null;

// ─── Server State ─────────────────────────────────────────────────────────────
let serverReady = false;
let serverPollTimer: number | null = null;
let serverStarting = false;

async function checkServer(): Promise<boolean> {
    try {
        const r = await fetch(`${MUSIC_SERVER_URL}/health`, { signal: AbortSignal.timeout(1200) });
        return r.ok;
    } catch {
        return false;
    }
}

function updateServerStatusDot(ready: boolean) {
    serverReady = ready;
    const dot = document.getElementById("ddt-server-dot");
    const label = document.getElementById("ddt-server-label");
    const splash = document.getElementById("ddt-server-splash");
    const playerBody = document.getElementById("ddt-player-body");

    if (dot) {
        dot.style.background = ready ? "#23a559" : "#da373c";
        dot.title = ready ? "Relay server: Online" : "Relay server: Offline";
    }
    if (label) {
        label.textContent = ready ? "Online" : "Offline";
        label.style.color = ready ? "#23a559" : "#da373c";
    }
    if (splash) splash.style.display = ready ? "none" : "flex";
    if (playerBody) playerBody.style.display = ready ? "flex" : "none";
    // Show/hide Stop Server button
    const stopBtn = document.getElementById("ddt-stop-server-btn");
    if (stopBtn) stopBtn.style.display = ready ? "block" : "none";

}

function startServerPoll() {
    if (serverPollTimer) return;
    serverPollTimer = setInterval(async () => {
        const ok = await checkServer();
        if (ok !== serverReady) updateServerStatusDot(ok);
    }, 3000) as unknown as number;
}

function stopServerPoll() {
    if (serverPollTimer) { clearInterval(serverPollTimer); serverPollTimer = null; }
}

async function handleStartServer() {
    if (serverStarting) return;
    serverStarting = true;

    const btn = document.getElementById("ddt-splash-start-btn");
    const statusMsg = document.getElementById("ddt-splash-status");
    if (btn) btn.textContent = "Starting...";
    if (statusMsg) statusMsg.textContent = "Launching relay server...";

    try {
        const res = await Native?.startServer?.();
        if (res?.success) {
            // Poll until actually responsive
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts++;
                const ok = await checkServer();
                if (ok) {
                    clearInterval(interval);
                    serverStarting = false;
                    updateServerStatusDot(true);
                } else if (attempts >= 12) {
                    clearInterval(interval);
                    serverStarting = false;
                    if (statusMsg) statusMsg.textContent = "Server started but not responding. Retry?";
                    if (btn) btn.textContent = "Start Relay Server";
                }
            }, 800);
        } else {
            serverStarting = false;
            if (statusMsg) statusMsg.textContent = `Failed: ${res?.message || "unknown error"}`;
            if (btn) btn.textContent = "Retry";
        }
    } catch (e) {
        serverStarting = false;
        if (statusMsg) statusMsg.textContent = "Start failed — check console";
        if (btn) btn.textContent = "Retry";
    }
}

const YT_KEY = "AIzaSyB_Tw5LU_twNFDYqN9F5yjQAAxEBt5Q4Sk";
const MUSIC_SERVER_URL = "http://localhost:3124";
const AUDIO_PROXY  = `${MUSIC_SERVER_URL}/audio`;
const STREAM_BASE  = `${MUSIC_SERVER_URL}/stream`;
const LYRICS_PROXY = `${MUSIC_SERVER_URL}/lyrics`;


// ─── Utilities ────────────────────────────────────────────────────────────────
function fmt(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css?: string, html?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html !== undefined) e.innerHTML = html;
    return e;
}

function btn(
    icon: string,
    tip: string,
    styles: string,
    onClick: () => void,
    id?: string
): HTMLButtonElement {
    const b = el("button", `
        background: transparent;
        border: none;
        color: ${T.muted};
        width: 36px; height: 36px;
        border-radius: 6px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: color 0.15s, background 0.15s;
        flex-shrink: 0;
        ${styles}
    `);
    b.innerHTML = icon;
    b.title = tip;
    if (id) b.id = id;
    b.onmouseenter = () => { b.style.background = T.elevated; b.style.color = T.text; };
    b.onmouseleave = () => { b.style.background = "transparent"; b.style.color = T.muted; };
    b.onclick = onClick;
    return b;
}

// ─── YouTube Search ───────────────────────────────────────────────────────────
async function ytSearch(q: string): Promise<Array<{ title: string; videoId: string; thumb: string }>> {
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + " audio")}&type=video&videoCategoryId=10&maxResults=10&key=${YT_KEY}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`YT API ${r.status}`);
        const d = await r.json();
        return (d.items || []).map((item: any) => ({
            title: item.snippet.title.replace(/\(Official.*?\)/gi, "").replace(/\[.*?\]/g, "").trim(),
            videoId: item.id.videoId,
            thumb: item.snippet.thumbnails?.medium?.url || "",
        }));
    } catch (e) {
        console.error("[DDT Music] YT search:", e);
        return [];
    }
}


// ─── Lyrics via POST /lyrics proxy ───────────────────────────────────────────
async function fetchLyrics(title: string, videoId?: string): Promise<boolean> {
    try {
        // ── Clean YouTube title noise ──────────────────────────────────────────
        const cleaned = title
            .replace(/\(.*?\)/g, "")
            .replace(/\[.*?\]/g, "")
            .replace(/official|audio|video|lyrics|hd|hq|4k|mv|full song|song/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim();

        let track = cleaned;
        let artist = "";

        if (cleaned.includes(" | ")) {
            // YouTube: "Song Name | Artist | Movie" — FIRST segment = song title
            // (not shortest — shortest gives wrong results)
            const parts = cleaned.split(" | ").map((p: string) => p.trim()).filter(Boolean);
            track  = parts[0];                                   // first = song
            artist = parts.slice(1).join(" ").trim();            // rest = context
        } else if (cleaned.includes(" - ")) {
            const parts = cleaned.split(" - ");
            const first = parts[0].trim();
            const rest  = parts.slice(1).join(" - ").trim();
            // Heuristic: second segment tends to be shorter when it's the song title
            // e.g. "Alan Walker, Sabrina Carpenter & Farruko - On My Way"
            //       first=long artist list, rest=short song → artist=first, track=rest
            // e.g. "Faded - Alan Walker" → first=short song, rest=short artist → artist=rest, track=first
            const firstWords = first.split(/\s+/).length;
            const restWords  = rest.split(/\s+/).length;
            if (firstWords > restWords) {
                // First part is longer → likely the artist list
                artist = first;
                track  = rest;
            } else {
                // First part is shorter → likely the song title
                track  = first;
                artist = rest;
            }
        }

        console.log(`[DDT Music] Lyrics: track="${track}" artist="${artist.substring(0, 40)}"`);

        // ── Try multiple queries, stop at first synced hit ─────────────────────
        const queries = [
            { track, artist },                        // 1. best parsed
            { track, artist: "" },                    // 2. track only
            { track: cleaned.split(" | ")[0], artist: "" },  // 3. raw first segment
            { track: title.split("|")[0].trim(), artist: "" }, // 4. raw title first
        ];

        for (const q of queries) {
            if (!q.track) continue;
            const r = await fetch(LYRICS_PROXY, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(q),
            });
            if (!r.ok) continue;
            const d = await r.json();

            if (d.syncedLyrics) {
                console.log(`[DDT Music] Lyrics hit: "${d.trackName}" by ${d.artistName}`);
                lyrics = parseLRC(d.syncedLyrics);
                if (lyrics.length > 0) return true;
            }
            if (d.plainLyrics) {
                console.log(`[DDT Music] Plain lyrics: "${d.trackName}"`);
                lyrics = d.plainLyrics.split("\n")
                    .filter((l: string) => l.trim())
                    .map((l: string, i: number) => ({ time: i * 4, text: l }));
                return true;
            }
        }

        lyrics = [];
        return false;
    } catch (e) {
        console.error("[DDT Music] Lyrics:", e);
        lyrics = [];
        return false;
    }
}


function parseLRC(lrc: string): Array<{ time: number; text: string }> {
    return lrc.split("\n").reduce((acc, line) => {
        const m = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
        if (m) {
            const t = +m[1] * 60 + +m[2] + (m[3] ? +m[3] / 100 : 0);
            const text = m[4].trim();
            if (text) acc.push({ time: t, text });
        }
        return acc;
    }, [] as Array<{ time: number; text: string }>).sort((a, b) => a.time - b.time);
}

// ─── Playback ─────────────────────────────────────────────────────────────────
async function playSong(song: { title: string; videoId: string; thumb: string }) {
    currentVideoId = song.videoId;

    // Update now-playing UI immediately
    const nowTitle = document.getElementById("ddt-np-title");
    const nowThumb = document.getElementById("ddt-np-thumb") as HTMLImageElement | null;
    const noMusicEl = document.getElementById("ddt-no-music-icon");
    if (nowTitle) nowTitle.textContent = song.title;
    if (nowThumb) {
        nowThumb.style.display = "none"; // hide until load event fires
        nowThumb.src = song.thumb;
    }
    if (noMusicEl) noMusicEl.style.display = song.thumb ? "none" : "flex";

    setStatus("Fetching audio...", true);

    // Stop previous
    if (audioEl) { audioEl.pause(); audioEl.src = ""; }
    if (lyricTimer) { clearInterval(lyricTimer); lyricTimer = null; }

    // Fetch lyrics in parallel (don't await yet)
    const lyricsPromise = fetchLyrics(song.title);

    // Stream directly via proxy (instant playback)
    // Using 'localhost' instead of 127.0.0.1 bypasses the Mixed Content block in Chromium
    if (!audioEl) {
        audioEl = new Audio();
        audioEl.crossOrigin = "anonymous";
        audioEl.volume = vol;
        wireAudioEvents();
    }

    audioEl.src = `${STREAM_BASE}/${song.videoId}`;
    audioEl.volume = isMuted ? 0 : vol;
    setStatus("", false);
    await audioEl.play().catch(e => {
        console.error("[DDT Music] Play error:", e);
        setStatus("Playback error: click Play again", false);
    });
    isPlaying = true;
    updatePlayBtn();
    startVisualizer();

    // After lyrics resolve, start sync
    const hasLyrics = await lyricsPromise;
    if (activeTab === "lyrics") renderLyricsTab();
    if (hasLyrics && lyrics.length > 0) startLyricSync();
}

function wireAudioEvents() {
    if (!audioEl) return;

    audioEl.ontimeupdate = () => {
        const cur = document.getElementById("ddt-time-cur");
        const total = document.getElementById("ddt-time-total");
        const bar = document.getElementById("ddt-progress-fill") as HTMLElement | null;
        if (!audioEl) return;
        const pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
        if (cur) cur.textContent = fmt(audioEl.currentTime);
        if (total) total.textContent = fmt(audioEl.duration || 0);
        if (bar) bar.style.width = `${pct}%`;
    };

    audioEl.onended = () => {
        isPlaying = false;
        setStatus("", false);
        updatePlayBtn();
        stopVisualizer();
        playNext();
    };

    audioEl.onpause = () => {
        isPlaying = false;
        updatePlayBtn();
        stopVisualizer();
    };

    audioEl.onplay = () => {
        isPlaying = true;
        updatePlayBtn();
        startVisualizer();
    };

    audioEl.onerror = () => {
        // If song already finished naturally, don't show geo-blocked error
        if (audioEl && audioEl.duration && Math.abs(audioEl.currentTime - audioEl.duration) < 2) {
            isPlaying = false;
            updatePlayBtn();
            stopVisualizer();
            return;
        }
        setStatus("Playback error — check proxy or try next song", false);
        isPlaying = false;
        updatePlayBtn();
        stopVisualizer();
    };
}

function togglePlay() {
    if (!audioEl || !audioEl.src) return;
    if (isPlaying) { audioEl.pause(); isPlaying = false; }
    else { audioEl.play(); isPlaying = true; }
    updatePlayBtn();
}

function playNext() {
    if (queue.length === 0) return;
    queueIdx = (queueIdx + 1) % queue.length;
    playSong(queue[queueIdx]);
}

function updatePlayBtn() {
    const b = document.getElementById("ddt-play-btn");
    if (b) b.innerHTML = isPlaying ? Icons.pause : Icons.play;

    const vinyl = document.getElementById("ddt-hud-vinyl");
    if (vinyl) {
        if (isPlaying) vinyl.classList.remove("ddt-paused-disk");
        else vinyl.classList.add("ddt-paused-disk");
    }
}

function setStatus(msg: string, loading: boolean) {
    const s = document.getElementById("ddt-status");
    if (!s) return;
    s.style.display = msg || loading ? "flex" : "none";
    if (loading) {
        s.innerHTML = `
            <style>@keyframes ddt-spin{to{transform:rotate(360deg)}}</style>
            <span style="animation:ddt-spin 0.8s linear infinite;display:inline-block;color:${T.accent}">${Icons.loader}</span>
            <span style="color:${T.muted};font-size:12px;margin-left:8px">${msg}</span>`;
    } else if (msg) {
        s.innerHTML = `<span style="color:${T.danger};font-size:12px">${msg}</span>`;
    }
}

function setupAudioContext() {
    if (!audioEl) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        if (!audioSourceNode && audioCtx) {
            audioSourceNode = audioCtx.createMediaElementSource(audioEl);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.82;
            audioSourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
        }
    } catch (e) {
        console.warn("[DDT Music] AudioContext analyser note:", e);
    }
}

function startVisualizer() {
    setupAudioContext();
    const canvas = document.getElementById("ddt-edm-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (animFrameId) cancelAnimationFrame(animFrameId);

    const barCount = 38; // Clean Spotify Soundwave bar count
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const freqData = new Uint8Array(bufferLength);
    const smoothLevels = new Float32Array(barCount).fill(0.1);

    function render() {
        const cvs = document.getElementById("ddt-edm-canvas") as HTMLCanvasElement | null;
        if (!cvs) return;
        const c = cvs.getContext("2d");
        if (!c) return;

        if (!isPlaying || !audioEl) {
            c.clearRect(0, 0, cvs.width, cvs.height);
            // Flat minimal resting line
            const midY = cvs.height / 2;
            c.fillStyle = "rgba(255, 255, 255, 0.2)";
            for (let i = 0; i < barCount; i++) {
                const totalW = cvs.width * 0.85;
                const startX = (cvs.width - totalW) / 2;
                const bw = totalW / barCount;
                const barW = Math.max(3, bw - 3);
                const x = startX + i * bw;
                c.beginPath();
                c.roundRect(x, midY - 2, barW, 4, 2);
                c.fill();
            }
            return;
        }

        animFrameId = requestAnimationFrame(render);

        let hasRealAudio = false;
        if (analyser) {
            analyser.getByteFrequencyData(freqData);
            for (let k = 0; k < freqData.length; k++) {
                if (freqData[k] > 0) { hasRealAudio = true; break; }
            }
        }

        c.clearRect(0, 0, cvs.width, cvs.height);

        const curTime = audioEl.currentTime || 0;
        const totalW = cvs.width * 0.88;
        const startX = (cvs.width - totalW) / 2;
        const bw = totalW / barCount;
        const barW = Math.max(3, bw - 3.5);
        const midY = cvs.height / 2;
        const maxH = cvs.height * 0.8;

        for (let i = 0; i < barCount; i++) {
            let target = 0.08;
            if (hasRealAudio) {
                // Mirror from center (Spotify code signature wave pattern)
                const distFromMid = Math.abs(i - barCount / 2) / (barCount / 2);
                const sampleIdx = Math.min(freqData.length - 1, Math.floor(Math.pow(1 - distFromMid * 0.7, 1.3) * (freqData.length * 0.65)));
                const val = (freqData[sampleIdx] || 0) / 255;
                target = Math.min(1.0, val * 1.55 + 0.06);
            } else {
                // Smooth continuous organic flowing movement
                const wave1 = Math.sin(curTime * 5 + i * 0.28);
                const wave2 = Math.cos(curTime * 3 - i * 0.4);
                target = Math.min(1.0, Math.abs(wave1 * 0.6 + wave2 * 0.4) * 0.95 + 0.08);
            }

            // Butter-smooth interpolation (responsive yet jitter-free)
            smoothLevels[i] += (target - smoothLevels[i]) * 0.28;
            const h = Math.max(5, smoothLevels[i] * maxH);
            const x = startX + i * bw;
            const y = midY - h / 2;

            c.save();
            // Premium clean crisp white / silver Spotify bar aesthetic
            c.fillStyle = "#ffffff";
            c.shadowColor = "rgba(255, 255, 255, 0.45)";
            c.shadowBlur = smoothLevels[i] > 0.6 ? 8 : 2;
            c.beginPath();
            c.roundRect(x, y, barW, h, barW / 2);
            c.fill();
            c.restore();
        }
    }

    render();
}

function stopVisualizer() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    const canvas = document.getElementById("ddt-edm-canvas") as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(88, 101, 242, 0.2)";
            ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
        }
    }
}
// ─── Floating On-Screen Lyrics Overlay (Ultra-Premium Frosted Glass HUD) ───
function createFloatingLyricsOverlay() {
    if (floatingLyricsEl) {
        floatingLyricsEl.style.display = "flex";
        isFloatingLyricsOpen = true;
        return;
    }

    floatingLyricsEl = el("div", `
        position: fixed;
        left: ${floatPos.x}px;
        top: ${floatPos.y}px;
        width: 580px;
        background: linear-gradient(135deg, rgba(10, 11, 14, 0.88) 0%, rgba(14, 15, 20, 0.94) 100%);
        backdrop-filter: blur(28px) saturate(190%);
        -webkit-backdrop-filter: blur(28px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.10);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.95), 0 0 45px rgba(0, 0, 0, 0.90), inset 0 1px 0 rgba(255, 255, 255, 0.10);
        border-radius: 18px;
        z-index: 1000000;
        display: flex;
        flex-direction: column;
        user-select: none;
        overflow: hidden;
        transition: box-shadow 0.3s ease, border-color 0.3s ease;
    `);
    floatingLyricsEl.id = "ddt-floating-lyrics";

    // Add rotating vinyl keyframe if not present
    if (!document.getElementById("ddt-vinyl-anim")) {
        const s = document.createElement("style");
        s.id = "ddt-vinyl-anim";
        s.textContent = `
            @keyframes ddt-spin-vinyl {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .ddt-spinning-disk {
                animation: ddt-spin-vinyl 3.5s linear infinite;
            }
            .ddt-paused-disk {
                animation-play-state: paused !important;
            }
        `;
        document.head.appendChild(s);
    }

    const topBar = el("div", `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 16px;
        background: rgba(255, 255, 255, 0.03);
        cursor: move;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    `);
    topBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
            <span style="color:#ffffff;display:flex;filter:drop-shadow(0 0 6px rgba(0,0,0,0.9))">${Icons.music}</span>
            <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:${T.font}">DDT Live Sync • HUD</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
            <!-- 📻 Rotating Vinyl Record Disk -->
            <div id="ddt-hud-vinyl" class="ddt-spinning-disk ${isPlaying ? "" : "ddt-paused-disk"}" title="Now Playing" style="
                width: 26px; height: 26px;
                border-radius: 50%;
                background: radial-gradient(circle at center, #111 0%, #111 25%, #222 28%, #111 32%, #222 55%, #111 60%, #333 75%, #050505 100%);
                border: 1.5px solid rgba(255, 255, 255, 0.22);
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.95), inset 0 0 4px rgba(0, 0, 0, 0.9);
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            ">
                <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 4px rgba(0,0,0,0.9);"></div>
            </div>
            <button id="ddt-float-close" title="Close Overlay" style="
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.08);
                color: #949ba4;
                width: 26px; height: 26px;
                border-radius: 8px;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.2s;
            ">${Icons.close}</button>
        </div>
    `;

    const lyricsContainer = el("div", `
        padding: 20px 28px 24px 28px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 100px;
        position: relative;
        overflow: hidden;
    `);
    lyricsContainer.id = "ddt-float-lyrics-content";

    // 🌊 Multi-layered Luminous Sine-Wave Canvas (Embedded directly behind text)
    const hudWaveCanvas = el("canvas", `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.85;
    `);
    hudWaveCanvas.id = "ddt-hud-wave-canvas";
    (hudWaveCanvas as HTMLCanvasElement).width = 580;
    (hudWaveCanvas as HTMLCanvasElement).height = 130;

    lyricsContainer.innerHTML = `
        <div id="ddt-float-line-curr" style="
            color: #ffffff;
            font-size: 22px;
            font-weight: 800;
            line-height: 1.35;
            letter-spacing: -0.3px;
            font-family: ${T.font};
            text-shadow: 0 0 14px rgba(0, 0, 0, 0.98), 0 0 26px rgba(0, 0, 0, 0.95), 0 2px 5px rgba(0, 0, 0, 1), 0 4px 16px rgba(0, 0, 0, 0.95);
            transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            transform: scale(1);
            position: relative;
            z-index: 2;
        ">Ready to vibe ⚡</div>
        <div id="ddt-float-line-next" style="
            color: rgba(255, 255, 255, 0.52);
            font-size: 14px;
            font-weight: 500;
            font-family: ${T.font};
            margin-top: 6px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 1);
            transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            letter-spacing: -0.1px;
            position: relative;
            z-index: 2;
        ">Select a track to stream live lyrics</div>
    `;

    lyricsContainer.prepend(hudWaveCanvas);
    floatingLyricsEl.appendChild(topBar);
    floatingLyricsEl.appendChild(lyricsContainer);
    document.body.appendChild(floatingLyricsEl);
    isFloatingLyricsOpen = true;

    startHudVisualizer();

    const closeB = topBar.querySelector("#ddt-float-close") as HTMLButtonElement;
    closeB.onmouseenter = () => { closeB.style.background = "rgba(218, 55, 60, 0.3)"; closeB.style.color = "#fff"; };
    closeB.onmouseleave = () => { closeB.style.background = "rgba(255,255,255,0.06)"; closeB.style.color = "#949ba4"; };
    closeB.onclick = () => hideFloatingLyrics();

    // Dragging
    topBar.onmousedown = (e: MouseEvent) => {
        if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).closest("button")) return;
        floatDragData.active = true;
        floatDragData.ox = e.clientX - floatingLyricsEl!.offsetLeft;
        floatDragData.oy = e.clientY - floatingLyricsEl!.offsetTop;
        e.preventDefault();
    };

    document.addEventListener("mousemove", onFloatDrag);
    document.addEventListener("mouseup", () => { floatDragData.active = false; });
}

// ─── Continuous Futuristic EDM Neon Wave Engine for HUD Overlay ──────────────
function startHudVisualizer() {
    if (hudAnimFrameId) cancelAnimationFrame(hudAnimFrameId);
    setupAudioContext();

    const bufferLen = analyser ? analyser.frequencyBinCount : 64;
    const hudFreq = new Uint8Array(bufferLen);
    const hudBarCount = 44;
    const hudSmooth = new Float32Array(hudBarCount).fill(0.08);

    function renderHudWave() {
        const cvs = document.getElementById("ddt-hud-wave-canvas") as HTMLCanvasElement | null;
        if (!cvs || !isFloatingLyricsOpen) return;
        const ctx = cvs.getContext("2d");
        if (!ctx) return;

        hudAnimFrameId = requestAnimationFrame(renderHudWave);
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        const curTime = audioEl?.currentTime || 0;
        let hasAudio = false;

        if (analyser && isPlaying) {
            analyser.getByteFrequencyData(hudFreq);
            for (let i = 0; i < 20; i++) {
                if (hudFreq[i] > 0) { hasAudio = true; break; }
            }
        }

        const totalW = cvs.width * 0.92;
        const startX = (cvs.width - totalW) / 2;
        const bw = totalW / hudBarCount;
        const barW = Math.max(2.5, bw - 3);
        const midY = cvs.height / 2;
        const maxH = cvs.height * 0.75;

        // Clean Spotify minimalist waveform bars centered behind lyrics
        for (let i = 0; i < hudBarCount; i++) {
            let target = 0.08;
            if (hasAudio) {
                const distFromMid = Math.abs(i - hudBarCount / 2) / (hudBarCount / 2);
                const sampleIdx = Math.min(bufferLen - 1, Math.floor(Math.pow(1 - distFromMid * 0.65, 1.2) * (bufferLen * 0.6)));
                const val = (hudFreq[sampleIdx] || 0) / 255;
                target = Math.min(1.0, val * 1.4 + 0.06);
            } else if (isPlaying) {
                // Gentle continuous wave
                const s = Math.sin(curTime * 4 + i * 0.25);
                target = Math.min(1.0, Math.abs(s) * 0.65 + 0.08);
            }

            hudSmooth[i] += (target - hudSmooth[i]) * 0.22;
            const bh = Math.max(4, hudSmooth[i] * maxH);
            const x = startX + i * bw;
            const y = midY - bh / 2;

            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.18)"; // Clean, non-distracting Spotify bar glow behind lyrics
            ctx.beginPath();
            ctx.roundRect(x, y, barW, bh, barW / 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderHudWave();
}

function drawSineStream(
    ctx: CanvasRenderingContext2D,
    width: number,
    baseY: number,
    offset: number,
    amp: number,
    freq: number,
    color1: string,
    color2: string,
    lineWidth: number,
    blackAura = false,
    fillFloor = false
) {
    ctx.save();
    ctx.beginPath();

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "rgba(255, 120, 0, 0)");
    grad.addColorStop(0.2, color1);
    grad.addColorStop(0.5, color2);
    grad.addColorStop(0.8, color1);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    if (blackAura) {
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 18;
    }

    for (let x = 0; x <= width; x += 3) {
        // Compound wave synthesis (sine + harmonic cosine + sub-ripple)
        const y = baseY + 
            Math.sin(x * freq + offset) * amp + 
            Math.cos(x * freq * 0.45 - offset) * (amp * 0.5) +
            Math.sin(x * freq * 2.2 + offset * 1.5) * (amp * 0.15);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();

    if (fillFloor) {
        ctx.lineTo(width, baseY + 60);
        ctx.lineTo(0, baseY + 60);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, baseY, 0, baseY + 60);
        fillGrad.addColorStop(0, "rgba(255, 140, 0, 0.12)");
        fillGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = fillGrad;
        ctx.fill();
    }

    ctx.restore();
}

function onFloatDrag(e: MouseEvent) {
    if (!floatDragData.active || !floatingLyricsEl) return;
    const x = Math.max(10, Math.min(window.innerWidth - floatingLyricsEl.offsetWidth - 10, e.clientX - floatDragData.ox));
    const y = Math.max(10, Math.min(window.innerHeight - floatingLyricsEl.offsetHeight - 10, e.clientY - floatDragData.oy));
    floatingLyricsEl.style.left = `${x}px`;
    floatingLyricsEl.style.top = `${y}px`;
    floatPos = { x, y };
}

function hideFloatingLyrics() {
    if (floatingLyricsEl) floatingLyricsEl.style.display = "none";
    isFloatingLyricsOpen = false;
    if (hudAnimFrameId) {
        cancelAnimationFrame(hudAnimFrameId);
        hudAnimFrameId = null;
    }
}

function updateFloatingLyricsText(curr: string, next: string) {
    const currEl = document.getElementById("ddt-float-line-curr");
    const nextEl = document.getElementById("ddt-float-line-next");
    if (currEl && currEl.textContent !== curr) {
        currEl.style.opacity = "0.75";
        currEl.style.transform = "scale(1.05) translateY(-1px)";
        currEl.textContent = curr;
        setTimeout(() => {
            if (currEl) {
                currEl.style.opacity = "1";
                currEl.style.transform = "scale(1) translateY(0)";
            }
        }, 120);
    }
    if (nextEl) nextEl.textContent = next;
}

function startLyricSync() {
    if (lyricTimer) clearInterval(lyricTimer);
    lyricTimer = setInterval(() => {
        if (!audioEl || !isPlaying) return;
        const t = audioEl.currentTime;
        let active = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time <= t) active = i;
        }

        // 1. Update Floating Overlay
        if (isFloatingLyricsOpen && floatingLyricsEl && floatingLyricsEl.style.display !== "none") {
            const currentLine = active >= 0 && lyrics[active] ? lyrics[active].text : "🎵 ...";
            const nextLine = (active + 1 < lyrics.length && lyrics[active + 1]) ? lyrics[active + 1].text : "";
            updateFloatingLyricsText(currentLine, nextLine);
        }

        // 2. Update In-Player Lyrics tab
        if (activeTab === "lyrics") {
            document.querySelectorAll(".ddt-lyric-line").forEach((el, i) => {
                const e = el as HTMLElement;
                if (i === active) {
                    e.style.color = T.text;
                    e.style.fontWeight = "600";
                    e.style.fontSize = "15px";
                    e.style.opacity = "1";
                    e.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    e.style.color = T.muted;
                    e.style.fontWeight = "400";
                    e.style.fontSize = "14px";
                    e.style.opacity = i < active ? "0.4" : "0.7";
                }
            });
        }
    }, 150) as unknown as number; // 150ms high precision sync
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(tab: "search" | "lyrics" | "queue") {
    activeTab = tab;
    ["search", "lyrics", "queue"].forEach(t => {
        const tabBtn = document.getElementById(`ddt-tab-${t}`);
        const tabPane = document.getElementById(`ddt-pane-${t}`);
        if (tabBtn) {
            tabBtn.style.color = t === tab ? T.text : T.muted;
            tabBtn.style.borderBottom = t === tab ? `2px solid ${T.accent}` : "2px solid transparent";
        }
        if (tabPane) tabPane.style.display = t === tab ? "flex" : "none";
    });
    if (tab === "lyrics") renderLyricsTab();
    if (tab === "queue") renderQueueTab();
}

function renderLyricsTab() {
    const pane = document.getElementById("ddt-pane-lyrics");
    if (!pane) return;
    if (lyrics.length === 0) {
        pane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px">No lyrics found for this track</div>`;
        return;
    }
    pane.innerHTML = lyrics.map((l, i) => `
        <div class="ddt-lyric-line" style="
            padding: 10px 20px;
            cursor: pointer;
            color: ${T.muted};
            font-size: 14px;
            font-weight: 400;
            line-height: 1.6;
            transition: all 0.2s;
            border-radius: 4px;
        " data-t="${l.time}">${l.text}</div>
    `).join("");

    pane.querySelectorAll(".ddt-lyric-line").forEach(el => {
        const e = el as HTMLElement;
        e.onmouseenter = () => e.style.background = T.elevated;
        e.onmouseleave = () => e.style.background = "transparent";
        e.onclick = () => {
            if (audioEl) audioEl.currentTime = parseFloat(e.dataset.t || "0");
        };
    });

    if (audioEl && isPlaying) startLyricSync();
}

function renderQueueTab() {
    const pane = document.getElementById("ddt-pane-queue");
    if (!pane) return;
    if (queue.length === 0) {
        pane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px">Queue is empty — add songs from search</div>`;
        return;
    }
    pane.innerHTML = queue.map((s, i) => `
        <div class="ddt-queue-item" data-i="${i}" style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            background: ${i === queueIdx ? T.elevated : "transparent"};
            transition: background 0.15s;
        ">
            <img src="${s.thumb}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0" />
            <div style="flex:1;min-width:0">
                <div style="color:${i === queueIdx ? T.accent : T.text};font-size:13px;font-weight:${i === queueIdx ? "600" : "400"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</div>
            </div>
            <button class="ddt-remove-queue" data-i="${i}" style="background:transparent;border:none;color:${T.muted};cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;transition:color 0.15s">${Icons.close}</button>
        </div>
    `).join("");

    pane.querySelectorAll(".ddt-queue-item").forEach(item => {
        const e = item as HTMLElement;
        e.onmouseenter = () => { if (parseInt(e.dataset.i || "0") !== queueIdx) e.style.background = T.surface; };
        e.onmouseleave = () => { if (parseInt(e.dataset.i || "0") !== queueIdx) e.style.background = "transparent"; };
        e.onclick = (ev) => {
            if ((ev.target as HTMLElement).closest(".ddt-remove-queue")) return;
            const i = parseInt(e.dataset.i || "0");
            queueIdx = i;
            playSong(queue[i]);
        };
    });

    pane.querySelectorAll(".ddt-remove-queue").forEach(b => {
        const e = b as HTMLButtonElement;
        e.onclick = () => {
            const i = parseInt(e.dataset.i || "0");
            queue.splice(i, 1);
            if (queueIdx >= queue.length) queueIdx = Math.max(0, queue.length - 1);
            renderQueueTab();
        };
    });
}

// ─── Search Results ───────────────────────────────────────────────────────────
async function doSearch(query: string) {
    const pane = document.getElementById("ddt-pane-search");
    if (!pane) return;

    pane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};display:flex;align-items:center;gap:8px">
        <span style="animation:ddt-spin 0.8s linear infinite;display:inline-block;color:${T.accent}">${Icons.loader}</span>
        <span style="font-size:13px">Searching YouTube...</span>
    </div>`;

    switchTab("search");

    const results = await ytSearch(query);
    searchCache = results;

    if (results.length === 0) {
        pane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px">No results found</div>`;
        return;
    }

    pane.innerHTML = `<div id="ddt-results" style="width:100%;padding:8px"></div>`;
    const container = document.getElementById("ddt-results")!;

    results.forEach((song, i) => {
        const item = el("div", `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s;
            margin-bottom: 4px;
        `);
        item.innerHTML = `
            <img src="${song.thumb}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0" />
            <div style="flex:1;min-width:0">
                <div style="color:${T.text};font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${song.title}</div>
                <div style="color:${T.muted};font-size:11px">YouTube</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="ddt-add-queue" title="Add to queue" style="
                    background:${T.elevated};border:none;color:${T.muted};
                    width:30px;height:30px;border-radius:6px;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;
                    transition:all 0.15s;font-size:18px;font-weight:bold;
                ">+</button>
                <button class="ddt-play-now" title="Play now" style="
                    background:${T.accent};border:none;color:#fff;
                    width:30px;height:30px;border-radius:6px;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;
                    transition:all 0.15s;
                ">${Icons.play}</button>
            </div>
        `;

        item.onmouseenter = () => item.style.background = T.elevated;
        item.onmouseleave = () => item.style.background = "transparent";

        const addBtn = item.querySelector(".ddt-add-queue") as HTMLButtonElement;
        const playBtn = item.querySelector(".ddt-play-now") as HTMLButtonElement;

        addBtn.onmouseenter = () => { addBtn.style.background = T.accent; addBtn.style.color = "#fff"; };
        addBtn.onmouseleave = () => { addBtn.style.background = T.elevated; addBtn.style.color = T.muted; };
        addBtn.onclick = (e) => {
            e.stopPropagation();
            if (!queue.find(q => q.videoId === song.videoId)) {
                queue.push(song);
                addBtn.style.color = T.green;
                setTimeout(() => { addBtn.style.color = T.muted; }, 1000);
            }
        };

        playBtn.onmouseenter = () => playBtn.style.opacity = "0.85";
        playBtn.onmouseleave = () => playBtn.style.opacity = "1";
        playBtn.onclick = (e) => {
            e.stopPropagation();
            if (!queue.find(q => q.videoId === song.videoId)) queue.push(song);
            queueIdx = queue.findIndex(q => q.videoId === song.videoId);
            playSong(song);
        };

        container.appendChild(item);
    });
}

// ─── Build Overlay ────────────────────────────────────────────────────────────
function createOverlay() {
    if (overlayEl) { overlayEl.style.display = "flex"; return; }

    // Inject keyframes
    if (!document.getElementById("ddt-music-styles")) {
        const style = document.createElement("style");
        style.id = "ddt-music-styles";
        style.textContent = `
            @keyframes ddt-spin { to { transform: rotate(360deg); } }
            @keyframes ddt-pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(88,101,242,0.4)} 50%{box-shadow:0 0 0 8px rgba(88,101,242,0)} }
            #ddt-music-player * { box-sizing: border-box; font-family: ${T.font}; }
            #ddt-music-player ::-webkit-scrollbar { width: 4px; }
            #ddt-music-player ::-webkit-scrollbar-track { background: transparent; }
            #ddt-music-player ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
            #ddt-progress-track:hover #ddt-progress-fill { background: ${T.accent}; }
            #ddt-progress-track:hover #ddt-progress-thumb { opacity: 1; }
            .ddt-tab-btn { background: none; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 500; transition: color 0.15s, border-color 0.15s; }
            #ddt-splash-start-btn:hover { opacity: 0.85; transform: scale(1.02); }
        `;
        document.head.appendChild(style);
    }

    overlayEl = el("div", `
        position: fixed;
        left: ${position.x}px;
        top: ${position.y}px;
        width: 440px;
        background: linear-gradient(180deg, rgba(14, 15, 20, 0.94) 0%, rgba(10, 11, 14, 0.98) 100%);
        backdrop-filter: blur(32px) saturate(190%);
        -webkit-backdrop-filter: blur(32px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(88, 101, 242, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        resize: both;
        min-width: 360px;
        min-height: 480px;
        max-height: 88vh;
    `);
    overlayEl.id = "ddt-music-player";

    // ── Server Offline Splash Screen ───────────────────────────────────────────
    const serverSplash = el("div", `
        display: ${serverReady ? "none" : "flex"};
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        flex: 1;
        padding: 32px 24px;
        text-align: center;
    `);
    serverSplash.id = "ddt-server-splash";
    serverSplash.innerHTML = `
        <div style="
            width: 64px; height: 64px; border-radius: 50%;
            background: rgba(218, 55, 60, 0.12);
            border: 1.5px solid rgba(218, 55, 60, 0.35);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto;
            animation: ddt-pulse-glow 2s ease-in-out infinite;
        ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#da373c"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <div>
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:6px">Relay Server Offline</div>
            <div id="ddt-splash-status" style="color:${T.muted};font-size:12px;line-height:1.6">The local music relay server is not running.<br>Click below to start it automatically.</div>
        </div>
        <button id="ddt-splash-start-btn" style="
            background: ${T.accent};
            border: none;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            padding: 10px 24px;
            border-radius: 8px;
            cursor: pointer;
            transition: opacity 0.15s, transform 0.15s;
            letter-spacing: 0.2px;
        ">Start Relay Server</button>
    `;
    serverSplash.querySelector("#ddt-splash-start-btn")?.addEventListener("click", handleStartServer);

    // ── Header ────────────────────────────────────────────────────────────────
    const header = el("div", `
        background: ${T.surface};
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: move;
        user-select: none;
        border-bottom: 1px solid ${T.border};
        flex-shrink: 0;
    `);
    const headerIcon  = el("span", `color:${T.accent};display:flex;align-items:center`, Icons.music);
    const headerTitle = el("span", `color:${T.text};font-size:13px;font-weight:600;flex:1`, "Music Player");

    // Server status indicator (dot + label)
    const serverStatusWrap = el("div", `display:flex;align-items:center;gap:5px;padding:2px 8px;background:rgba(0,0,0,0.25);border-radius:20px;border:1px solid ${T.border};`);
    const serverDot = el("span", `
        width: 7px; height: 7px; border-radius: 50%;
        background: ${serverReady ? "#23a559" : "#da373c"};
        display: inline-block;
        flex-shrink: 0;
        transition: background 0.3s;
    `);
    serverDot.id = "ddt-server-dot";
    serverDot.title = serverReady ? "Relay server: Online" : "Relay server: Offline";
    const serverLabel = el("span", `font-size:10px;font-weight:600;letter-spacing:0.4px;color:${serverReady ? "#23a559" : "#da373c"};transition:color 0.3s;`);
    serverLabel.id = "ddt-server-label";
    serverLabel.textContent = serverReady ? "Online" : "Offline";
    serverStatusWrap.appendChild(serverDot);
    serverStatusWrap.appendChild(serverLabel);

    // Stop Server button — visible only when server is online
    const stopServerBtn = el("button", `
        background: rgba(218,55,60,0.15);
        border: 1px solid rgba(218,55,60,0.35);
        border-radius: 6px;
        color: #da373c;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        cursor: pointer;
        display: ${serverReady ? "block" : "none"};
        transition: background 0.15s, opacity 0.15s;
        letter-spacing: 0.3px;
    `);
    stopServerBtn.id = "ddt-stop-server-btn";
    stopServerBtn.textContent = "Stop Server";
    stopServerBtn.title = "Stop relay server";
    stopServerBtn.onmouseenter = () => (stopServerBtn.style.background = "rgba(218,55,60,0.35)");
    stopServerBtn.onmouseleave = () => (stopServerBtn.style.background = "rgba(218,55,60,0.15)");
    stopServerBtn.onclick = async () => {
        stopServerBtn.textContent = "Stopping…";
        stopServerBtn.style.opacity = "0.5";
        stopServerBtn.style.pointerEvents = "none";
        await Native?.stopServer?.();
        // Give process time to die, then update UI
        setTimeout(() => {
            updateServerStatusDot(false);
            stopServerBtn.textContent = "Stop Server";
            stopServerBtn.style.opacity = "1";
            stopServerBtn.style.pointerEvents = "auto";
            stopServerBtn.style.display = "none";
        }, 800);
    };

    // Minimize button — collapses entire player to header-only strip
    let isMinimized = false;
    const minBtn = btn("", "Minimize", `color:${T.muted}`, () => {
        isMinimized = !isMinimized;
        const body = document.getElementById("ddt-player-body");
        if (!overlayEl) return;
        if (isMinimized) {
            // Collapse: hide body, lock container to header height only
            if (body) body.style.display = "none";
            overlayEl.style.minHeight = "unset";
            overlayEl.style.maxHeight = "unset";
            overlayEl.style.height = "auto";
            overlayEl.style.resize = "none";
        } else {
            // Expand: restore body and sizes
            if (body) body.style.display = "flex";
            overlayEl.style.minHeight = "400px";
            overlayEl.style.maxHeight = "80vh";
            overlayEl.style.height = "";
            overlayEl.style.resize = "both";
        }
        minBtn.title = isMinimized ? "Maximize" : "Minimize";
        minBtn.innerHTML = isMinimized
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5H7z"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11h14v2H5z"/></svg>`;
    });
    // Set initial minimize icon (dash)
    minBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11h14v2H5z"/></svg>`;

    const closeBtn  = btn(Icons.close, "Close", `color:${T.muted}`, () => hideOverlay());

    // ⚡ On-Screen Live Lyrics Toggle Button (Auto-minimizes player & shows floating lyrics)
    const pipBtn = btn(Icons.pip, "Show On-Screen Floating Lyrics Overlay (Auto-minimize)", `color:${T.accent}`, () => {
        if (!floatingLyricsEl || floatingLyricsEl.style.display === "none") {
            createFloatingLyricsOverlay();
            // Automatically minimize the main player so user can enjoy full screen
            if (!isMinimized) minBtn.click();
        } else {
            hideFloatingLyrics();
        }
    });

    header.appendChild(headerIcon);
    header.appendChild(headerTitle);
    header.appendChild(serverStatusWrap);
    header.appendChild(stopServerBtn);
    header.appendChild(pipBtn);
    header.appendChild(minBtn);
    header.appendChild(closeBtn);


    // ── Search bar ────────────────────────────────────────────────────────────
    const searchWrap = el("div", `
        padding: 10px 12px;
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
        flex-shrink: 0;
        display: flex;
        gap: 8px;
        align-items: center;
    `);
    const searchInput = el("input", `
        flex: 1;
        background: ${T.elevated};
        border: 1px solid ${T.border};
        border-radius: 6px;
        color: ${T.text};
        font-size: 13px;
        padding: 8px 12px;
        outline: none;
        transition: border-color 0.15s;
    `);
    (searchInput as HTMLInputElement).placeholder = "Search music...";
    (searchInput as HTMLInputElement).id = "ddt-search-input";
    searchInput.onfocus = () => (searchInput as HTMLElement).style.borderColor = T.accent;
    searchInput.onblur = () => (searchInput as HTMLElement).style.borderColor = T.border;
    (searchInput as HTMLInputElement).onkeydown = (e) => {
        if (e.key === "Enter") {
            const q = (searchInput as HTMLInputElement).value.trim();
            if (q) doSearch(q);
        }
    };

    const searchBtn = el("button", `
        background: ${T.accent};
        border: none;
        border-radius: 6px;
        color: #fff;
        width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: opacity 0.15s;
    `);
    searchBtn.innerHTML = Icons.search;
    searchBtn.title = "Search";
    searchBtn.onmouseenter = () => (searchBtn as HTMLElement).style.opacity = "0.85";
    searchBtn.onmouseleave = () => (searchBtn as HTMLElement).style.opacity = "1";
    searchBtn.onclick = () => {
        const q = (searchInput as HTMLInputElement).value.trim();
        if (q) doSearch(q);
    };

    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchBtn);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const tabBar = el("div", `
        display: flex;
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
        flex-shrink: 0;
    `);

    (["search", "lyrics", "queue"] as const).forEach(t => {
        const tb = el("button", `
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            transition: color 0.15s, border-color 0.15s;
            color: ${t === "search" ? T.text : T.muted};
            border-bottom: ${t === "search" ? `2px solid ${T.accent}` : "2px solid transparent"};
        `);
        tb.textContent = t === "search" ? "Search" : t === "lyrics" ? "Lyrics" : "Queue";
        tb.id = `ddt-tab-${t}`;
        tb.onclick = () => switchTab(t);
        tabBar.appendChild(tb);
    });

    // ── Content area (tabs) ───────────────────────────────────────────────────
    const content = el("div", `
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
    `);

    const paneStyle = `
        position: absolute;
        inset: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 0;
    `;

    const searchPane = el("div", paneStyle);
    searchPane.id = "ddt-pane-search";
    searchPane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px;padding:20px">Search for music above</div>`;

    const lyricsPane = el("div", paneStyle.replace("display: flex;", "display: none;"));
    lyricsPane.id = "ddt-pane-lyrics";
    lyricsPane.style.display = "none";
    lyricsPane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px;padding:20px">Play a song to see lyrics</div>`;

    const queuePane = el("div", paneStyle.replace("display: flex;", "display: none;"));
    queuePane.id = "ddt-pane-queue";
    queuePane.style.display = "none";
    queuePane.innerHTML = `<div style="text-align:center;margin:auto;color:${T.muted};font-size:13px;padding:20px">Queue is empty</div>`;

    content.appendChild(searchPane);
    content.appendChild(lyricsPane);
    content.appendChild(queuePane);

    // ── Status bar ────────────────────────────────────────────────────────────
    const status = el("div", `
        display: none;
        align-items: center;
        justify-content: center;
        padding: 8px 12px;
        background: ${T.surface};
        border-top: 1px solid ${T.border};
        min-height: 36px;
        flex-shrink: 0;
    `);
    status.id = "ddt-status";

    // ── Now Playing strip ─────────────────────────────────────────────────────
    const nowPlaying = el("div", `
        background: ${T.surface};
        border-top: 1px solid ${T.border};
        padding: 12px;
        flex-shrink: 0;
    `);

    // Song info row
    const infoRow = el("div", `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    `);
    // Thumb wrapper — shows album art when playing, animated note when idle
    const thumbWrap = el("div", `width:44px;height:44px;border-radius:6px;flex-shrink:0;position:relative;overflow:hidden;background:${T.elevated};`);
    thumbWrap.id = "ddt-np-thumb-wrap";

    const thumb = el("img", `width:44px;height:44px;border-radius:6px;object-fit:cover;position:absolute;inset:0;display:none;`);
    thumb.id = "ddt-np-thumb";
    (thumb as HTMLImageElement).src = "";
    (thumb as HTMLImageElement).alt = "";
    (thumb as HTMLImageElement).onload = () => {
        // Show image only if it actually loaded something
        if ((thumb as HTMLImageElement).naturalWidth > 0) {
            thumb.style.display = "block";
            noMusicIcon.style.display = "none";
        }
    };

    // Animated music-note placeholder shown when no song is playing
    if (!document.getElementById("ddt-idle-anim")) {
        const s = document.createElement("style");
        s.id = "ddt-idle-anim";
        s.textContent = `@keyframes ddt-note-pulse{0%,100%{opacity:.5;transform:scale(0.85) rotate(-8deg)}50%{opacity:1;transform:scale(1.05) rotate(8deg)}}`;
        document.head.appendChild(s);
    }
    const noMusicIcon = el("div", `width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:${T.muted};animation:ddt-note-pulse 2s ease-in-out infinite;`);
    noMusicIcon.id = "ddt-no-music-icon";
    noMusicIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;

    thumbWrap.appendChild(noMusicIcon);
    thumbWrap.appendChild(thumb);

    const trackInfo = el("div", `flex:1;min-width:0`);
    trackInfo.innerHTML = `
        <div id="ddt-np-title" style="color:${T.text};font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Not playing</div>
        <div style="color:${T.muted};font-size:11px;margin-top:2px">DDT Music</div>
    `;

    infoRow.appendChild(thumbWrap);
    infoRow.appendChild(trackInfo);

    // Progress bar
    const progressTrack = el("div", `
        width: 100%;
        height: 4px;
        background: ${T.elevated};
        border-radius: 2px;
        cursor: pointer;
        position: relative;
        margin-bottom: 6px;
    `);
    progressTrack.id = "ddt-progress-track";

    const progressFill = el("div", `
        height: 100%;
        width: 0%;
        background: ${T.muted};
        border-radius: 2px;
        transition: background 0.1s;
        position: relative;
    `);
    progressFill.id = "ddt-progress-fill";

    const progressThumb = el("div", `
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${T.text};
        opacity: 0;
        transition: opacity 0.15s;
    `);
    progressThumb.id = "ddt-progress-thumb";
    progressFill.appendChild(progressThumb);

    progressTrack.onmouseenter = () => {
        progressFill.style.background = T.accent;
        progressThumb.style.opacity = "1";
    };
    progressTrack.onmouseleave = () => {
        progressFill.style.background = T.muted;
        progressThumb.style.opacity = "0";
    };
    progressTrack.onclick = (e) => {
        if (!audioEl || !audioEl.duration) return;
        const rect = progressTrack.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioEl.currentTime = pct * audioEl.duration;
    };
    progressTrack.appendChild(progressFill);

    // Time row
    const timeRow = el("div", `
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    `);
    timeRow.innerHTML = `
        <span id="ddt-time-cur" style="color:${T.muted};font-size:11px">0:00</span>
        <span id="ddt-time-total" style="color:${T.muted};font-size:11px">0:00</span>
    `;

    // Controls row
    const controlsRow = el("div", `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
    `);

    // Play/Pause (big)
    const playBtn = el("button", `
        background: ${T.accent};
        border: none;
        color: #fff;
        width: 36px; height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: opacity 0.15s, transform 0.1s;
        flex-shrink: 0;
    `);
    playBtn.innerHTML = Icons.play;
    playBtn.id = "ddt-play-btn";
    playBtn.title = "Play / Pause";
    playBtn.onmouseenter = () => { (playBtn as HTMLElement).style.opacity = "0.85"; (playBtn as HTMLElement).style.transform = "scale(1.05)"; };
    playBtn.onmouseleave = () => { (playBtn as HTMLElement).style.opacity = "1"; (playBtn as HTMLElement).style.transform = "scale(1)"; };
    playBtn.onclick = togglePlay;

    // Next btn
    const nextBtn = btn(`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`, "Next", "", playNext);

    // Volume area
    const volArea = el("div", `
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        justify-content: flex-end;
    `);

    const volBtn = btn(Icons.volume, "Mute/Unmute", "", () => {
        isMuted = !isMuted;
        if (audioEl) audioEl.volume = isMuted ? 0 : vol;
        volBtn.innerHTML = isMuted ? Icons.mute : Icons.volume;
    });
    volBtn.id = "ddt-vol-btn";

    const volSlider = el("input", `
        -webkit-appearance: none;
        appearance: none;
        width: 70px;
        height: 4px;
        border-radius: 2px;
        background: ${T.border};
        cursor: pointer;
        outline: none;
    `);
    (volSlider as HTMLInputElement).type = "range";
    (volSlider as HTMLInputElement).min = "0";
    (volSlider as HTMLInputElement).max = "1";
    (volSlider as HTMLInputElement).step = "0.01";
    (volSlider as HTMLInputElement).value = String(vol);
    (volSlider as HTMLInputElement).oninput = () => {
        vol = parseFloat((volSlider as HTMLInputElement).value);
        isMuted = vol === 0;
        if (audioEl) audioEl.volume = vol;
        volBtn.innerHTML = isMuted ? Icons.mute : Icons.volume;
    };

    // Add slider thumb style
    const sliderStyle = document.createElement("style");
    sliderStyle.textContent = `
        #ddt-music-player input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px; height: 12px;
            border-radius: 50%;
            background: ${T.text};
            cursor: pointer;
        }
        #ddt-music-player input[type=range]::-webkit-slider-runnable-track {
            background: ${T.border};
            border-radius: 2px;
        }
    `;
    document.head.appendChild(sliderStyle);

    volArea.appendChild(volBtn);
    volArea.appendChild(volSlider);

    // Spotify Minimalist Audio Waveform Canvas
    const edmCanvas = el("canvas", `
        width: 100%;
        height: 60px;
        display: block;
        margin: 6px auto 10px auto;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
    `);
    edmCanvas.id = "ddt-edm-canvas";
    (edmCanvas as HTMLCanvasElement).width = 410;
    (edmCanvas as HTMLCanvasElement).height = 60;

    controlsRow.appendChild(playBtn);
    controlsRow.appendChild(nextBtn);
    controlsRow.appendChild(volArea);

    nowPlaying.appendChild(infoRow);
    nowPlaying.appendChild(progressTrack);
    nowPlaying.appendChild(timeRow);
    nowPlaying.appendChild(edmCanvas);
    nowPlaying.appendChild(controlsRow);

    // ── Assemble ──────────────────────────────────────────────────────────────
    // Wrap all content below header in one collapsible body div
    const playerBody = el("div", `display:${serverReady ? "flex" : "none"};flex-direction:column;flex:1;overflow:hidden;min-height:0;`);
    playerBody.id = "ddt-player-body";
    playerBody.appendChild(searchWrap);
    playerBody.appendChild(tabBar);
    playerBody.appendChild(content);
    playerBody.appendChild(status);
    playerBody.appendChild(nowPlaying);

    overlayEl.appendChild(header);
    overlayEl.appendChild(serverSplash);
    overlayEl.appendChild(playerBody);

    document.body.appendChild(overlayEl);
    // Start polling server health after UI is mounted
    startServerPoll();


    // ── Drag ─────────────────────────────────────────────────────────────────
    header.onmousedown = (e: MouseEvent) => {
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        dragData.active = true;
        dragData.ox = e.clientX - overlayEl!.offsetLeft;
        dragData.oy = e.clientY - overlayEl!.offsetTop;
        e.preventDefault();
    };
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", () => { dragData.active = false; });
}

function onDrag(e: MouseEvent) {
    if (!dragData.active || !overlayEl) return;
    const x = Math.max(0, Math.min(window.innerWidth - overlayEl.offsetWidth, e.clientX - dragData.ox));
    const y = Math.max(0, Math.min(window.innerHeight - overlayEl.offsetHeight, e.clientY - dragData.oy));
    overlayEl.style.left = `${x}px`;
    overlayEl.style.top = `${y}px`;
    position = { x, y };
}

function hideOverlay() {
    if (overlayEl) overlayEl.style.display = "none";
}

function destroyOverlay() {
    if (lyricTimer) { clearInterval(lyricTimer); lyricTimer = null; }
    if (audioEl) { audioEl.pause(); audioEl.src = ""; audioEl = null; }
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    if (floatingLyricsEl) { floatingLyricsEl.remove(); floatingLyricsEl = null; isFloatingLyricsOpen = false; }
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mousemove", onFloatDrag);
    const styles = document.getElementById("ddt-music-styles");
    if (styles) styles.remove();
}

// ─── Server List Button ───────────────────────────────────────────────────────
const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Enable Music Player", default: true },
    showOverlayLyrics: { type: OptionType.BOOLEAN, description: "Show Dynamic On-Screen Floating Lyrics Overlay", default: true }
});

function MusicButton() {
    const [hovered, setHovered] = React.useState(false);
    return React.createElement("div", {
        id: "ddt-music-btn",
        onClick: () => {
            if (!overlayEl || overlayEl.style.display === "none") createOverlay();
            else hideOverlay();
        },
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        style: {
            cursor: "pointer",
            width: "48px",
            height: "48px",
            borderRadius: hovered ? "30%" : "50%",
            // Always visible — use solid bg so icon is never invisible
            background: hovered ? T.accent : T.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border-radius 0.15s, background 0.15s, color 0.15s",
            // Always visible color — not transparent
            color: hovered ? "#fff" : T.muted,
            margin: "0 auto 4px",
        },
        title: "DDT Music Player",
    }, React.createElement("span", {
        dangerouslySetInnerHTML: { __html: Icons.music },
        style: { display: "flex", alignItems: "center", justifyContent: "center" }
    }));
}

// ─── Global console API ───────────────────────────────────────────────────────
(window as any).DDTMusic = {
    show: createOverlay,
    hide: hideOverlay,
    search: (q: string) => { createOverlay(); setTimeout(() => { const i = document.getElementById("ddt-search-input") as HTMLInputElement; if (i) { i.value = q; doSearch(q); } }, 100); },
    play: (videoId: string, title = "Custom Track") => playSong({ title, videoId, thumb: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }),
    queue: () => queue,
    skip: playNext,
};

// ─── Plugin ───────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "MusicVisualizer",
    description: "YouTube music player with real audio (cobalt.tools) + synced lyrics",
    authors: [Devs.Ven],
    tags: ["Media", "Fun"],
    settings,

    start() {
        addServerListElement(ServerListRenderPosition.Above, MusicButton);

        // Do NOT auto-start relay server — user starts it manually via the UI button
        // Just check if it's already running (e.g. from a previous session)
        Promise.resolve()
            .then(() => checkServer())
            .then(ok => {
                serverReady = ok;
                if (ok) console.log("[DDT Music] Relay server already running on :3124");
                else console.log("[DDT Music] Relay server offline — user can start via UI");
            })
            .catch(() => {});

        console.log("[DDT Music] Started. Use window.DDTMusic to control.");
    },

    stop() {
        stopServerPoll();
        destroyOverlay();
        removeServerListElement(ServerListRenderPosition.Above, MusicButton);
        try {
            Native?.stopServer?.().catch(() => {});
        } catch {}
        delete (window as any).DDTMusic;
    }
});
