/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { state } from "@userplugins/yMusicSync.desktop/native/state";
import type { PlayerDevice } from "@userplugins/yMusicSync.desktop/types";

import { STATION_PREFIX } from "./constants";

export function stationDevices(): PlayerDevice[] {
    return state.stations.map(station => ({
        id: `${STATION_PREFIX}${station.deviceId}`,
        title: station.name || station.deviceId,
        canBePlayer: true
    }));
}
