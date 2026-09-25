/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2025 DDT Development Team and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const SpoofingSpeedMode = {
    BALANCED: "balanced",
    SPEEDRUN: "speedrun",
    STEALTH: "stealth",
} as const;

export type SpoofingSpeedMode = (typeof SpoofingSpeedMode)[keyof typeof SpoofingSpeedMode];

export interface SpoofingProfile {
    video: {
        maxFuture: number;
        speed: number;
        interval: number;
    };
    playActivity: {
        intervalMs: number;
    };
}
