/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { MessageActions } from "@webpack/common";

const logger = new Logger("DDT:ChatStats");

interface ChatStats {
    totalMessagesSent: number;
    channelCounts: Record<string, number>;
}

const stats: ChatStats = {
    totalMessagesSent: 0,
    channelCounts: {},
};

export default definePlugin({
    name: "DDTChatStats",
    description: "Tracks your chat analytics locally and provides a /mystats command.",
    authors: [Devs.Ven],
    tags: ["Chat"],
    enabledByDefault: false,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: { author?: { id: string }; channel_id: string }; optimistic?: boolean }) {
            // Only count optimistic (sent by local client) or sent by current user
            if (optimistic) {
                stats.totalMessagesSent++;
                const channelId = message.channel_id;
                stats.channelCounts[channelId] = (stats.channelCounts[channelId] || 0) + 1;
            }
        }
    },

    commands: [{
        name: "mystats",
        description: "View your local chat statistics for this session",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => {
            const topChannels = Object.entries(stats.channelCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([id, count], index) => `${index + 1}. <#${id}> - **${count}** messages`)
                .join("\n");

            const content = `📊 **DDT Chat Analytics (This Session)** 📊\n\n` +
                `💬 **Total Messages Sent:** ${stats.totalMessagesSent}\n\n` +
                `🔥 **Top Channels:**\n${topChannels || "_No messages tracked yet in this session._"}`;

            return { content };
        }
    }],

    start() {
        logger.info("DDTChatStats started");
    },

    stop() {
        logger.info("DDTChatStats stopped");
    },
});
