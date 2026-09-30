/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface D1Result<T> { results: T[]; }
interface D1Statement {
    bind(...values: unknown[]): D1Statement;
    all<T>(): Promise<D1Result<T>>;
    run(): Promise<unknown>;
}
interface D1Database { prepare(query: string): D1Statement; }

interface Env {
    DB: D1Database;
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
    TOKEN_SECRET: string;
}

interface Profile {
    background?: string;
    song?: string;
    bio?: string;
    accent?: string;
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USERS_CACHE_SECONDS = 120;

// Must stay in sync with the img-src CSP allowlist in src/main/csp/index.ts
const BACKGROUND_HOSTS = [
    "i.imgur.com",
    "files.catbox.moe",
    "cdn.discordapp.com",
    "media.discordapp.net",
    "i.ibb.co",
    "i.pinimg.com",
    "media.tenor.com",
    "raw.githubusercontent.com",
];

const SONG_HOSTS = [
    "open.spotify.com",
    "youtube.com",
    "www.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "soundcloud.com",
    "music.apple.com",
];

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const encoder = new TextEncoder();

function respond(body: string | null, status = 200, headers: Record<string, string> = {}) {
    return new Response(body, { status, headers: { ...CORS_HEADERS, ...headers } });
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
    return respond(JSON.stringify(data), status, { "Content-Type": "application/json", ...headers });
}

function toBase64Url(bytes: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string) {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function createToken(userId: string, env: Env) {
    const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`;
    return `${payload}.${await sign(payload, env.TOKEN_SECRET)}`;
}

function safeEqual(a: string, b: string) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function verifyToken(token: string | null, env: Env): Promise<string | null> {
    if (!token) return null;
    const [userId, exp, sig] = token.split(".");
    if (!userId || !exp || !sig) return null;
    if (Number(exp) < Date.now()) return null;
    return safeEqual(sig, await sign(`${userId}.${exp}`, env.TOKEN_SECRET)) ? userId : null;
}

function parseHttpsUrl(value: unknown, hosts: string[]) {
    if (typeof value !== "string" || value.length > 300) return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && hosts.includes(url.hostname) ? url.href : null;
    } catch {
        return null;
    }
}

function validateProfile(body: unknown): Profile | string {
    if (typeof body !== "object" || body === null) return "Invalid body";
    const input = body as Record<string, unknown>;
    const profile: Profile = {};

    if (input.background) {
        const background = parseHttpsUrl(input.background, BACKGROUND_HOSTS);
        if (!background) return `Background must be an https link from: ${BACKGROUND_HOSTS.join(", ")}`;
        profile.background = background;
    }
    if (input.song) {
        const song = parseHttpsUrl(input.song, SONG_HOSTS);
        if (!song) return "Song must be a Spotify, YouTube, SoundCloud or Apple Music link";
        profile.song = song;
    }
    if (input.bio) {
        if (typeof input.bio !== "string" || input.bio.length > 190) return "Bio must be at most 190 characters";
        profile.bio = input.bio;
    }
    if (input.accent) {
        if (typeof input.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(input.accent)) return "Accent must be a hex colour like #ff00aa";
        profile.accent = input.accent.toLowerCase();
    }

    return profile;
}

async function handleCallback(url: URL, env: Env) {
    const code = url.searchParams.get("code");
    if (!code) return respond("Missing code", 400);

    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: `${url.origin}/callback`,
        }),
    });
    if (!tokenRes.ok) return respond("Discord authorization failed", 401);

    const { access_token } = await tokenRes.json() as { access_token: string; };
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) return respond("Could not fetch Discord user", 401);

    const { id } = await userRes.json() as { id: string; };
    return respond(await createToken(id, env), 200, { "Content-Type": "text/plain" });
}

async function handleUsers(request: Request, env: Env) {
    const cache = (caches as unknown as { default: Cache; }).default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const { results } = await env.DB.prepare("SELECT id, data FROM profiles").all<{ id: string; data: string; }>();
    const users: Record<string, Profile> = {};
    for (const row of results) users[row.id] = JSON.parse(row.data);

    const res = json({ users }, 200, { "Cache-Control": `public, max-age=${USERS_CACHE_SECONDS}` });
    await cache.put(request, res.clone());
    return res;
}

async function handleProfile(request: Request, env: Env) {
    const userId = await verifyToken(request.headers.get("Authorization"), env);
    if (!userId) return respond("Unauthorized", 401);

    if (request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM profiles WHERE id = ?").bind(userId).run();
        return respond(null, 204);
    }

    const profile = validateProfile(await request.json().catch(() => null));
    if (typeof profile === "string") return respond(profile, 400);

    await env.DB.prepare(
        "INSERT INTO profiles (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    ).bind(userId, JSON.stringify(profile), Date.now()).run();

    return json(profile);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") return respond(null, 204);
        if (request.method === "GET" && url.pathname === "/callback") return handleCallback(url, env);
        if (request.method === "GET" && url.pathname === "/users") return handleUsers(request, env);
        if ((request.method === "PUT" || request.method === "DELETE") && url.pathname === "/profile") return handleProfile(request, env);

        return respond("Not found", 404);
    },
};
