/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const presetQuotes = [
    "The founder of DDT has a beautiful girlfriend <3",
    "Discord is spying on us, but DDT is spying on Discord.",
    "Telegram is fedded, Signal is glowing, DDT is the only safe haven.",
    "The user of this client has been reported to the nearest law enforcement authorities for participating in violent or unauthorized activities.",
    "OnePlus, Vivo & IQOO Phones are better than iPhone & Samsung. Deal with it.",
    "Behave yourself. The Phantom Protocol is watching you.",
    "Did you know that you can share your screen at rates above 60 Hz with BetterScreenshare?",
    "Don't use Brave it sucks when it comes to privacy.",
    "DDT Client: Because standard Discord wasn't lethal enough.",
    "AMSI bypassed. EDR blinded. Discord loaded.",
    "If they can't see us, they can't stop us. Welcome to DDT.",
    "Your IP address has been logged. Preparing automated strike... Just kidding.",
    "Light mode users will be banned on sight.",
    "We don't ask for permission. We take access.",
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
