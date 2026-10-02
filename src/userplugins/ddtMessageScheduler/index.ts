/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { sendMessage } from "@utils/discord";

const logger = new Logger("DDT:MessageScheduler");

const settings = definePluginSettings({
    notifyOnSend: {
        type: OptionType.BOOLEAN,
        description: "Log when a scheduled message is sent",
        default: true,
        restartNeeded: false,
    },
});

interface ScheduledMessage {
    id: string;
    channelId: string;
    content: string;
    sendAt: number;
    timeoutId: ReturnType<typeof setTimeout>;
}

let scheduledMessages: ScheduledMessage[] = [];

function scheduleMessage(channelId: string, content: string, delayMinutes: number) {
    const delayMs = delayMinutes * 60 * 1000;
    const sendAt = Date.now() + delayMs;
    const id = Math.random().toString(36).substring(2, 9);

    const timeoutId = setTimeout(() => {
        try {
            sendMessage(channelId, { content });
            if (settings.store.notifyOnSend) {
                logger.info(`Scheduled message sent to channel ${channelId}`);
            }
        } catch (e) {
            logger.error("Failed to send scheduled message:", e);
        } finally {
            scheduledMessages = scheduledMessages.filter(m => m.id !== id);
        }
    }, delayMs);

    scheduledMessages.push({
        id,
        channelId,
        content,
        sendAt,
        timeoutId
    });

    return { id, sendAt };
}

export default definePlugin({
    name: "DDTMessageScheduler",
    description: "Schedule messages to be sent later using /schedule.",
    authors: [Devs.Ven],
    tags: ["Chat"],
    enabledByDefault: false,
    settings,

    commands: [{
        name: "schedule",
        description: "Schedule a message to be sent later",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "minutes",
                description: "Delay in minutes before sending",
                type: ApplicationCommandOptionType.INTEGER,
                required: true
            },
            {
                name: "message",
                description: "The message to send",
                type: ApplicationCommandOptionType.STRING,
                required: true
            }
        ],
        execute: (args, ctx) => {
            const minutes = Number(findOption(args, "minutes", 0));
            const message = String(findOption(args, "message", ""));

            if (!minutes || minutes <= 0 || !message) {
                return {
                    content: "⚠️ Invalid arguments. Please provide minutes > 0 and a non-empty message."
                };
            }

            const { sendAt } = scheduleMessage(ctx.channel.id, message, minutes);
            const timeString = new Date(sendAt).toLocaleTimeString();

            return {
                content: `⏳ **Scheduled!** Message will be sent at **${timeString}** in this channel.\n\n> ${message}`
            };
        }
    }],

    start() {
        logger.info("DDTMessageScheduler started");
    },

    stop() {
        scheduledMessages.forEach(m => clearTimeout(m.timeoutId));
        scheduledMessages = [];
        logger.info("DDTMessageScheduler stopped, all pending scheduled messages cleared");
    },
});
