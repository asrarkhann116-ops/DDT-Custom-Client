/*
 * ddtWelcomer: a once-per-launch cinematic welcome for Discord.
 *
 * - Aero-glass HUD panel, avatar orb whose glow is tinted from the avatar itself
 * - Live waveform + spectrum driven by a synthesized startup chime (Web Audio),
 *   with a deterministic fallback when audio is blocked or muted
 * - Real spring physics (damped oscillator) for the intro and the dissolve,
 *   and the same spring baked into a CSS linear() easing for the typography
 * - Single requestAnimationFrame loop, so it runs at whatever your display does
 *
 * Install: put this folder in src/userplugins/ddtWelcomer, run `pnpm build`,
 * enable "ddtWelcomer" in Vencord settings.
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";

/* ------------------------------------------------------------------ */
/* constants                                                          */
/* ------------------------------------------------------------------ */

const STARTUP_WINDOW_MS = 45_000; // only auto-play if the page is this fresh
const FADE_IN_MS = 360;
const TAU = Math.PI * 2;
const DEFAULT_GLOW = "88, 101, 242";
const WORDMARK = "DDT REMASTERED";
const SCRAMBLE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+<>/";
const BARS = 64;

// Eb major shimmer: arpeggio bells climbing, then a resolving chord.
const ARP_NOTES = [466.16, 622.25, 783.99, 932.33, 1244.51, 1567.98, 1864.66];
const ARP_AT = 0.45;
const ARP_STEP = 0.17;
const RESOLVE_AT = 1.85;

/** Beats shared by the score and the visuals: [seconds, strength]. */
const HITS: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    ...ARP_NOTES.map((_, i) => [ARP_AT + i * ARP_STEP, 0.5 + i * 0.05] as const),
    [RESOLVE_AT, 1]
];

/* ------------------------------------------------------------------ */
/* settings                                                           */
/* ------------------------------------------------------------------ */

const settings = definePluginSettings({
    sound: {
        type: OptionType.BOOLEAN,
        description: "Play the synthesized startup chime (it also drives the waveform).",
        default: true
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Chime volume",
        markers: [0, 10, 20, 35, 50, 75, 100],
        default: 35,
        stickToMarkers: false
    },
    customAudioUrl: {
        type: OptionType.STRING,
        description: "Optional custom audio URL (MP3/WAV) to play on startup instead of the chime.",
        default: ""
    },
    holdMs: {
        type: OptionType.SLIDER,
        description: "How long the overlay stays before it dissolves (ms)",
        markers: [2000, 2500, 3000, 3500, 4000, 5000, 6000],
        default: 3500,
        stickToMarkers: true
    },
    quality: {
        type: OptionType.SELECT,
        description: "Visual quality",
        options: [
            { label: "Ultra (full glass blur, dense particles)", value: "ultra", default: true },
            { label: "Balanced", value: "balanced" },
            { label: "Lite (no backdrop blur, light particles)", value: "lite" }
        ]
    },
    respectReducedMotion: {
        type: OptionType.BOOLEAN,
        description: "Use a calm fade-only version when your OS asks for reduced motion.",
        default: true
    }
});

/* ------------------------------------------------------------------ */
/* small helpers                                                      */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Damped harmonic oscillator, integrated in fixed 1/240 s substeps. */
class Spring {
    constructor(
        public x: number,
        public target: number,
        public k = 170,
        public c = 18,
        public v = 0
    ) { }

    step(dt: number) {
        dt = Math.min(dt, 1 / 20);
        const n = Math.max(1, Math.ceil(dt * 240));
        const h = dt / n;
        for (let i = 0; i < n; i++) {
            const a = -this.k * (this.x - this.target) - this.c * this.v;
            this.v += a * h;
            this.x += this.v * h;
        }
        return this.x;
    }

    get settled() {
        return Math.abs(this.x - this.target) < 5e-4 && Math.abs(this.v) < 5e-3;
    }
}

/** Bakes the same spring into a CSS linear() easing so typography shares the physics. */
function springEasing(k: number, c: number): { css: string; ms: number } | null {
    try {
        if (!CSS.supports("animation-timing-function", "linear(0, 1)")) return null;
    } catch { return null; }

    const h = 1 / 240;
    let x = 0, v = 0, t = 0, calm = 0;
    const xs: number[] = [0];
    while (t < 3) {
        v += (-k * (x - 1) - c * v) * h;
        x += v * h;
        t += h;
        xs.push(x);
        if (Math.abs(x - 1) < 1e-3 && Math.abs(v) < 1e-2) { if (++calm > 6) break; } else calm = 0;
    }
    const n = 40;
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) pts.push(+xs[Math.round((i / n) * (xs.length - 1))].toFixed(4));
    pts[0] = 0;
    pts[n] = 1;
    return { css: `linear(${pts.join(", ")})`, ms: Math.round(t * 1000) };
}

