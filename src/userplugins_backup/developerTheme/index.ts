/*
 * Discord Developer Tools
 * Copyright (c) 2024 Discord Developer Tools Team
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Developer Theme",
        default: true
    },
    accentColor: {
        type: OptionType.SELECT,
        description: "Accent color scheme",
        options: [
            { label: "Cyberpunk Purple", value: "purple", default: true },
            { label: "Matrix Green", value: "green" },
            { label: "Terminal Blue", value: "blue" },
            { label: "Hacker Red", value: "red" },
            { label: "Gold", value: "gold" }
        ]
    },
    codeFont: {
        type: OptionType.BOOLEAN,
        description: "Use monospace font for Discord Developer Tools branding",
        default: true
    },
    glowEffects: {
        type: OptionType.BOOLEAN,
        description: "Enable glow effects on interactive elements",
        default: true
    },
    customScrollbar: {
        type: OptionType.BOOLEAN,
        description: "Custom styled scrollbars",
        default: true
    }
});

const ACCENT_COLORS = {
    purple: {
        primary: "#a855f7",
        secondary: "#9333ea",
        glow: "rgba(168, 85, 247, 0.5)"
    },
    green: {
        primary: "#10b981",
        secondary: "#059669",
        glow: "rgba(16, 185, 129, 0.5)"
    },
    blue: {
        primary: "#3b82f6",
        secondary: "#2563eb",
        glow: "rgba(59, 130, 246, 0.5)"
    },
    red: {
        primary: "#ef4444",
        secondary: "#dc2626",
        glow: "rgba(239, 68, 68, 0.5)"
    },
    gold: {
        primary: "#f59e0b",
        secondary: "#d97706",
        glow: "rgba(245, 158, 11, 0.5)"
    }
};

function getThemeCSS(): string {
    const accent = ACCENT_COLORS[settings.store.accentColor as keyof typeof ACCENT_COLORS];
    
    return `
/* Discord Developer Tools - Custom Theme */

:root {
    /* Custom Accent Colors */
    --ddt-accent-primary: ${accent.primary};
    --ddt-accent-secondary: ${accent.secondary};
    --ddt-accent-glow: ${accent.glow};
    
    /* Override Discord brand colors */
    --brand-experiment: var(--ddt-accent-primary) !important;
    --brand-experiment-560: var(--ddt-accent-secondary) !important;
    
    /* Custom backgrounds */
    --ddt-bg-primary: #0f0f0f;
    --ddt-bg-secondary: #1a1a1a;
    --ddt-bg-tertiary: #252525;
    --ddt-bg-accent: rgba(168, 85, 247, 0.1);
    
    /* Custom text colors */
    --ddt-text-primary: #e5e5e5;
    --ddt-text-secondary: #a3a3a3;
    --ddt-text-muted: #737373;
    --ddt-text-accent: var(--ddt-accent-primary);
    
    /* Code font */
    --ddt-font-code: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
}

/* Custom Scrollbar */
${settings.store.customScrollbar ? `
::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

::-webkit-scrollbar-track {
    background: var(--ddt-bg-secondary);
    border-radius: 8px;
}

::-webkit-scrollbar-thumb {
    background: var(--ddt-accent-primary);
    border-radius: 8px;
    border: 2px solid var(--ddt-bg-secondary);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--ddt-accent-secondary);
    box-shadow: 0 0 10px var(--ddt-accent-glow);
}

::-webkit-scrollbar-corner {
    background: var(--ddt-bg-secondary);
}
` : ''}

/* Developer Tools Branding */
${settings.store.codeFont ? `
/* Apply code font to specific elements */
[class*="discord-developer-tools"],
[class*="ddt-"],
.vc-toolbox-btn,
[aria-label*="Developer Tools"],
[aria-label*="DevTools"] {
    font-family: var(--ddt-font-code) !important;
    letter-spacing: 0.5px;
}
` : ''}

