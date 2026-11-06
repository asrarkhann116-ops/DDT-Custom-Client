/*
 * DDT Music Studio — Native bridge (Electron main process)  v4
 *
 * Owns the lifecycle of the local music relay server:
 *  - adopts an already-running relay instead of fighting it for the port
 *  - spawns with system Node, falls back to Electron-as-Node if Node is missing
 *  - real exponential backoff (1s, 2s, 4s … capped), crash counter resets after stable uptime
 *  - single pending-restart timer (no double spawns), intentional-stop guard
 *  - kills the whole process tree (Windows: taskkill /T) and on app quit
 *  - keeps the last stderr lines so failures are diagnosable
 */

import { app, IpcMainInvokeEvent } from "electron";
import { ChildProcess, execFileSync, spawn } from "child_process";
import { existsSync } from "fs";
import { request } from "http";
import { join } from "path";

const PORT = 3124;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;
const STABLE_UPTIME_MS = 30_000;
const LOG_LINES = 25;

/** Add absolute paths to server.js here for your dev machine. Checked last. */
const DEV_FALLBACK_PATHS: string[] = [
    "E:\\asrar\\projects\\DDT_Production_Vencord_Like_Client\\Vencord-main\\Vencord-main\\src\\userplugins\\musicVisualizer\\music-relay-server\\server.js",
];

type RelayResult = { success: boolean; port: number; message?: string };

// ── State ────────────────────────────────────────────────────────────────────
let inProcessServer: any = null;
let child: ChildProcess | null = null;
let keepAlive = false;
let starting: Promise<RelayResult> | null = null;
let crashCount = 0;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let stableTimer: ReturnType<typeof setTimeout> | null = null;
let useElectronAsNode = false;
let lastError = "";
const logTail: string[] = [];

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log("[MusicViz:native]", ...a);

// ── Node binary (lazy — never block main-process startup) ────────────────────
let cachedNode: string | null | undefined;

function findNodeBinary(): string | null {
    if (cachedNode !== undefined) return cachedNode;

    const win = process.platform === "win32";
    const candidates: string[] = [];

    if (win) {
        const pf = process.env.ProgramFiles ?? "C:\\Program Files";
        const pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
        candidates.push(join(pf, "nodejs", "node.exe"), join(pf86, "nodejs", "node.exe"));
        if (process.env.NVM_SYMLINK) candidates.push(join(process.env.NVM_SYMLINK, "node.exe"));
        if (process.env.LOCALAPPDATA) candidates.push(join(process.env.LOCALAPPDATA, "Programs", "nodejs", "node.exe"));
    } else {
        candidates.push("/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node");
    }

    for (const p of candidates) if (existsSync(p)) return (cachedNode = p);

    try {
        const out = execFileSync(win ? "where.exe" : "which", ["node"], { encoding: "utf8", timeout: 3000, windowsHide: true });
        const first = out.split(/\r?\n/).map(s => s.trim()).find(Boolean);
        if (first && existsSync(first)) return (cachedNode = first);
    } catch { /* not on PATH */ }

    return (cachedNode = null);
}

// ── Server path ──────────────────────────────────────────────────────────────
function resolveServerPath(): string | null {
    const rel = ["music-relay-server", "server.js"];
    const candidates = [
        process.env.DDT_MUSIC_RELAY_PATH ?? "",
        join(__dirname, ...rel),
        join(__dirname, "..", ...rel),
        join(process.cwd(), "src", "userplugins", "musicVisualizer", ...rel),
        join(__dirname, "..", "src", "userplugins", "musicVisualizer", ...rel),
        ...DEV_FALLBACK_PATHS,
    ].filter(Boolean);

    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    lastError = "server.js not found. Tried:\n" + candidates.join("\n");
    log(lastError);
    return null;
}

// ── Health probe (main process, IPv4 explicit) ───────────────────────────────
function ping(): Promise<boolean> {
    return new Promise(resolve => {
        const req = request({ host: "127.0.0.1", port: PORT, path: "/health", method: "GET", timeout: 800 }, res => {
            res.resume();
            resolve((res.statusCode ?? 500) < 400);
        });
        req.on("timeout", () => { req.destroy(); resolve(false); });
        req.on("error", () => resolve(false));
        req.end();
    });
}

// ── Process control ──────────────────────────────────────────────────────────
function killTree(proc: ChildProcess | null) {
    if (!proc || proc.exitCode !== null || !proc.pid) return;
    try {
        if (process.platform === "win32") {
            spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => { });
        } else {
            proc.kill("SIGTERM");
            const p = proc;
            setTimeout(() => { if (p.exitCode === null) try { p.kill("SIGKILL"); } catch { } }, 2000).unref?.();
        }
    } catch (e) {
        try { proc.kill("SIGKILL"); } catch { }
    }
}

function clearTimers() {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    if (stableTimer) { clearTimeout(stableTimer); stableTimer = null; }
}

function scheduleRestart() {
    if (!keepAlive || restartTimer) return;
    crashCount++;
    const delay = Math.min(BASE_DELAY_MS * 2 ** (crashCount - 1), MAX_DELAY_MS);
    log(`restart in ${delay}ms (attempt #${crashCount})`);

    restartTimer = setTimeout(async () => {
        restartTimer = null;
        if (!keepAlive || child) return;
        if (await ping()) { log("relay already answering on port — adopting"); return; }
        const p = resolveServerPath();
        if (p) doSpawn(p);
    }, delay);
}