function defaultAvatar(user: any): string {
    let idx = 0;
    try { idx = Number((BigInt(user?.id ?? 0) >> 22n) % 6n); } catch { /* keep 0 */ }
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function avatarOf(user: any): string {
    try {
        const url = user?.getAvatarURL?.(void 0, 256, false);
        if (url) return url;
    } catch { /* fall through */ }
    return defaultAvatar(user);
}

/** Vivid, saturation-weighted average colour of the avatar as "r, g, b". */
function sampleGlow(url: string): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const bail = setTimeout(() => resolve(DEFAULT_GLOW), 1500);
        img.onerror = () => { clearTimeout(bail); resolve(DEFAULT_GLOW); };
        img.onload = () => {
            clearTimeout(bail);
            try {
                const S = 24;
                const c = document.createElement("canvas");
                c.width = c.height = S;
                const g = c.getContext("2d", { willReadFrequently: true })!;
                g.drawImage(img, 0, 0, S, S);
                const px = g.getImageData(0, 0, S, S).data;

                let r = 0, gr = 0, b = 0, wt = 0;
                for (let i = 0; i < px.length; i += 4) {
                    if (px[i + 3] < 200) continue;
                    const mx = Math.max(px[i], px[i + 1], px[i + 2]);
                    const mn = Math.min(px[i], px[i + 1], px[i + 2]);
                    const sat = (mx - mn) / (mx || 1);
                    const w = sat * sat * (0.25 + mx / 255) + 0.01;
                    r += px[i] * w; gr += px[i + 1] * w; b += px[i + 2] * w; wt += w;
                }
                if (!wt) return resolve(DEFAULT_GLOW);

                r /= wt; gr /= wt; b /= wt;
                const k = 235 / (Math.max(r, gr, b) || 1);
                r *= k; gr *= k; b *= k;

                // A near-grey avatar makes a dull glow: lean on the brand blurple instead.
                const sat = (Math.max(r, gr, b) - Math.min(r, gr, b)) / 235;
                const mix = sat < 0.28 ? 0.55 : 0;
                const [dr, dg, db] = DEFAULT_GLOW.split(",").map(Number);
                resolve(`${Math.round(lerp(r, dr, mix))}, ${Math.round(lerp(gr, dg, mix))}, ${Math.round(lerp(b, db, mix))}`);
            } catch {
                resolve(DEFAULT_GLOW);
            }
        };
        img.src = url;
    });
}

/* ------------------------------------------------------------------ */
/* audio: synthesized chime + analyser                                */
/* ------------------------------------------------------------------ */

// Version-agnostic byte buffer type (TS 5.7+ made Uint8Array generic)
const bytes = (n: number) => new Uint8Array(new ArrayBuffer(n));

interface Engine {
    ctx: AudioContext;
    analyser: AnalyserNode;
    freq: ReturnType<typeof bytes>;
    time: ReturnType<typeof bytes>;
    stop(fade: boolean): void;
}

function impulse(ctx: AudioContext, seconds: number, decay: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
}

