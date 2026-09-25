# DDT Music Relay Server (Local Companion)

A lightweight local proxy that runs on `localhost:3124`. It uses `yt-dlp` to extract YouTube audio URLs and streams them with proper CORS headers so the DDT Music Visualizer plugin can play audio with real-time visualization.

## Setup (One-Time)

### 1. Install Node.js dependencies

```bash
cd src/userplugins/musicVisualizer/music-relay-server
npm install
```

### 2. Get yt-dlp

**Option A (Recommended):** Place `yt-dlp.exe` (Windows) directly in this `music-relay-server/` folder.  
Download from: https://github.com/yt-dlp/yt-dlp/releases/latest

**Option B:** Install `yt-dlp` globally so it's available in your system PATH:
```bash
pip install yt-dlp
# or
winget install yt-dlp
```

## Running

The server starts automatically when the DDT Music Visualizer plugin loads (via `native.ts`).  

To run manually for debugging:
```bash
node server.js
```

Server will be available at `http://127.0.0.1:3124`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/audio` | Extract audio URL for a YouTube video ID |
| `GET` | `/stream/:videoId` | Stream audio with CORS headers for browser playback |
| `POST` | `/lyrics` | Fetch synced lyrics from lrclib.net |
| `GET` | `/` | Health check |