function doSpawn(scriptPath: string) {
    const cwd = join(scriptPath, "..");
    const nodeBin = useElectronAsNode ? null : findNodeBinary();
    const viaElectron = useElectronAsNode || !nodeBin;
    const exe = viaElectron ? process.execPath : nodeBin!;

    log(`spawn ${viaElectron ? "electron-as-node" : exe} | ${scriptPath}`);

    const proc = spawn(exe, [scriptPath], {
        cwd,
        stdio: "ignore",
        env: { ...process.env, MUSIC_PORT: String(PORT), ...(viaElectron ? { ELECTRON_RUN_AS_NODE: "1" } : {}) },
        windowsHide: true,
        detached: false,
    });
    child = proc;

    proc.stderr?.on("data", (d: Buffer) => {
        for (const line of d.toString("utf8").split(/\r?\n/)) {
            if (!line.trim()) continue;
            logTail.push(line);
            if (logTail.length > LOG_LINES) logTail.shift();
        }
    });

    let handled = false;
    const onGone = (why: string) => {
        if (handled) return;
        handled = true;
        if (stableTimer) { clearTimeout(stableTimer); stableTimer = null; }
        if (child === proc) child = null;
        lastError = why;
        log("server gone:", why);
        scheduleRestart();
    };

    proc.once("error", (err: NodeJS.ErrnoException) => {
        // System node missing/unusable → switch to Electron-as-Node once, no backoff penalty
        if (!viaElectron && (err.code === "ENOENT" || err.code === "EACCES")) {
            useElectronAsNode = true;
            handled = true;
            if (child === proc) child = null;
            if (keepAlive) doSpawn(scriptPath);
            return;
        }
        onGone(`spawn error: ${err.message}`);
    });

    proc.once("close", (code, signal) => onGone(`exit code=${code} signal=${signal}`));

    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = setTimeout(() => { crashCount = 0; }, STABLE_UPTIME_MS);
}

function tryStartInProcess(scriptPath: string): boolean {
    try {
        const req = typeof __non_webpack_require__ !== "undefined" ? __non_webpack_require__ : require;
        const mod = req(scriptPath);
        if (typeof mod?.startServer === "function") {
            inProcessServer = mod;
            mod.startServer(PORT);
            log("Relay server running IN-PROCESS inside Discord main process (Zero window, no external node.exe)");
            return true;
        }
    } catch (e: any) {
        log("In-process start note:", e?.message);
    }
    return false;
}

// ── Public IPC API ───────────────────────────────────────────────────────────
export async function startServer(_: IpcMainInvokeEvent): Promise<RelayResult> {
    keepAlive = true;
    if (starting) return starting;

    starting = (async (): Promise<RelayResult> => {
        try {
            if (inProcessServer) return { success: true, port: PORT, message: "In-process running" };
            if (child && child.exitCode === null) return { success: true, port: PORT, message: "Already running" };
            if (await ping()) return { success: true, port: PORT, message: "Relay already online" };

            const scriptPath = resolveServerPath();
            if (!scriptPath) return { success: false, port: PORT, message: "server.js not found" };

            if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
            crashCount = 0;

            // Attempt in-process start first (bypasses node.exe and prevents any black console window)
            if (tryStartInProcess(scriptPath)) {
                for (let i = 0; i < 15; i++) {
                    await sleep(100);
                    if (await ping()) return { success: true, port: PORT };
                }
            }

            doSpawn(scriptPath);

            for (let i = 0; i < 24; i++) {
                await sleep(250);
                if (await ping()) return { success: true, port: PORT };
                if (!child && !restartTimer) break;
            }
            return child
                ? { success: true, port: PORT, message: "Starting…" }
                : { success: false, port: PORT, message: lastError || "Relay exited during startup" };
        } catch (e: any) {
            return { success: false, port: PORT, message: e?.message ?? String(e) };
        } finally {
            starting = null;
        }
    })();

    return starting;
}

export async function stopServer(_: IpcMainInvokeEvent): Promise<boolean> {
    keepAlive = false;
    clearTimers();
    if (inProcessServer) {
        try { inProcessServer.stopServer(); } catch { }
        inProcessServer = null;
    }
    const had = !!child && child.exitCode === null;
    killTree(child);
    child = null;
    return had || true;
}

export async function getServerStatus(_: IpcMainInvokeEvent): Promise<{
    running: boolean; port: number; crashes: number; managed: boolean; lastError: string; log: string[];
}> {
    return {
        running: await ping(),
        port: PORT,
        crashes: crashCount,
        managed: (!!child && child.exitCode === null) || !!inProcessServer,
        lastError,
        log: [...logTail],
    };
}

// Never leave an orphaned relay behind
try {
    app.on("before-quit", () => {
        keepAlive = false;
        clearTimers();
        if (inProcessServer) {
            try { inProcessServer.stopServer(); } catch { }
            inProcessServer = null;
        }
        killTree(child);
    });
} catch { /* app unavailable in this context */ }