function createEngine(volume: number, holdSec: number): Engine | null {
    try {
        const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as any).webkitAudioContext;
        if (!AC) return null;

        const ctx = new AC({ latencyHint: "interactive" });
        void ctx.resume().catch(() => { });

        const master = ctx.createGain();
        master.gain.value = Math.pow(clamp(volume / 100), 1.6) * 0.9;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 5;
        comp.attack.value = 0.003;
        comp.release.value = 0.2;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.74;
        master.connect(comp);
        comp.connect(analyser);
        analyser.connect(ctx.destination);

        const dry = ctx.createGain();
        dry.connect(master);
        const verb = ctx.createConvolver();
        verb.buffer = impulse(ctx, 1.9, 2.4);
        const wet = ctx.createGain();
        wet.gain.value = 0.42;
        verb.connect(wet);
        wet.connect(master);
        const send = ctx.createGain();
        send.connect(verb);

        const T = ctx.currentTime + 0.08;

        const tone = (
            freq: number, at: number, dur: number, gain: number, type: OscillatorType,
            o: { attack?: number; release?: number; lp?: number; detune?: number } = {}
        ) => {
            const { attack = 0.006, release = 0, lp = 0, detune = 0 } = o;
            const s = T + at, e = s + dur;
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = freq;
            osc.detune.value = detune;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, s);
            g.gain.exponentialRampToValueAtTime(gain, s + attack);
            g.gain.setValueAtTime(gain, Math.max(s + attack, e - release));
            g.gain.exponentialRampToValueAtTime(0.0001, e);
            let node: AudioNode = osc;
            if (lp) {
                const f = ctx.createBiquadFilter();
                f.type = "lowpass";
                f.frequency.value = lp;
                osc.connect(f);
                node = f;
            }
            node.connect(g);
            g.connect(dry);
            g.connect(send);
            osc.start(s);
            osc.stop(e + 0.05);
        };

        const bell = (f: number, at: number, gain: number) => {
            tone(f, at, 1.5, gain, "sine");
            tone(f * 2.005, at, 0.9, gain * 0.33, "sine");
            tone(f * 3.01, at, 0.35, gain * 0.12, "triangle");
        };

        const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.6), ctx.sampleRate);
        const nd = noise.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

        const sweep = (at: number, dur: number, f0: number, f1: number, gain: number) => {
            const src = ctx.createBufferSource();
            src.buffer = noise;
            const bp = ctx.createBiquadFilter();
            bp.type = "bandpass";
            bp.Q.value = 1.1;
            bp.frequency.setValueAtTime(f0, T + at);
            bp.frequency.exponentialRampToValueAtTime(f1, T + at + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, T + at);
            g.gain.exponentialRampToValueAtTime(gain, T + at + dur * 0.65);
            g.gain.exponentialRampToValueAtTime(0.0001, T + at + dur);
            src.connect(bp);
            bp.connect(g);
            g.connect(dry);
            g.connect(send);
            src.start(T + at);
            src.stop(T + at + dur + 0.05);
        };

        // sub thump
        {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(130, T);
            o.frequency.exponentialRampToValueAtTime(38, T + 0.35);
            g.gain.setValueAtTime(0.0001, T);
            g.gain.exponentialRampToValueAtTime(0.9, T + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, T + 0.55);
            o.connect(g);
            g.connect(dry);
            o.start(T);
            o.stop(T + 0.6);
        }

        // whoosh up, pad, sub
        sweep(0, 1.05, 160, 5200, 0.38);
        const padLen = holdSec - 0.07;
        [155.56, 233.08, 392.0].forEach((f, i) => {
            tone(f, 0.22, padLen, 0.1, i === 0 ? "sine" : "triangle", { attack: 0.7, release: 0.8, lp: 1900, detune: 4 * i });
            tone(f, 0.22, padLen, 0.07, "triangle", { attack: 0.8, release: 0.8, lp: 1700, detune: -7 });
        });
        tone(77.78, 0.2, padLen, 0.16, "sine", { attack: 0.5, release: 0.8 });

        // arpeggio, then the resolve
        ARP_NOTES.forEach((f, i) => bell(f, ARP_AT + i * ARP_STEP, 0.13 - i * 0.008));
        [622.25, 783.99, 932.33, 1244.51, 1396.91].forEach((f, i) => bell(f, RESOLVE_AT + i * 0.012, 0.09));
        tone(311.13, RESOLVE_AT, 1.6, 0.12, "triangle", { attack: 0.05, release: 1.0, lp: 2400 });

        // the dissolve: reverse whoosh plus a falling shimmer
        sweep(holdSec - 0.05, 0.9, 5200, 220, 0.3);
        [1244.51, 932.33, 783.99, 622.25].forEach((f, i) => bell(f, holdSec + i * 0.09, 0.07));

        return {
            ctx,
            analyser,
            freq: bytes(analyser.frequencyBinCount),
            time: bytes(analyser.fftSize),
            stop(fade) {
                try {
                    if (fade) {
                        const n = ctx.currentTime;
                        master.gain.cancelScheduledValues(n);
                        master.gain.setValueAtTime(master.gain.value, n);
                        master.gain.linearRampToValueAtTime(0, n + 0.3);
                    }
                } catch { /* already closed */ }
                setTimeout(() => void ctx.close().catch(() => { }), fade ? 600 : 3200);
            }
        };
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/* DOM                                                                */
/* ------------------------------------------------------------------ */