/* Glow Effects */
${settings.store.glowEffects ? `
/* Buttons with glow */
button[class*="colorBrand"]:hover,
button[class*="lookFilled"]:hover {
    box-shadow: 0 0 15px var(--ddt-accent-glow),
                0 0 30px var(--ddt-accent-glow);
    transform: translateY(-1px);
    transition: all 0.2s ease;
}

/* Input fields glow on focus */
input:focus,
textarea:focus,
[contenteditable="true"]:focus {
    box-shadow: 0 0 10px var(--ddt-accent-glow) !important;
    border-color: var(--ddt-accent-primary) !important;
}

/* Active tab glow */
[role="tab"][aria-selected="true"] {
    box-shadow: 0 2px 0 var(--ddt-accent-primary),
                0 0 10px var(--ddt-accent-glow);
}

/* Toolbox button glow */
.vc-toolbox-btn[class*="selected"] {
    box-shadow: 0 0 10px var(--ddt-accent-glow) !important;
}
` : ''}

/* Custom Panel Styling */
[class*="devToolsPanel"] {
    background: var(--ddt-bg-primary);
    border: 1px solid var(--ddt-accent-primary);
    border-radius: 8px;
}

/* Code blocks styling */
code,
pre,
[class*="codeblock"],
[class*="codeLine"] {
    font-family: var(--ddt-font-code) !important;
    background: var(--ddt-bg-tertiary) !important;
    border-left: 3px solid var(--ddt-accent-primary) !important;
}

/* Settings panels */
[class*="contentColumn"] {
    background: var(--ddt-bg-primary);
}

/* Modals */
[class*="modal"] {
    background: var(--ddt-bg-secondary);
    border: 1px solid var(--ddt-accent-primary);
}

/* Cards and containers */
[class*="card"],
[class*="container"] {
    background: var(--ddt-bg-secondary);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 6px;
}

/* Accent borders */
[class*="topPill"],
[class*="item"]:hover {
    border-color: var(--ddt-accent-primary) !important;
}

/* Plugin cards in settings */
[class*="pluginCard"] {
    background: var(--ddt-bg-tertiary);
    border-left: 3px solid var(--ddt-accent-primary);
    transition: all 0.2s ease;
}

[class*="pluginCard"]:hover {
    transform: translateX(5px);
    box-shadow: -5px 0 15px var(--ddt-accent-glow);
}

/* Toggle switches */
[class*="switch"][class*="checked"] {
    background-color: var(--ddt-accent-primary) !important;
}

/* Context menus */
[class*="menu"],
[class*="submenu"] {
    background: var(--ddt-bg-secondary);
    border: 1px solid var(--ddt-accent-primary);
}

[class*="menuItem"]:hover {
    background: var(--ddt-bg-accent) !important;
}

/* Tooltips */
[class*="tooltip"] {
    background: var(--ddt-bg-tertiary);
    border: 1px solid var(--ddt-accent-primary);
    box-shadow: 0 0 10px var(--ddt-accent-glow);
}

/* Loading spinners */
[class*="spinner"] {
    color: var(--ddt-accent-primary);
}

/* Progress bars */
[class*="progress"] [class*="bar"] {
    background: linear-gradient(90deg, 
        var(--ddt-accent-secondary), 
        var(--ddt-accent-primary));
}

/* Selection highlight */
::selection {
    background: var(--ddt-accent-primary);
    color: #ffffff;
}

/* Custom animations */
@keyframes ddt-pulse {
    0%, 100% {
        opacity: 1;
        box-shadow: 0 0 5px var(--ddt-accent-glow);
    }
    50% {
        opacity: 0.8;
        box-shadow: 0 0 20px var(--ddt-accent-glow);
    }
}

/* Apply pulse to active indicators */
[class*="online"],
[class*="active"],
[class*="streaming"] {
    animation: ddt-pulse 2s ease-in-out infinite;
}

