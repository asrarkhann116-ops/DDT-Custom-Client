/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { User } from "@vencord/discord-types";
import { Text } from "@webpack/common";

import { getProfile } from "./api";

const SONG_SERVICES: Record<string, string> = {
    "open.spotify.com": "Spotify",
    "youtube.com": "YouTube",
    "www.youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "music.youtube.com": "YouTube Music",
    "soundcloud.com": "SoundCloud",
    "music.apple.com": "Apple Music"
};

function songLabel(song: string) {
    const service = SONG_SERVICES[new URL(song).hostname];
    return service ? `Listen on ${service}` : "Listen";
}

function ProfileCard({ user }: { user: User; }) {
    const profile = getProfile(user.id);
    if (!profile?.bio && !profile?.song) return null;

    return (
        <div className="vc-ddtpp-card" style={profile.accent ? { borderColor: profile.accent } : undefined}>
            {profile.bio && <Text variant="text-sm/normal">{profile.bio}</Text>}
            {profile.song && (
                <a className="vc-ddtpp-song" href={profile.song} target="_blank" rel="noreferrer">
                    {"\u{1F3B5} "}{songLabel(profile.song)}
                </a>
            )}
        </div>
    );
}

export default ErrorBoundary.wrap(ProfileCard, { noop: true });
