/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { openFarmDashboardModal } from "./FarmDashboardModal";

// Minimalist Sprout / Farm SVG Icon (No emojis)
function FarmIcon() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 20h10" />
            <path d="M10 20c5.5-2.5.8-6.4 3-10" />
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
    );
}

const settings = definePluginSettings({
    apiServer: {
        type: OptionType.STRING,
        default: "https://xploit-hub-members-production.up.railway.app",
        description: "Xploit Hub Farm API Server URL (Backend)",
    },
    showInHeaderBar: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Xploit Farm Quick Launcher Button in Discord Title/Header Bar",
    }
});

function XploitHeaderButton() {
    const { apiServer } = settings.use(["apiServer"]);

    return (
        <HeaderBarButton
            className="ddt-farm-header-btn"
            tooltip="Xploit Member Farm Hub"
            icon={() => <FarmIcon />}
            onClick={() => openFarmDashboardModal(apiServer)}
        />
    );
}

export default definePlugin({
    name: "XploitFarm",
    description: "Official DDT client integration for Xploit HUB OAuth Member Farm with 3-Layer Auth, unbypassable cooldowns & realtime stock.",
    authors: [
        {
            name: "Asrar",
            id: 1104652354655113268n
        }
    ],

    dependencies: ["HeaderBarAPI"],

    settings,

    headerBarButton: {
        icon: () => <FarmIcon />,
        render: XploitHeaderButton,
        priority: 1338
    },

    toolboxActions: {
        "Open Xploit Farm Hub": () => {
            const apiServer = settings.store.apiServer || "https://xploit-hub-members-production.up.railway.app";
            openFarmDashboardModal(apiServer);
        }
    }
});
