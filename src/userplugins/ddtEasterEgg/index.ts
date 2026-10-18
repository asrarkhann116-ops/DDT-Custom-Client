/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

const presetQuotes = [
    "The founder of DDT has a beautiful girlfriend <3",
    "Real mens use DDT. Everyone else is just an NPC.",
    "DDT Client: Because standard Discord has zero aura.",
    "Aura levels exceeding maximum capacity... Please wait.",
    "OnePlus, Vivo & IQOO Phones are better than iPhone & Samsung. Really? Who Said ,Deal with it.",
    "Did you know that you can share your screen at rates above 60 Hz with BetterScreenshare?",
    "Don't use Brave, chrome sucks its pp when it comes to privacy.",
    "They told me to touch grass. I touched the DDT source code instead.",
    "You dropped this 👑, king. Welcome back.",
    "Discord is spying on us, but DDT has too much aura to care.",
    "Why be normal when you can be a DDT user?",
    "Giga-chad mode activated. Loading...",
    "Wait, are you still using normal Vencord? Cringe."
];

const settings = definePluginSettings({
    additionalQuotes: {
        type: OptionType.STRING,
        description: "Add more random quotes, one per line.",
        default: "",
        multiline: true
    }
});

export default definePlugin({
    name: "DDTEasterEgg",
    description: "Shows random DDT jokes under Did you know while loading.",
    authors: [Devs.irritably],
    tags: ["Fun"],
    enabledByDefault: true,
    settings,
    
    commands: [{
        name: "aura",
        description: "Perform a highly accurate DDT Aura Check",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, { channel }) {
            const auras = [
                "Aura check: -9999 (Bro uses light mode)",
                "Aura check: +10,000 (Giga Chad levels)",
                "Aura check: 0 (NPC detected)",
                "Aura check: +999,999 (Phantom Operator / DDT Enjoyer)",
                "Aura check: ERROR (Aura Overflow)",
                "Aura check: -100 (Still uses default discord client)",
                "Aura check: +500 (Has a beautiful girlfriend <3)"
            ];
            const result = auras[Math.floor(Math.random() * auras.length)];
            sendMessage(channel.id, { content: result });
        }
    }],

    patches: [{
        find: "#{intl::LOADING_DID_YOU_KNOW}",
        replacement: [
            {
                match: /(?<=_loadingText=\(function\(\)\{)/,
                replace: "return $self.getQuote();"
            },
            {
                match: /(?<=_eventLoadingText=\(function\(\)\{)/,
                replace: "return $self.getQuote();",
                noWarn: true
            }
        ]
    }],

    getQuote() {
        const additionalQuotes = settings.store.additionalQuotes.split("\n").map((quote: string) => quote.trim()).filter(Boolean);
        const quotes = [...presetQuotes, ...additionalQuotes];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
});
