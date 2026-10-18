/**
 * DDT Music Relay Server (Local Companion)
 * Runs locally on localhost:3124 to extract YouTube audio (via bundled yt-dlp) and stream audio & synced lyrics.
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Range', 'Accept'],
    exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges']
}));
app.use(express.json());

const PORT = process.env.MUSIC_PORT || 3124;

// yt-dlp executable resolution
let YTDLP = 'yt-dlp';
if (process.platform === 'win32') {
    const localExe = path.join(__dirname, 'yt-dlp.exe');
    if (fs.existsSync(localExe)) {
        YTDLP = localExe;
    } else {
        // Fall back to system PATH
        YTDLP = 'yt-dlp.exe';
    }
} else {
    YTDLP = 'yt-dlp';
}
console.log('[Music Local Server] yt-dlp binary:', YTDLP);

const urlCache = new Map();

// Extract best audio URL using yt-dlp
function getYouTubeAudio(videoId) {
    if (urlCache.has(videoId)) {
        const cached = urlCache.get(videoId);
        if (Date.now() - cached.time < 3 * 3600 * 1000) {
            return Promise.resolve(cached.url);
        }
        urlCache.delete(videoId);
    }

    return new Promise((resolve, reject) => {
        execFile(YTDLP, [
            '-f', 'ba/b',
            '--get-url',
            '--no-playlist',
            '--no-warnings',
            '--quiet',
            `https://www.youtube.com/watch?v=${videoId}`
        ], { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('[Music] yt-dlp extraction failed:', stderr?.trim() || err.message);
                reject(new Error(`yt-dlp failed: ${stderr?.trim() || err.message}`));
                return;
            }
            const audioUrl = stdout.trim().split('\n')[0];
            if (!audioUrl || !audioUrl.startsWith('http')) {
                reject(new Error('yt-dlp returned no valid audio URL'));
                return;
            }
            urlCache.set(videoId, { url: audioUrl, time: Date.now() });
            resolve(audioUrl);
        });
    });
}

// POST /audio
app.post('/audio', async (req, res) => {
    try {
        const { videoId } = req.body;
        if (!videoId) throw new Error('Missing videoId');
        const audioUrl = await getYouTubeAudio(videoId);
        res.json({ url: audioUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /stream/:videoId
app.get('/stream/:videoId', async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).send('Missing videoId');

    try {
        const audioUrl = await getYouTubeAudio(videoId);
        const parsed = new URL(audioUrl);

        const reqHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        };
        if (req.headers.range) reqHeaders['Range'] = req.headers.range;

        const proxyReq = https.request({
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: reqHeaders
        }, upstream => {
            const headers = {
                'Content-Type': upstream.headers['content-type'] || 'audio/mp4',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Cache-Control': 'no-cache'
            };
            if (upstream.headers['content-length']) headers['Content-Length'] = upstream.headers['content-length'];
            if (upstream.headers['content-range']) headers['Content-Range'] = upstream.headers['content-range'];

            res.writeHead(upstream.statusCode || 200, headers);
            upstream.pipe(res);
            upstream.on('error', () => res.end());
        });

        proxyReq.on('error', () => {
            if (!res.headersSent) res.writeHead(502);
            res.end();
        });
        proxyReq.end();
    } catch (error) {
        if (!res.headersSent) res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    }
});

// LYRICS proxy
function httpsReq(method, hostname, reqPath, body, headers) {
    return new Promise((resolve, reject) => {
        const buf = body ? Buffer.from(body, 'utf8') : null;
        const req = https.request({
            hostname, port: 443, path: reqPath, method,
            headers: { ...headers, ...(buf ? { 'Content-Length': buf.length } : {}) }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, json: JSON.parse(data), raw: data }); }
                catch { resolve({ status: res.statusCode, json: null, raw: data }); }
            });
        });
        req.on('error', reject);
        if (buf) req.write(buf);
        req.end();
    });
}

async function fetchLrclib(lrcPath) {
    return httpsReq('GET', 'lrclib.net', lrcPath, null, {
        'Accept': 'application/json',
        'User-Agent': 'DDT-Local-Proxy/1.0'
    });
}

async function getLyrics(track, artist) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const trackN = norm(track);

    function score(hit) {
        const tn = norm(hit.trackName || '');
        const an = norm(hit.artistName || '');
        let s = 0;
        if (tn === trackN) s += 100;
        else if (tn.includes(trackN)) s += 50;
        else if (trackN.includes(tn)) s += 30;
        if (hit.syncedLyrics) s += 40;
        if (artist && an.includes(norm(artist).split(' ')[0])) s += 20;
        return s;
    }

    function bestOf(arr) {
        if (!Array.isArray(arr) || !arr.length) return null;
        return [...arr].sort((a, b) => score(b) - score(a))[0];
    }

    const candidates = [{ t: track, a: artist }, { t: track, a: '' }];
    const simplified = track.replace(/purana|reprise|remix|acoustic|slowed|reverb|version|new version/gi, '').trim();
    if (simplified && simplified !== track) {
        candidates.push({ t: simplified, a: artist }, { t: simplified, a: '' });
    }

    for (const c of candidates) {
        if (!c.t) continue;
        if (c.a) {
            const p = new URLSearchParams({ track_name: c.t, artist_name: c.a });
            const gr = await fetchLrclib(`/api/get?${p}`);
            if (gr.status === 200 && gr.json?.syncedLyrics) return gr.json;
        }

        const sr = await fetchLrclib(`/api/search?${new URLSearchParams({ track_name: c.t })}`);
        if (sr.status === 200 && Array.isArray(sr.json) && sr.json.length) {
            const hit = bestOf(sr.json);
            if (hit && (hit.syncedLyrics || hit.plainLyrics)) return hit;
        }

        const qr = await fetchLrclib(`/api/search?${new URLSearchParams({ q: `${c.t} ${c.a}`.trim() })}`);
        if (qr.status === 200 && Array.isArray(qr.json) && qr.json.length) {
            const hit = bestOf(qr.json);
            if (hit && (hit.syncedLyrics || hit.plainLyrics)) return hit;
        }
    }

    return null;
}

app.post('/lyrics', async (req, res) => {
    try {
        const { track, artist } = req.body;
        const hit = await getLyrics(track || '', artist || '');
        res.json(hit || { error: 'No lyrics found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ ok: true, port: PORT });
});

app.get('/', (req, res) => {
    res.json({ status: 'online', service: 'DDT Local Music Relay Server', port: PORT });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`🎵 DDT Music Relay Server running at http://127.0.0.1:${PORT}`);
});
