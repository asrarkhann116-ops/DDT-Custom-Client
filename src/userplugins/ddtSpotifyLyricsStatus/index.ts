/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { getLyrics } from "@userplugins/musicControls/spotify/lyrics/api";
import type { SyncedLyric } from "@userplugins/musicControls/spotify/lyrics/providers/types";

import type { SpotifyTrack } from "@vencord/discord-types";
import { SpotifyStore as DiscordSpotifyStore, FluxDispatcher } from "@webpack/common";

const logger = new Logger("DDT:SpotifyLyricsStatus");

interface CustomStatusSetting {
    createdAtMs?: string;
    emojiId: string;
    emojiName: string;
    expiresAtMs: string;
    text: string;
}

const CustomStatusSettings = getUserSettingLazy<CustomStatusSetting | null>("status", "customStatus");

// --- Module State ---
let originalStatus: CustomStatusSetting | null = null;
let currentTrackId: string | null = null;
let syncedLyrics: SyncedLyric[] = [];
let lyricIntervalId: ReturnType<typeof setInterval> | undefined;
let statusUpdateInFlight = false;
let enabled = false;

const settings = definePluginSettings({
    prefix: {
        type: OptionType.STRING,
        description: "Emoji or text prefix before the lyric (e.g. '🎵')",
        default: "♪ 💀🍷",
        restartNeeded: false,
    },
    restoreOnStop: {
        type: OptionType.BOOLEAN,
        description: "Restore your original status when the song stops/pauses",
        default: true,
        restartNeeded: false,
    },
});

// --- Helpers ---

function backupCurrentStatus() {
    if (!CustomStatusSettings) return;
    const current = CustomStatusSettings.getSetting();
    // Only backup if it's not already a lyric we wrote
    originalStatus = current ?? null;
}

async function setStatus(text: string) {
    if (!CustomStatusSettings || statusUpdateInFlight) return;
    statusUpdateInFlight = true;
    try {
        const current = CustomStatusSettings.getSetting();
        await CustomStatusSettings.updateSetting({
            text: text.slice(0, 128),
            emojiId: current?.emojiId ?? "0",
            emojiName: current?.emojiName ?? "",
            expiresAtMs: "0",
            createdAtMs: String(Date.now()),
        });
    } catch (e) {
        logger.error("Failed to update status:", e);
    } finally {
        statusUpdateInFlight = false;
    }
}

async function restoreStatus() {
    if (!CustomStatusSettings) return;
    try {
        await CustomStatusSettings.updateSetting(
            originalStatus ?? { text: "", emojiId: "0", emojiName: "", expiresAtMs: "0" }
        );
    } catch (e) {
        logger.error("Failed to restore status:", e);
    }
    originalStatus = null;
}

function getCurrentLyric(positionMs: number): string | undefined {
    if (!syncedLyrics.length) return undefined;
    const positionSec = positionMs / 1000;

    let currentLine: SyncedLyric | undefined;
    for (const line of syncedLyrics) {
        if (line.time <= positionSec) {
            currentLine = line;
        } else {
            break;
        }
    }

    return currentLine?.text?.trim() || undefined;
}

function tickLyrics() {
    if (!enabled || !currentTrackId) return;

    const activity = DiscordSpotifyStore.getActivity();
    if (!activity?.timestamps?.start) return;

    const positionMs = Date.now() - activity.timestamps.start;
    const lyric = getCurrentLyric(positionMs);

    if (lyric) {
        const prefix = settings.store.prefix;
        const statusText = prefix ? `${prefix} ${lyric}` : lyric;
        setStatus(statusText);
    }
}

async function startSyncForTrack(track: SpotifyTrack) {
    if (track.id === currentTrackId) return; // Already synced for this track

    logger.info("Starting lyrics sync for track:", track.name);
    stopSync(false); // Stop previous track without restoring status yet
    currentTrackId = track.id;
    backupCurrentStatus();
    syncedLyrics = [];

    try {
        // Build the lrclib-compatible track object
        const lyricsTrack = {
            ...track,
            album: {
                ...track.album,
                image: track.album.image ?? { height: 0, width: 0, url: "" }
            },
            artists: track.artists.map(a => ({
                ...a,
                href: "",
                type: "artist" as const,
                uri: `spotify:artist:${a.id}`
            }))
        };

        const result = await getLyrics(lyricsTrack);
        if (!result) {
            logger.warn("No lyrics found for:", track.name);
            return;
        }

        // Pick the best lyric version (synced preferred over unsynced)
        const lines = result.lyricsVersions[result.useLyric]
            ?.filter(l => l.text?.trim())
            .sort((a, b) => a.time - b.time) ?? [];

        if (!lines.length) {
            logger.warn("Empty lyrics for:", track.name);
            return;
        }

        syncedLyrics = lines;
        logger.info(`Loaded ${lines.length} lyric lines for "${track.name}"`);

        // Start the polling interval (every 2s is safe for Discord rate limits)
        lyricIntervalId = setInterval(tickLyrics, 2000);
        tickLyrics(); // immediate first tick

    } catch (e) {
        logger.error("Failed to load lyrics:", e);
    }
}

function stopSync(restore = true) {
    if (lyricIntervalId !== undefined) {
        clearInterval(lyricIntervalId);
        lyricIntervalId = undefined;
    }
    syncedLyrics = [];
    currentTrackId = null;

    if (restore && settings.store.restoreOnStop) {
        restoreStatus();
    }
}

// --- Flux event handler ---
function onSpotifyPlayerState({ isPlaying, track }: { isPlaying?: boolean; track?: SpotifyTrack | null; }) {
    if (!enabled) return;

    if (isPlaying && track?.id) {
        startSyncForTrack(track);
    } else {
        stopSync(true);
    }
}

export default definePlugin({
    name: "DDTSpotifyLyricsStatus",
    description: "Syncs your Spotify lyrics to your Discord custom status in real-time. Restores your original status when the song stops.",
    authors: [Devs.Ven],
    tags: ["Voice"],
    enabledByDefault: false,
    settings,

    start() {
        enabled = true;
        FluxDispatcher.subscribe("SPOTIFY_PLAYER_STATE", onSpotifyPlayerState);

        // Bootstrap: check if already playing
        const track = DiscordSpotifyStore.getTrack();
        const activity = DiscordSpotifyStore.getActivity();
        if (track && activity) {
            startSyncForTrack(track);
        }
    },

    stop() {
        enabled = false;
        FluxDispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", onSpotifyPlayerState);
        stopSync(true);
    },
});
