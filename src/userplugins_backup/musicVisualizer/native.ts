/*
 * DDT MusicVisualizer Native Bridge ⚡
 * Manages local music relay server lifecycle from Electron Main process.
 * Features: spawn with system node (not fork), unlimited auto-restart, exponential backoff,
 *           crash-counter reset after stable run, intentional-stop guard.
 */

import { ChildProcess, spawn, execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

// ── Node binary resolution ───────────────────────────────────────────────────
// fork() cannot be used in Electron because process.execPath = Discord.exe
function findNodeBinary(): string {
    const hardcoded = [
        "C:\\Program Files\\nodejs\\node.exe",
        "C:\\Program Files (x86)\\nodejs\\node.exe",
    ];
    for (const p of hardcoded) {
        if (existsSync(p)) return p;
    }
    try {
        const found = execFileSync("where.exe", ["node"], { encoding: "utf8", timeout: 3000 })
            .trim().split("\n")[0].trim();
        if (found && existsSync(found)) return found;
    } catch {}
    return "node"; // last resort — rely on PATH
}

const NODE_BIN = findNodeBinary();

// ── State ────────────────────────────────────────────────────────────────────
let serverProcess: ChildProcess | null = null;
let isStarting = false;
let keepAlive = false;          // true = auto-restart on crash; false = intentionally stopped
let crashCount = 0;
let lastSpawnTime = 0;
let crashResetTimer: ReturnType<typeof setTimeout> | null = null;

const BASE_DELAY_MS  = 1_000;
const MAX_DELAY_MS   = 10_000;
const STABLE_UPTIME_MS = 30_000; // reset crash counter if server ran >30s without dying

// ── Path resolution ──────────────────────────────────────────────────────────
function resolveServerPath(): string | null {
    const candidates = [
        join(__dirname, "music-relay-server", "server.js"),          // Electron dist (primary)
        join(__dirname, "..", "music-relay-server", "server.js"),     // one level up
        join(process.cwd(), "src", "userplugins", "musicVisualizer", "music-relay-server", "server.js"), // dev
        join(__dirname, "..", "src", "userplugins", "musicVisualizer", "music-relay-server", "server.js"),
    ];
    console.log("[MusicViz] Resolving server.js | __dirname:", __dirname);
    for (const p of candidates) {
        const found = existsSync(p);
        console.log("[MusicViz]", found ? "✓ FOUND" : "  miss ", p);
        if (found) return p;
    }
    return null;
}

// ── Core spawn ───────────────────────────────────────────────────────────────
function doSpawn(scriptPath: string): void {
    const cwd = join(scriptPath, "..");
    lastSpawnTime = Date.now();
    console.log(`[MusicViz] Spawning via ${NODE_BIN} | cwd: ${cwd}`);

    serverProcess = spawn(NODE_BIN, [scriptPath], {
        cwd,
        // "inherit" stdout/stderr → logs flow to Electron main console, no buffer deadlock
        stdio: ["ignore", "inherit", "inherit"],
        env: { ...process.env, MUSIC_PORT: "3124" },
        detached: false,
    });

    // 'close' fires AFTER stdio streams close — safer than 'exit' for restart timing
    serverProcess.on("close", (code, signal) => {
        const uptime = Date.now() - lastSpawnTime;
        console.warn(`[MusicViz] Server closed — code=${code} signal=${signal} uptime=${uptime}ms crashes=${crashCount}`);
        serverProcess = null;
        isStarting = false;

        if (!keepAlive) {
            console.log("[MusicViz] keepAlive=false, not restarting (intentional stop).");
            return;
        }

        // If it ran stably for >30s, treat it as a fresh start (reset counter)
        if (uptime > STABLE_UPTIME_MS) {
            console.log("[MusicViz] Server ran stably, resetting crash counter.");
            crashCount = 0;
        }

        crashCount++;
        const delay = Math.min(BASE_DELAY_MS * crashCount, MAX_DELAY_MS);
        console.log(`[MusicViz] Auto-restart in ${delay}ms (attempt #${crashCount})`);

        setTimeout(() => {
            if (!keepAlive) return; // could have been stopped during the delay
            const p = resolveServerPath();
            if (p) doSpawn(p);
            else console.error("[MusicViz] server.js not found, giving up restart.");
        }, delay);
    });

    serverProcess.on("error", err => {
        console.error("[MusicViz] Spawn error:", err.message);
    });

    // Schedule crash-counter reset after stable uptime
    if (crashResetTimer) clearTimeout(crashResetTimer);
    crashResetTimer = setTimeout(() => { crashCount = 0; }, STABLE_UPTIME_MS);
}

// ── Public IPC exports ───────────────────────────────────────────────────────
export async function startServer(): Promise<{ success: boolean; port: number; message?: string }> {
    if (serverProcess && !serverProcess.killed) {
        return { success: true, port: 3124, message: "Already running" };
    }
    if (isStarting) {
        return { success: true, port: 3124, message: "Starting…" };
    }

    isStarting = true;
    keepAlive  = true;   // enable auto-restart
    crashCount = 0;      // fresh manual start resets counter

    const scriptPath = resolveServerPath();
    if (!scriptPath) {
        isStarting = false;
        console.error("[MusicViz] server.js not found — cannot start.");
        return { success: false, port: 3124, message: "server.js not found" };
    }

    try {
        doSpawn(scriptPath);
        await new Promise(r => setTimeout(r, 900)); // wait for port to bind
        isStarting = false;
        return { success: true, port: 3124 };
    } catch (err: any) {
        isStarting = false;
        console.error("[MusicViz] startServer error:", err);
        return { success: false, port: 3124, message: err?.message };
    }
}

export async function stopServer(): Promise<boolean> {
    keepAlive = false; // ← disables auto-restart BEFORE killing
    if (crashResetTimer) { clearTimeout(crashResetTimer); crashResetTimer = null; }

    if (serverProcess && !serverProcess.killed) {
        console.log("[MusicViz] Stopping relay server (keepAlive=false)…");
        try { serverProcess.kill("SIGTERM"); } catch { serverProcess.kill("SIGKILL"); }
        serverProcess = null;
        isStarting    = false;
        return true;
    }
    return false;
}

export async function getServerStatus(): Promise<{ running: boolean; port: number; crashes: number }> {
    return {
        running: !!serverProcess && !serverProcess.killed,
        port: 3124,
        crashes: crashCount,
    };
}


