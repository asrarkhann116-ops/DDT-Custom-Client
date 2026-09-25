/*
 * Discord Developer Tools
 * Copyright (c) 2024 Discord Developer Tools Team
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher, UserStore } from "@webpack/common";

interface StoredAccount {
    id: string;
    token: string;
    username: string;
    discriminator: string;
    avatar?: string;
    email?: string;
    phone?: string;
    addedAt: number;
    lastUsed?: number;
    notes?: string;
}

interface TokenManagerState {
    accounts: Map<string, StoredAccount>;
    currentToken: string | null;
}

const STORAGE_KEY = "DiscordDevTools_TokenManager";

const state: TokenManagerState = {
    accounts: new Map(),
    currentToken: null
};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Token Manager",
        default: true
    },
    autoSaveToken: {
        type: OptionType.BOOLEAN,
        description: "Automatically save current token on login",
        default: true
    },
    encryptTokens: {
        type: OptionType.BOOLEAN,
        description: "Encrypt stored tokens (basic XOR encryption)",
        default: true
    },
    showWarnings: {
        type: OptionType.BOOLEAN,
        description: "Show security warnings",
        default: true
    }
});

// Simple XOR encryption (NOT production-grade, just obfuscation)
function xorEncrypt(text: string, key: string = "DDT_2024"): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
}

function xorDecrypt(encrypted: string, key: string = "DDT_2024"): string {
    try {
        const text = atob(encrypted);
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch {
        return encrypted; // Return as-is if decryption fails
    }
}

function saveToStorage() {
    try {
        // Guard against localStorage not being available - SILENT MODE
        if (typeof localStorage === "undefined" || !localStorage) {
            return; // Silent fail
        }

        const data = {
            accounts: Array.from(state.accounts.entries()).map(([id, account]) => ({
                ...account,
                token: settings.store.encryptTokens ? xorEncrypt(account.token) : account.token
            })),
            currentToken: state.currentToken
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        // Silent fail - no console spam
    }
}

function loadFromStorage() {
    try {
        // Guard against localStorage not being available - SILENT MODE
        if (typeof localStorage === "undefined" || !localStorage) {
            return; // Silent fail
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const data = JSON.parse(stored);
        state.accounts.clear();

        data.accounts?.forEach((account: any) => {
            state.accounts.set(account.id, {
                ...account,
                token: settings.store.encryptTokens ? xorDecrypt(account.token) : account.token
            });
        });

        state.currentToken = data.currentToken;
    } catch (error) {
        // Silent fail - no console spam
    }
}

function getCurrentToken(): string | null {
    try {
        // Guard: Check if localStorage exists
        if (typeof localStorage === "undefined" || !localStorage) {
            // Silent fallback - don't spam console
            // Try WebpackModules as fallback
            const authStore = findByProps("getToken");
            if (authStore?.getToken) {
                const token = authStore.getToken();
                if (token) return token;
            }
            
            return null;
        }

        // Method 1: Check common token keys
        const tokenPatterns = ["token", "tokens"];
        
        for (const key of tokenPatterns) {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    // Try to parse as JSON first (in case it's wrapped)
                    try {
                        const parsed = JSON.parse(value);
                        if (typeof parsed === "string" && parsed.length > 50) {
                            return parsed;
                        }
                    } catch {
                        // Not JSON, check if it's a direct token
                        const cleaned = value.replace(/"/g, "");
                        if (cleaned.length > 50) return cleaned;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        // Method 2: Search ALL localStorage keys for token-like values
        // Discord token format: usually starts with specific patterns
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                const value = localStorage.getItem(key);
                if (!value) continue;

                // Check if value looks like a Discord token
                // Discord tokens are base64-encoded and quite long (70+ chars)
                const cleaned = value.replace(/"/g, "").replace(/\\/g, "");
                if (cleaned.length > 50 && /^[A-Za-z0-9_\-\.]+$/.test(cleaned)) {
                    // Additional validation: Discord tokens usually have dots
                    if (cleaned.includes(".")) {
                        console.log(`[Token Manager] Found potential token in key: ${key}`);
                        return cleaned;
                    }
                }
            }
        } catch (e) {
            // Silent fail - no spam
        }

        // Method 3: WebpackModules
        const authStore = findByProps("getToken");
        if (authStore?.getToken) {
            const token = authStore.getToken();
            if (token) return token;
        }

        // Method 4: Try Flux UserStore
        try {
            const userToken = (UserStore as any)?.getCurrentUser?.()?.token;
            if (userToken) return userToken;
        } catch {}

        return null;
    } catch (error) {
        console.error("[Token Manager] Error getting token:", error);
        return null;
    }
}

async function fetchUserInfo(token: string): Promise<Partial<StoredAccount>> {
    try {
        const response = await fetch("https://discord.com/api/v9/users/@me", {
            headers: { Authorization: token }
        });

        if (!response.ok) throw new Error("Invalid token");

        const data = await response.json();
        return {
            id: data.id,
            username: data.username,
            discriminator: data.discriminator,
            avatar: data.avatar,
            email: data.email,
            phone: data.phone
        };
    } catch (error) {
        throw new Error("Failed to fetch user info");
    }
}

function setToken(token: string) {
    try {
        // Clear existing token
        localStorage.removeItem("token");
        
        // Set new token
        localStorage.setItem("token", `"${token}"`);
        
        state.currentToken = token;
        
        console.log("[Token Manager] Token updated. Reloading Discord...");
        
        // Reload Discord
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        console.error("[Token Manager] Failed to set token:", error);
        throw error;
    }
}

// Global API
(window as any).TokenManager = {
    getCurrentToken: () => {
        const token = getCurrentToken();
        if (settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ SECURITY WARNING: Never share your token with anyone!");
        }
        return token;
    },

    copyCurrentToken: () => {
        const token = getCurrentToken();
        if (!token) {
            console.error("[Token Manager] No token found");
            return;
        }
        navigator.clipboard.writeText(token);
        console.log("[Token Manager] Token copied to clipboard");
        if (settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ SECURITY WARNING: Never share your token with anyone!");
        }
    },

    addAccount: async (token: string, notes?: string) => {
        try {
            const userInfo = await fetchUserInfo(token);
            
            const account: StoredAccount = {
                id: userInfo.id!,
                token,
                username: userInfo.username!,
                discriminator: userInfo.discriminator!,
                avatar: userInfo.avatar,
                email: userInfo.email,
                phone: userInfo.phone,
                addedAt: Date.now(),
                notes
            };

            state.accounts.set(account.id, account);
            saveToStorage();

            console.log(`[Token Manager] Added account: ${account.username}#${account.discriminator}`);
            return account;
        } catch (error) {
            console.error("[Token Manager] Failed to add account:", error);
            throw error;
        }
    },

    saveCurrentAccount: async (notes?: string) => {
        const token = getCurrentToken();
        if (!token) {
            console.error("[Token Manager] No token found");
            return;
        }

        try {
            const account = await (window as any).TokenManager.addAccount(token, notes);
            console.log("[Token Manager] Current account saved");
            return account;
        } catch (error) {
            console.error("[Token Manager] Failed to save current account:", error);
            throw error;
        }
    },

    listAccounts: () => {
        const accounts = Array.from(state.accounts.values()).map(acc => ({
            id: acc.id,
            username: acc.username,
            discriminator: acc.discriminator,
            email: acc.email,
            addedAt: new Date(acc.addedAt).toLocaleString(),
            lastUsed: acc.lastUsed ? new Date(acc.lastUsed).toLocaleString() : "Never",
            notes: acc.notes
        }));

        console.table(accounts);
        return accounts;
    },

    getAccount: (userId: string) => {
        return state.accounts.get(userId);
    },

    switchAccount: (userId: string) => {
        const account = state.accounts.get(userId);
        if (!account) {
            console.error("[Token Manager] Account not found");
            return;
        }

        if (settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ Switching accounts will reload Discord");
        }

        account.lastUsed = Date.now();
        saveToStorage();

        setToken(account.token);
    },

    removeAccount: (userId: string) => {
        const account = state.accounts.get(userId);
        if (!account) {
            console.error("[Token Manager] Account not found");
            return;
        }

        state.accounts.delete(userId);
        saveToStorage();

        console.log(`[Token Manager] Removed account: ${account.username}#${account.discriminator}`);
    },

    clearAllAccounts: () => {
        if (settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ This will delete all stored accounts!");
            console.warn("[Token Manager] Use clearAllAccountsConfirmed() to proceed");
            return;
        }
        (window as any).TokenManager.clearAllAccountsConfirmed();
    },

    clearAllAccountsConfirmed: () => {
        state.accounts.clear();
        saveToStorage();
        console.log("[Token Manager] All accounts cleared");
    },

    updateNotes: (userId: string, notes: string) => {
        const account = state.accounts.get(userId);
        if (!account) {
            console.error("[Token Manager] Account not found");
            return;
        }

        account.notes = notes;
        saveToStorage();
        console.log("[Token Manager] Notes updated");
    },

    exportAccounts: (includeTokens: boolean = false) => {
        const accounts = Array.from(state.accounts.values()).map(acc => ({
            id: acc.id,
            username: acc.username,
            discriminator: acc.discriminator,
            email: acc.email,
            phone: acc.phone,
            addedAt: acc.addedAt,
            lastUsed: acc.lastUsed,
            notes: acc.notes,
            ...(includeTokens ? { token: acc.token } : {})
        }));

        const data = JSON.stringify(accounts, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `token-manager-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log("[Token Manager] Accounts exported");
        if (includeTokens && settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ SECURITY WARNING: Exported file contains tokens!");
        }
    },

    importAccounts: async (accountsData: Array<{ token: string; notes?: string }>) => {
        let successCount = 0;
        let failCount = 0;

        for (const { token, notes } of accountsData) {
            try {
                await (window as any).TokenManager.addAccount(token, notes);
                successCount++;
            } catch {
                failCount++;
            }
        }

        console.log(`[Token Manager] Import complete: ${successCount} succeeded, ${failCount} failed`);
    },

    validateToken: async (token: string) => {
        try {
            const response = await fetch("https://discord.com/api/v9/users/@me", {
                headers: { Authorization: token }
            });

            if (response.ok) {
                console.log("[Token Manager] ✓ Token is valid");
                return true;
            } else {
                console.error("[Token Manager] ✗ Token is invalid");
                return false;
            }
        } catch (error) {
            console.error("[Token Manager] ✗ Failed to validate token:", error);
            return false;
        }
    },

    quickSwitch: () => {
        const accounts = Array.from(state.accounts.values());
        if (accounts.length === 0) {
            console.error("[Token Manager] No accounts stored");
            return;
        }

        console.log("[Token Manager] Available accounts:");
        accounts.forEach((acc, index) => {
            console.log(`  ${index + 1}. ${acc.username}#${acc.discriminator} (${acc.email || "No email"})`);
        });
        console.log("\nUse: TokenManager.switchAccount('USER_ID')");
    },

    help: () => {
        console.log(`
[Token Manager] Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Account Management:
  • getCurrentToken()              - Get current Discord token
  • copyCurrentToken()             - Copy token to clipboard
  • saveCurrentAccount([notes])    - Save current account
  • addAccount(token, [notes])     - Add account manually
  • listAccounts()                 - List all saved accounts
  • getAccount(userId)             - Get specific account details
  • removeAccount(userId)          - Remove an account
  • clearAllAccounts()             - Clear all accounts (with warning)

🔄 Account Switching:
  • switchAccount(userId)          - Switch to different account
  • quickSwitch()                  - Show quick switch menu

🔧 Token Operations:
  • validateToken(token)           - Check if token is valid
  • updateNotes(userId, notes)     - Update account notes

📦 Import/Export:
  • exportAccounts([includeTokens]) - Export accounts to JSON
  • importAccounts(accountsData)    - Import accounts from array

🔍 Debug:
  • debugLocalStorage()            - Show all localStorage keys (helps find token)
  • searchToken()                  - Advanced token search in localStorage

⚠️  SECURITY WARNING:
Never share your Discord token with anyone! It provides full
access to your account. Store tokens securely and use at your
own risk.
        `);
    },

    debugLocalStorage: () => {
        if (typeof localStorage === "undefined" || !localStorage) {
            console.error("[Token Manager] localStorage not available");
            return;
        }
        
        console.log("[Token Manager] LocalStorage Debug:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const entries: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            const value = localStorage.getItem(key);
            if (!value) continue;
            
            // Truncate long values
            const preview = value.length > 100 ? value.substring(0, 100) + "..." : value;
            
            entries.push({
                key,
                length: value.length,
                preview
            });
        }
        
        console.table(entries);
        console.log("Total keys:", entries.length);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    },

    searchToken: () => {
        if (typeof localStorage === "undefined" || !localStorage) {
            console.error("[Token Manager] localStorage not available");
            console.log("Try using TokenManager.getCurrentToken() instead - it uses fallback methods");
            return;
        }
        
        console.log("[Token Manager] Searching for Discord token...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const potentialTokens: any[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            const value = localStorage.getItem(key);
            if (!value) continue;
            
            // Check if value looks like a Discord token
            const cleaned = value.replace(/"/g, "").replace(/\\/g, "");
            
            // Discord tokens are typically 70+ characters and alphanumeric
            if (cleaned.length > 50 && /^[A-Za-z0-9_\-\.]+$/.test(cleaned)) {
                potentialTokens.push({
                    key,
                    tokenPreview: cleaned.substring(0, 20) + "..." + cleaned.substring(cleaned.length - 10),
                    length: cleaned.length,
                    hasDotsPattern: cleaned.includes("."),
                    confidence: cleaned.includes(".") && cleaned.length > 70 ? "HIGH" : "LOW"
                });
            }
        }
        
        if (potentialTokens.length === 0) {
            console.log("❌ No potential tokens found in localStorage");
            console.log("\nTrying fallback methods...");
            const token = getCurrentToken();
            if (token) {
                console.log("✓ Token found via WebpackModules!");
                console.log("Token preview:", token.substring(0, 20) + "..." + token.substring(token.length - 10));
            } else {
                console.log("❌ No token found");
                console.log("\nTry:");
                console.log("1. Make sure you're logged in");
                console.log("2. Reload Discord");
                console.log("3. Run TokenManager.searchToken() again");
            }
        } else {
            console.table(potentialTokens);
            console.log(`\n✓ Found ${potentialTokens.length} potential token(s)`);
            console.log("Use TokenManager.getCurrentToken() to retrieve the best match");
        }
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
};

export default definePlugin({
    name: "TokenManager",
    description: "Secure token storage and multi-account management with quick switching",
    authors: [Devs.Ven],
    tags: ["Developers"],

    settings,

    start() {
        loadFromStorage();

        // Auto-save current token if enabled (silent mode)
        if (settings.store.autoSaveToken) {
            const currentToken = getCurrentToken();
            if (currentToken && !Array.from(state.accounts.values()).some(acc => acc.token === currentToken)) {
                // Silent auto-save
                (window as any).TokenManager.saveCurrentAccount("Auto-saved on startup")
                    .catch(() => {
                        // Silent fail
                    });
            }
        }

        console.log("[Token Manager] Started");
        console.log(`[Token Manager] ${state.accounts.size} accounts loaded`);
        console.log("[Token Manager] Use window.TokenManager for access");
        console.log("[Token Manager] Type TokenManager.help() for commands");

        if (settings.store.showWarnings) {
            console.warn("[Token Manager] ⚠️ SECURITY WARNING:");
            console.warn("  • Never share your Discord token with anyone");
            console.warn("  • Tokens provide full account access");
            console.warn("  • Use this tool at your own risk");
            console.warn("  • Consider using Discord's official multi-account feature");
        }
    },

    stop() {
        delete (window as any).TokenManager;
        console.log("[Token Manager] Stopped");
    }
});
