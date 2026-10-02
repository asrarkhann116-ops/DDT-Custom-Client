/*
 * DDT Custom Client - Theme Manager
 * Copyright (c) 2024 DDT Team
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { THEME_FILES, THEME_NAMES } from "./themeList";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable DDT Theme Manager",
        default: true
    },
    selectedTheme: {
        type: OptionType.SELECT,
        description: "Select Theme (112 themes available)",
        options: THEME_NAMES
    },
    customCSS: {
        type: OptionType.STRING,
        description: "Custom CSS (Advanced)",
        default: "",
        placeholder: "/* Your custom CSS here */"
    }
});

let styleElement: HTMLStyleElement | null = null;

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/asrarkhann116-ops/DDT-Custom-Client/main/src/userplugins/developerTheme/themes/";

async function loadThemeFromGitHub(filename: string): Promise<string> {
    try {
        const url = GITHUB_RAW_URL + encodeURIComponent(filename);
        console.log(`[DDT Theme] Loading theme from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const cssContent = await response.text();
        return cssContent;
    } catch (error) {
        console.error(`[DDT Theme] Failed to load theme "${filename}":`, error);
        return "";
    }
}

function getDefaultDDTTheme(): string {
    return `
/* DDT Custom Client - Default Theme */

:root {
    /* DDT Brand Colors */
    --ddt-accent-primary: #a855f7;
    --ddt-accent-secondary: #9333ea;
    --ddt-accent-glow: rgba(168, 85, 247, 0.5);
    
    /* Override Discord brand colors */
    --brand-experiment: var(--ddt-accent-primary) !important;
    --brand-experiment-560: var(--ddt-accent-secondary) !important;
    
    /* Custom backgrounds */
    --ddt-bg-primary: #0f0f0f;
    --ddt-bg-secondary: #1a1a1a;
    --ddt-bg-tertiary: #252525;
    
    /* Custom text colors */
    --ddt-text-primary: #e5e5e5;
    --ddt-text-secondary: #a3a3a3;
    
    /* Code font */
    --ddt-font-code: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
}

/* Custom Scrollbar */
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

/* Glow Effects */
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

/* Code blocks styling */
code,
pre,
[class*="codeblock"] {
    font-family: var(--ddt-font-code) !important;
    background: var(--ddt-bg-tertiary) !important;
    border-left: 3px solid var(--ddt-accent-primary) !important;
}

/* Toggle switches */
[class*="switch"][class*="checked"] {
    background-color: var(--ddt-accent-primary) !important;
}

/* Selection highlight */
::selection {
    background: var(--ddt-accent-primary);
    color: #ffffff;
}

/* DDT Branding */
.vc-toolbox-btn:hover .vc-toolbox-icon {
    color: var(--ddt-accent-secondary);
    filter: drop-shadow(0 0 5px var(--ddt-accent-glow));
}

/* Plugin cards */
[class*="pluginCard"] {
    border-left: 3px solid var(--ddt-accent-primary);
    transition: all 0.2s ease;
}

[class*="pluginCard"]:hover {
    transform: translateX(5px);
    box-shadow: -5px 0 15px var(--ddt-accent-glow);
}
`;
}

async function applyTheme() {
    try {
        // Safe check for settings
        if (!settings?.store?.enabled) {
            removeTheme();
            return;
        }

        removeTheme();
        
        const selectedTheme = settings?.store?.selectedTheme || "none";
        const customCSS = settings?.store?.customCSS || "";
        
        let themeCSS = "";
        
        // Load theme based on selection
        if (selectedTheme === "none") {
            themeCSS = getDefaultDDTTheme();
        } else {
            const filename = THEME_FILES[selectedTheme];
            if (filename) {
                themeCSS = await loadThemeFromGitHub(filename);
                
                // Fallback to default if loading failed
                if (!themeCSS || themeCSS.trim() === "") {
                    console.warn(`[DDT Theme] Failed to load "${selectedTheme}", using default`);
                    themeCSS = getDefaultDDTTheme();
                }
            } else {
                console.warn(`[DDT Theme] Theme "${selectedTheme}" not found, using default`);
                themeCSS = getDefaultDDTTheme();
            }
        }
        
        // Append custom CSS if provided
        if (customCSS && customCSS.trim() !== "") {
            themeCSS += "\n\n/* User Custom CSS */\n" + customCSS;
        }
        
        styleElement = document.createElement("style");
        styleElement.id = "ddt-theme-manager";
        styleElement.textContent = themeCSS;
        document.head.appendChild(styleElement);
        
        console.log(`[DDT Theme] Applied theme: ${selectedTheme}`);
    } catch (error) {
        console.error("[DDT Theme] Failed to apply theme:", error);
        // Apply default theme as fallback
        try {
            removeTheme();
            styleElement = document.createElement("style");
            styleElement.id = "ddt-theme-manager";
            styleElement.textContent = getDefaultDDTTheme();
            document.head.appendChild(styleElement);
            console.log("[DDT Theme] Applied fallback default theme");
        } catch (fallbackError) {
            console.error("[DDT Theme] Fallback also failed:", fallbackError);
        }
    }
}

function removeTheme() {
    try {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
        
        // Also remove any old theme elements
        const oldElements = document.querySelectorAll("#ddt-theme-manager, #discord-developer-tools-theme");
        oldElements.forEach(el => el.remove());
    } catch (error) {
        console.error("[DDT Theme] Failed to remove theme:", error);
    }
}

export default definePlugin({
    name: "DDTThemeManager",
    description: "DDT Theme Manager - Choose from 112 professional Discord themes loaded from GitHub",
    authors: [Devs.Ven],
    tags: ["Customisation"],

    settings,

    start() {
        try {
            // Apply theme after a small delay to ensure DOM is ready
            setTimeout(() => {
                applyTheme();
                console.log("[DDT Theme] Started");
                console.log(`[DDT Theme] Current theme: ${settings?.store?.selectedTheme || "none"}`);
                console.log(`[DDT Theme] Available themes: 112`);
            }, 1000);
        } catch (error) {
            console.error("[DDT Theme] Failed to start:", error);
        }
    },

    stop() {
        try {
            removeTheme();
            console.log("[DDT Theme] Stopped");
        } catch (error) {
            console.error("[DDT Theme] Failed to stop:", error);
        }
    }
});