/* Terminal/Console style for developer tools */
.ddt-console,
.ddt-terminal {
    background: #0a0a0a;
    color: var(--ddt-accent-primary);
    font-family: var(--ddt-font-code);
    padding: 15px;
    border-radius: 6px;
    border: 1px solid var(--ddt-accent-primary);
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

/* Custom badge for DevTools */
[class*="badge"][aria-label*="Developer"] {
    background: var(--ddt-accent-primary) !important;
    color: #000 !important;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* Enhance Vencord toolbox button */
.vc-toolbox-icon {
    color: var(--ddt-accent-primary);
    transition: all 0.2s ease;
}

.vc-toolbox-btn:hover .vc-toolbox-icon {
    color: var(--ddt-accent-secondary);
    filter: drop-shadow(0 0 5px var(--ddt-accent-glow));
}

/* Status indicators */
[class*="status"] {
    border: 2px solid var(--ddt-accent-primary);
}

/* Search bars */
[type="search"],
[class*="searchBar"] {
    background: var(--ddt-bg-tertiary);
    border: 1px solid var(--ddt-accent-primary);
    color: var(--ddt-text-primary);
}

/* Dividers */
[class*="divider"],
hr {
    background: linear-gradient(90deg,
        transparent,
        var(--ddt-accent-primary),
        transparent);
    height: 2px;
    border: none;
}

/* Enhance text inputs */
input[type="text"],
input[type="number"],
textarea {
    background: var(--ddt-bg-tertiary);
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: var(--ddt-text-primary);
    transition: all 0.2s ease;
}

/* Custom select dropdowns */
select,
[class*="select"] {
    background: var(--ddt-bg-tertiary);
    border: 1px solid var(--ddt-accent-primary);
    color: var(--ddt-text-primary);
}

/* Checkboxes */
[type="checkbox"]:checked {
    background: var(--ddt-accent-primary);
    border-color: var(--ddt-accent-primary);
}

/* Radio buttons */
[type="radio"]:checked {
    background: var(--ddt-accent-primary);
    border-color: var(--ddt-accent-primary);
}

/* Custom header for DevTools */
.ddt-header {
    background: linear-gradient(135deg, 
        var(--ddt-bg-secondary), 
        var(--ddt-bg-tertiary));
    border-bottom: 2px solid var(--ddt-accent-primary);
    padding: 15px;
    font-family: var(--ddt-font-code);
    font-weight: bold;
    color: var(--ddt-accent-primary);
    text-shadow: 0 0 10px var(--ddt-accent-glow);
}

/* Easter egg: Matrix rain effect on hover (subtle) */
@keyframes matrix-rain {
    0% { transform: translateY(-100%); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(100%); opacity: 0; }
}

/* Accessibility: Ensure readable contrast */
[class*="text"] {
    color: var(--ddt-text-primary);
}

/* Print styles */
@media print {
    * {
        background: white !important;
        color: black !important;
        box-shadow: none !important;
    }
}
`;
}

let styleElement: HTMLStyleElement | null = null;

function applyTheme() {
    if (!settings.store.enabled) {
        removeTheme();
        return;
    }

    removeTheme();
    
    styleElement = document.createElement("style");
    styleElement.id = "discord-developer-tools-theme";
    styleElement.textContent = getThemeCSS();
    document.head.appendChild(styleElement);
    
    console.log("[Developer Theme] Applied custom theme");
}

function removeTheme() {
    if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }
}

export default definePlugin({
    name: "DeveloperTheme",
    description: "Custom developer-focused dark theme with code aesthetics, glow effects, and customizable accent colors",
    authors: [Devs.Ven],
    tags: ["Theme", "Developer", "UI", "Customization"],

    settings,

    start() {
        applyTheme();
        
        // Re-apply theme when settings change
        settings.store.onChange = applyTheme;
        
        console.log("[Developer Theme] Started");
        console.log(`[Developer Theme] Accent: ${settings.store.accentColor}`);
    },

    stop() {
        removeTheme();
        console.log("[Developer Theme] Stopped");
    }
});