function buildDom(): HTMLDivElement {
    const root = document.createElement("div");
    root.className = "ddt-wc";
    root.setAttribute("aria-hidden", "true");

    const letters = [...WORDMARK]
        .map((ch, i) => `<span class="ddt-wc-l" style="--i:${i}">${ch === " " ? "&nbsp;" : ch}</span>`)
        .join("");

    root.innerHTML = `
        <canvas class="ddt-wc-fx" data-k="fx"></canvas>
        <div class="ddt-wc-aurora"><i></i><i></i><i></i></div>
        <div class="ddt-wc-floor"><div class="ddt-wc-grid"></div></div>
        <div class="ddt-wc-flash" data-k="flash"></div>
        <div class="ddt-wc-scan"></div>

        <div class="ddt-wc-corner ddt-wc-tl">Session <b data-k="sess"></b><br>DDT-ASAR link</div>
        <div class="ddt-wc-corner ddt-wc-tr"><b data-k="clock">--:--:--</b><br>Local time</div>
        <div class="ddt-wc-corner ddt-wc-bl">Frame clock<br><b data-k="fps">-- fps</b></div>
        <div class="ddt-wc-corner ddt-wc-br">Audio engine<br><b data-k="aud">online</b></div>

        <div class="ddt-wc-stage">
            <div class="ddt-wc-panel" data-k="panel">
                <div class="ddt-wc-gloss"></div>
                <div class="ddt-wc-titlebar">
                    <span class="ddt-wc-tico"></span>
                    <span class="ddt-wc-ttext">DDT Remastered: session initialising</span>
                    <span class="ddt-wc-wbtns"><b>&#8211;</b><b>&#9633;</b><b class="ddt-wc-close" data-k="close">&#10005;</b></span>
                </div>

                <div class="ddt-wc-body">
                    <div class="ddt-wc-orb" data-k="orb">
                        <div class="ddt-wc-glow" data-k="glow"></div>
                        <svg class="ddt-wc-rings" viewBox="0 0 200 200" fill="none">
                            <g class="ddt-wc-r1"><circle cx="100" cy="100" r="97" /></g>
                            <g class="ddt-wc-r2"><circle cx="100" cy="100" r="88" /></g>
                            <g class="ddt-wc-r3"><circle cx="100" cy="100" r="79" /></g>
                            <circle class="ddt-wc-arc-bg" cx="100" cy="100" r="94" />
                            <circle class="ddt-wc-arc" data-k="arc" cx="100" cy="100" r="94" transform="rotate(-90 100 100)" />
                        </svg>
                        <div class="ddt-wc-avatar"><img data-k="img" alt="" draggable="false"></div>
                        <div class="ddt-wc-orbgloss"></div>
                    </div>

                    <div class="ddt-wc-copy">
                        <div class="ddt-wc-greet" data-k="greet"></div>
                        <div class="ddt-wc-word" data-k="word">${letters}<span class="ddt-wc-shine">${WORDMARK}</span></div>
                        <div class="ddt-wc-sub"><span class="ddt-wc-ver">v3.0</span><span class="ddt-wc-by">Powered by DDT-ASAR</span></div>
                        <div class="ddt-wc-log">
                            <div style="--d:1.0s"><em>core.boot</em><u></u><b>ok</b></div>
                            <div style="--d:1.18s"><em>render.clock</em><u></u><b data-k="fpsv">-- fps</b></div>
                            <div style="--d:1.36s"><em>audio.engine</em><u></u><b data-k="audv">online</b></div>
                            <div style="--d:1.54s"><em>user.link</em><u></u><b>secured</b></div>
                            <div style="--d:1.72s"><em>vencord.api</em><u></u><b>linked</b></div>
                        </div>
                    </div>
                </div>

                <canvas class="ddt-wc-wave" data-k="wave"></canvas>
                <div class="ddt-wc-progress"><i data-k="bar"></i></div>
            </div>
            <div class="ddt-wc-hint">Esc or click outside to skip</div>
        </div>`;
    return root;
}

/* ------------------------------------------------------------------ */
/* the show                                                           */
/* ------------------------------------------------------------------ */

interface Handle { dismiss(): void; destroy(): void; }

let active: Handle | null = null;
let busy = false;

