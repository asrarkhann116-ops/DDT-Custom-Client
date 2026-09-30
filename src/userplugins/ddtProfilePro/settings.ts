/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    apiUrl: {
        type: OptionType.STRING,
        description: "Profile Pro worker URL (e.g. https://ddt-profile-pro.you.workers.dev)",
        default: "",
        restartNeeded: true
    },
    clientId: {
        type: OptionType.STRING,
        description: "Discord application Client ID used for login",
        default: ""
    },
    nitroFirst: {
        type: OptionType.BOOLEAN,
        description: "Prefer the Nitro banner over the Profile Pro background when a user has both",
        default: true
    }
});