async function runWelcome() {
    if (active || busy) return;
    busy = true;
    try {
        const cfg = settings.store;
        const user: any = UserStore.getCurrentUser();
        const name: string = user?.globalName || user?.username || "Operator";
        const avatar = avatarOf(user);
        const reduced = !!cfg.respectReducedMotion && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const quality = (reduced ? "lite" : cfg.quality) as "ultra" | "balanced" | "lite";
        const motion = !reduced;
        const holdMs = clamp(Number(cfg.holdMs) || 3500, 1500, 10000);

        const glow = await Promise.race([sampleGlow(avatar), delay(350).then(() => DEFAULT_GLOW)]);

        /* ---- build ---- */
        const root = buildDom();
        root.classList.add(`ddt-wc--${quality}`);
        if (reduced) root.classList.add("ddt-wc--reduced");
        root.style.setProperty("--ddt-glow", glow);

        const easing = springEasing(190, 15);
        if (easing) {
            root.style.setProperty("--ddt-spring", easing.css);
            root.style.setProperty("--ddt-spring-ms", `${easing.ms}ms`);
        }

        const q = <T extends HTMLElement>(k: string) => root.querySelector<T>(`[data-k="${k}"]`)!;
        const fxEl = q<HTMLCanvasElement>("fx");
        const waveEl = q<HTMLCanvasElement>("wave");
        const panel = q("panel");
        const orb = q("orb");
        const glowEl = q("glow");
        const flashEl = q("flash");
        const bar = q("bar");
        const arc = root.querySelector<SVGCircleElement>('[data-k="arc"]')!;
        const word = q("word");
        const letters = [...word.querySelectorAll<HTMLElement>(".ddt-wc-l")];

        const hour = new Date().getHours();
        const hello = hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        const strong = document.createElement("strong");
        strong.textContent = name;
        q("greet").append(`${hello}, `, strong);
        q("sess").textContent = "0x" + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");

        const img = q<HTMLImageElement>("img");
        img.onerror = () => { img.onerror = null; img.src = defaultAvatar(user); };
        img.src = avatar;

        /* ---- audio ---- */
        let customAudio: HTMLAudioElement | null = null;
        if (cfg.customAudioUrl && cfg.sound && cfg.volume > 0) {
            try {
                customAudio = new Audio(cfg.customAudioUrl);
                customAudio.volume = clamp(cfg.volume / 100, 0, 1);
                void customAudio.play().catch(() => {});
            } catch {}
        }
        let engine: Engine | null = !customAudio && cfg.sound && cfg.volume > 0 ? createEngine(cfg.volume, holdMs / 1000) : null;
        const setAudioLabel = (on: boolean) => {
            const t = on ? "online" : "muted";
            q("aud").textContent = t;
            q("audv").textContent = t;
        };
        setAudioLabel(!!(engine || customAudio));

        document.body.appendChild(root);

        /* ---- canvases ---- */
        const wc = waveEl.getContext("2d")!;
        const fx = motion ? fxEl.getContext("2d")! : null;
        if (!motion) { fxEl.remove(); }

        let fs = 1, fw = 0, fh = 0, ocx = 0, ocy = 0, ww = 0, wh = 0;
        let wgrad: CanvasGradient | null = null;
        const rr = typeof (wc as any).roundRect === "function";

        interface P { x: number; y: number; v: number; len: number; s: number; a: number; f: number; ph: number; amp: number; tw: number; c: number; }
        let particles: P[] = [];
        const pCount = quality === "ultra" ? 140 : quality === "balanced" ? 80 : 36;
        const pColors = ["rgb(160, 200, 255)", "rgb(94, 231, 255)", `rgb(${glow})`];
        const rand = (a: number, b: number) => a + Math.random() * (b - a);

        const layout = () => {
            fs = Math.min(window.devicePixelRatio || 1, quality === "ultra" ? 1.5 : 1);
            fw = Math.round(innerWidth * fs);
            fh = Math.round(innerHeight * fs);
            if (fx) {
                fxEl.width = fw;
                fxEl.height = fh;
                particles = Array.from({ length: pCount }, () => ({
                    x: rand(0, fw), y: rand(0, fh), v: rand(14, 60), len: rand(6, 26), s: rand(0.8, 2.2),
                    a: rand(0.25, 0.9), f: rand(0.3, 1.2), ph: rand(0, TAU), amp: rand(4, 26), tw: rand(1, 3), c: (Math.random() * 3) | 0
                }));
            }
            const r = orb.getBoundingClientRect();
            ocx = (r.left + r.width / 2) * fs;
            ocy = (r.top + r.height / 2) * fs;

            ww = waveEl.offsetWidth;
            wh = waveEl.offsetHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            waveEl.width = Math.max(1, Math.round(ww * dpr));
            waveEl.height = Math.max(1, Math.round(wh * dpr));
            wc.setTransform(dpr, 0, 0, dpr, 0, 0);
            wgrad = wc.createLinearGradient(0, 0, ww, 0);
            wgrad.addColorStop(0, "rgb(88, 101, 242)");
            wgrad.addColorStop(0.5, "rgb(94, 231, 255)");
            wgrad.addColorStop(1, "rgb(87, 242, 135)");
        };
        layout();
        window.addEventListener("resize", layout);

        /* ---- state ---- */
        const spring = new Spring(0, 1, 190, 15);
        let dSpring: Spring | null = null;
        let dissolving = false;
        let dissolveAt = 0;
        let hitIdx = 0;
        let flash = 0;
        const waves: { r: number; a: number; str: number }[] = [];
        const bars = new Float32Array(BARS);

        let fpsFrames = 0, fpsAt = 0, fps = 0, lastSecond = -1;
        let scrambleAt = 0, scrambled = false;
        let raf = 0;

        const t0 = performance.now();
        let last = t0;
        fpsAt = t0;

        const spawnWave = (str: number) => waves.push({ r: 90 * fs, a: 1, str });

        const synthEnergy = (t: number, now: number) => {
            let e = 0.16 + 0.04 * Math.sin(t * 3.1);
            for (const [h, s] of HITS) if (t >= h) e += s * Math.exp(-(t - h) * 4.2);
            if (dissolving) e += Math.exp(-((now - dissolveAt) / 1000) * 4);
            return clamp(e * 0.9);
        };

        /* ---- draw: particles, shockwaves, bloom ---- */
        const drawFx = (dt: number, t: number, energy: number) => {
            if (!fx) return;
            fx.clearRect(0, 0, fw, fh);
            fx.globalCompositeOperation = "lighter";

            const bloom = fx.createRadialGradient(ocx, ocy, 0, ocx, ocy, Math.max(fw, fh) * 0.55);
            bloom.addColorStop(0, `rgba(${glow}, ${0.1 + energy * 0.22})`);
            bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
            fx.fillStyle = bloom;
            fx.fillRect(0, 0, fw, fh);

            fx.lineCap = "round";
            for (let c = 0; c < 3; c++) {
                fx.strokeStyle = pColors[c];
                for (const p of particles) {
                    if (p.c !== c) continue;
                    p.y -= p.v * dt * (1 + energy * 2.6) * fs;
                    if (p.y < -40 * fs) { p.y = fh + 40 * fs; p.x = rand(0, fw); }
                    const x = p.x + Math.sin(t * p.f + p.ph) * p.amp * fs;
                    fx.globalAlpha = p.a * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph)) * (0.6 + energy * 0.6);
                    fx.lineWidth = p.s * fs;
                    fx.beginPath();
                    fx.moveTo(x, p.y);
                    fx.lineTo(x, p.y + p.len * (1 + energy * 3) * fs);
                    fx.stroke();
                }
            }

            fx.strokeStyle = `rgb(${glow})`;
            for (let i = waves.length - 1; i >= 0; i--) {
                const w = waves[i];
                w.r += (320 + 520 * w.str) * dt * fs;
                w.a -= dt * 0.9;
                if (w.a <= 0) { waves.splice(i, 1); continue; }
                fx.globalAlpha = w.a * 0.55 * w.str;
                fx.lineWidth = (2 + w.str * 3) * fs;
                fx.beginPath();
                fx.arc(ocx, ocy, w.r, 0, TAU);
                fx.stroke();
            }
            fx.globalAlpha = 1;
            fx.globalCompositeOperation = "source-over";
        };

        /* ---- draw: spectrum + ribbons ---- */
        const drawWave = (t: number, energy: number, real: boolean) => {
            if (!ww || !wgrad) return;
            wc.clearRect(0, 0, ww, wh);
            wc.globalCompositeOperation = "lighter";
            const mid = wh * 0.52;

            wc.fillStyle = wgrad;
            wc.globalAlpha = 0.35;
            wc.fillRect(0, mid - 0.5, ww, 1);

            const step = ww / BARS;
            const bw = Math.max(2, step * 0.52);
            wc.globalAlpha = 0.9;
            for (let i = 0; i < BARS; i++) {
                const nx = (i + 0.5) / BARS;
                const env = 0.25 + 0.75 * Math.sin(Math.PI * nx) ** 0.8;
                const bh = 2 + bars[i] * wh * 0.44 * env;
                const x = i * step + (step - bw) / 2;
                wc.beginPath();
                if (rr) (wc as any).roundRect(x, mid - bh, bw, bh * 2, bw / 2); else wc.rect(x, mid - bh, bw, bh * 2);
                wc.fill();
            }

            wc.lineJoin = "round";
            wc.lineCap = "round";
            wc.strokeStyle = wgrad;
            const amp = wh * (0.1 + 0.3 * energy);
            const td = engine?.time;
            for (let L = 0; L < 4; L++) {
                wc.globalAlpha = 0.85 - L * 0.17;
                wc.lineWidth = 2.4 - L * 0.45;
                wc.beginPath();
                for (let x = 0; x <= ww; x += 4) {
                    const nx = x / ww;
                    const env = Math.sin(Math.PI * nx) ** 1.35;
                    let y = Math.sin(nx * (5.5 + L * 2.1) * Math.PI + t * (2 + L * 0.85) + L * 1.9) * amp * (1 - L * 0.17);
                    if (real && td) y += ((td[(nx * (td.length - 1)) | 0] - 128) / 128) * wh * 0.22 * env * (1 - L * 0.2);
                    y *= env;
                    if (x === 0) wc.moveTo(x, mid + y); else wc.lineTo(x, mid + y);
                }
                wc.stroke();
            }
            wc.globalAlpha = 1;
            wc.globalCompositeOperation = "source-over";
        };

        /* ---- control ---- */
        const beginDissolve = () => {
            if (dissolving) return;
            dissolving = true;
            dissolveAt = performance.now();
            // negative initial velocity = a small anticipation dip before the burst outward
            dSpring = new Spring(0, 1, 135, 19, -2.6);
            spawnWave(1);
            flash = 1;
            root.classList.add("ddt-wc--out");
        };

        let destroyed = false;
        const destroy = () => {
            if (destroyed) return;
            destroyed = true;
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", layout);
            window.removeEventListener("keydown", onKey, true);
            engine?.stop(false);
            engine = null;
            if (customAudio) {
                try { customAudio.pause(); } catch {}
                customAudio = null;
            }
            root.remove();
            if (active === handle) active = null;
        };

        const dismiss = () => {
            if (dissolving) return;
            engine?.stop(true);
            engine = null;
            if (customAudio) {
                try { customAudio.pause(); } catch {}
                customAudio = null;
            }
            setAudioLabel(false);
            beginDissolve();
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
        };
        window.addEventListener("keydown", onKey, true);
        root.addEventListener("pointerdown", e => {
            const target = e.target as Node;
            if (!panel.contains(target) || (target as HTMLElement).closest?.(".ddt-wc-close")) dismiss();
        });

        const handle: Handle = { dismiss, destroy };
        active = handle;

        /* ---- the loop ---- */
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((now - last) / 1000, 1 / 20);
            last = now;
            const t = (now - t0) / 1000;

            if (!dissolving && now - t0 >= holdMs) beginDissolve();

            const intro = motion ? spring.step(dt) : 1;
            const d = dissolving && dSpring ? dSpring.step(dt) : 0;
            const dc = clamp(d);

            // energy: real analyser data when the context is running, otherwise the scripted score
            const real = !!engine && engine.ctx.state === "running";
            const up = 1 - Math.exp(-dt * 28);
            const down = 1 - Math.exp(-dt * 7);
            const synth = synthEnergy(t, now);
            if (real && engine) {
                engine.analyser.getByteFrequencyData(engine.freq);
                engine.analyser.getByteTimeDomainData(engine.time);
            }
            for (let i = 0; i < BARS; i++) {
                let v: number;
                if (real && engine) {
                    const bin = Math.floor(Math.pow(i / BARS, 1.6) * engine.freq.length * 0.75);
                    v = engine.freq[bin] / 255;
                } else {
                    v = synth * (0.35 + 0.65 * Math.abs(Math.sin(t * 5.3 + i * 0.7) * Math.cos(t * 2.1 - i * 0.31)));
                }
                bars[i] += (v - bars[i]) * (v > bars[i] ? up : down);
            }
            let sum = 0, bass = 0;
            for (let i = 0; i < BARS; i++) { sum += bars[i]; if (i < 7) bass += bars[i]; }
            const energy = real ? clamp((sum / BARS) * 1.9) : synth;
            const bassE = real ? clamp((bass / 7) * 1.6) : synth;

            while (hitIdx < HITS.length && t >= HITS[hitIdx][0]) {
                const s = HITS[hitIdx][1];
                if (motion) spawnWave(s);
                flash = Math.max(flash, s * 0.6);
                hitIdx++;
            }
            flash *= Math.exp(-dt * 5);

            // ---- apply: overlay + panel (spring-driven)
            root.style.opacity = (Math.min(1, (now - t0) / FADE_IN_MS) * (1 - smooth(dc))).toFixed(3);
            panel.style.opacity = dc > 0 ? (1 - smooth(clamp(dc * 1.35))).toFixed(3) : "";
            if (motion) {
                const sc = (0.86 + 0.14 * intro) * (1 + 0.16 * d);
                panel.style.transform = `translate3d(0, ${(-d * 18).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
                panel.style.filter = dc > 0.02 ? `blur(${(dc * 14).toFixed(2)}px)` : "";
                orb.style.transform = d !== 0 ? `scale(${(1 + d * 0.25).toFixed(4)})` : "";
                glowEl.style.transform = `scale(${(0.9 + bassE * 0.5 + 0.05 * Math.sin(t * 2) + dc * 0.8).toFixed(3)})`;
                glowEl.style.opacity = clamp(0.5 + energy * 0.5 + dc * 0.5).toFixed(3);
                flashEl.style.opacity = (flash * 0.5 * (1 - dc * 0.6)).toFixed(3);
            } else {
                glowEl.style.opacity = "0.7";
            }

            // ---- progress
            const p = clamp(t / (holdMs / 1000));
            bar.style.width = `${(p * 100).toFixed(2)}%`;
            arc.style.strokeDashoffset = (590.6 * (1 - p)).toFixed(2);

            // ---- wordmark decode
            if (motion && !scrambled && now >= scrambleAt) {
                scrambleAt = now + 45;
                const done = t > 1.45;
                for (let i = 0; i < letters.length; i++) {
                    const ch = WORDMARK[i];
                    if (ch === " ") continue;
                    const reveal = 0.69 + i * 0.055;
                    letters[i].textContent = done || t >= reveal ? ch : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
                }
                if (done) scrambled = true;
            }

            // ---- telemetry
            fpsFrames++;
            if (now - fpsAt >= 500) {
                fps = (fpsFrames * 1000) / (now - fpsAt);
                fpsFrames = 0;
                fpsAt = now;
                const txt = `${Math.round(fps)} fps`;
                q("fps").textContent = txt;
                q("fpsv").textContent = txt;
            }
            const sec = Math.floor(now / 1000);
            if (sec !== lastSecond) {
                lastSecond = sec;
                q("clock").textContent = new Date().toLocaleTimeString([], { hour12: false });
            }

            // ---- canvases
            if (motion) {
                drawFx(dt, t, energy);
                drawWave(t, energy, real);
            }

            if (dissolving && ((dSpring!.settled && dc >= 0.995) || now - dissolveAt > 1800)) destroy();
        };

        raf = requestAnimationFrame(frame);
    } finally {
        busy = false;
    }
}

/* ------------------------------------------------------------------ */
/* plugin lifecycle                                                   */
/* ------------------------------------------------------------------ */

let startupHandled = false;
let startTimer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
    if (startupHandled) return;
    startupHandled = true;
    // give the app shell a beat to paint underneath us
    startTimer = setTimeout(() => void runWelcome(), 450);
}

function onConnect() {
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", onConnect);
    schedule();
}

export default definePlugin({
    name: "ddtWelcomer",
    description: "A once-per-launch Aero-glass HUD welcome: avatar glow, live waveform and a spring-physics dissolve.",
    authors: [{ name: "DDT", id: 0n }],
    settings,
    enabledByDefault: true,

    toolboxActions: {
        "Replay DDT welcome"() {
            void runWelcome();
        }
    },

    start() {
        // Only auto-play on a fresh launch, not when the plugin is toggled on mid-session.
        if (startupHandled || performance.now() > STARTUP_WINDOW_MS) return;
        if (UserStore.getCurrentUser()) schedule();
        else FluxDispatcher.subscribe("CONNECTION_OPEN", onConnect);
    },

    stop() {
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", onConnect);
        clearTimeout(startTimer);
        active?.destroy();
    }
});
