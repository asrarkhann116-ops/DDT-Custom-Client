/*
 * DDT Custom Client - Auto Updater
 * Copyright (c) 2024 DDT Team
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("DDT Updater", "#a855f7");

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
}

interface UpdateInfo {
    hasUpdate: boolean;
    currentHash: string;
    latestHash: string;
    commits: GitHubCommit[];
    error?: string;
}

const GITHUB_REPO = "asrarkhann116-ops/DDT-Custom-Client";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/commits`;
const GITHUB_BRANCH = "main";

const settings = definePluginSettings({
    autoCheckOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Automatically check for updates on Discord startup",
        default: true
    },
    autoDownload: {
        type: OptionType.BOOLEAN,
        description: "Automatically download updates (requires manual install)",
        default: false
    },
    updateInterval: {
        type: OptionType.NUMBER,
        description: "Check for updates every X hours (0 = disabled)",
        default: 24
    },
    notifyOnUpdate: {
        type: OptionType.BOOLEAN,
        description: "Show notification when updates are available",
        default: true
    }
});

let lastCheckTime = 0;
let currentCommitHash: string | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

// Get current commit hash from build
function getCurrentCommitHash(): string {
    try {
        // Method 1: Try to get from Vencord's gitHash import
        const gitHash = (globalThis as any).__VENCORD_HASH__;
        if (gitHash && typeof gitHash === "string" && gitHash !== "unknown") {
            logger.info("Current commit hash from build:", gitHash.substring(0, 7));
            return gitHash;
        }
    } catch {}

    // Method 2: Try localStorage cache
    try {
        if (typeof localStorage !== "undefined" && localStorage) {
            const stored = localStorage.getItem("ddt_current_commit");
            if (stored && stored !== "unknown") {
                logger.info("Current commit hash from cache:", stored.substring(0, 7));
                return stored;
            }
        }
    } catch {}

    // Method 3: Hardcoded fallback (current build)
    // This will be updated on each fresh install
    const CURRENT_BUILD_HASH = "8ec3597"; // Updated: 2026-09-19 20:45
    logger.info("Using fallback hash:", CURRENT_BUILD_HASH);
    
    // Cache it for future
    try {
        if (typeof localStorage !== "undefined" && localStorage) {
            localStorage.setItem("ddt_current_commit", CURRENT_BUILD_HASH);
        }
    } catch {}

    return CURRENT_BUILD_HASH;
}

// Fetch latest commits from GitHub
async function fetchLatestCommits(count = 10): Promise<GitHubCommit[]> {
    try {
        const response = await fetch(`${GITHUB_API}?sha=${GITHUB_BRANCH}&per_page=${count}`, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "DDT-Custom-Client-Updater"
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const commits: GitHubCommit[] = await response.json();
        return commits;
    } catch (error) {
        logger.error("Failed to fetch commits:", error);
        throw error;
    }
}

// Check if updates are available
async function checkForUpdates(): Promise<UpdateInfo> {
    try {
        logger.info("Checking for updates...");

        const current = getCurrentCommitHash();
        const commits = await fetchLatestCommits(50);

        if (!commits || commits.length === 0) {
            return {
                hasUpdate: false,
                currentHash: current,
                latestHash: current,
                commits: [],
                error: "No commits found"
            };
        }

        const latest = commits[0];
        const latestHash = latest.sha;

        // Store latest for future reference (with guard)
        try {
            if (typeof localStorage !== "undefined" && localStorage) {
                localStorage.setItem("ddt_latest_commit", latestHash);
            }
        } catch {}

        // Check if current hash exists in recent commits
        const currentIndex = commits.findIndex(c => c.sha.startsWith(current) || current.startsWith(c.sha));

        const hasUpdate = currentIndex === -1 || currentIndex > 0;

        if (hasUpdate) {
            logger.info(`Update available! Current: ${current.substring(0, 7)} → Latest: ${latestHash.substring(0, 7)}`);
        } else {
            logger.info("Already up to date!");
        }

        return {
            hasUpdate,
            currentHash: current,
            latestHash,
            commits: currentIndex === -1 ? commits.slice(0, 10) : commits.slice(0, currentIndex)
        };
    } catch (error) {
        logger.error("Update check failed:", error);
        return {
            hasUpdate: false,
            currentHash: getCurrentCommitHash(),
            latestHash: "",
            commits: [],
            error: String(error)
        };
    }
}

// Download latest version
async function downloadUpdate(): Promise<boolean> {
    try {
        logger.info("Downloading update...");

        const downloadUrl = `https://github.com/${GITHUB_REPO}/archive/refs/heads/${GITHUB_BRANCH}.zip`;

        // Open download link in browser
        window.open(downloadUrl, "_blank");

        logger.info("Download started! ZIP will open in browser.");
        logger.info("After download:");
        logger.info("1. Extract ZIP");
        logger.info("2. Close Discord");
        logger.info("3. Run: python install.py");

        return true;
    } catch (error) {
        logger.error("Download failed:", error);
        return false;
    }
}

// Show update notification
function showUpdateNotification(info: UpdateInfo) {
    if (!settings.store.notifyOnUpdate) return;

    const commitCount = info.commits.length;
    const message = commitCount > 0
        ? `${commitCount} new commit${commitCount > 1 ? "s" : ""} available!`
        : "Update available!";

    try {
        // Try to use Vencord's notification system
        if ((window as any).Vencord?.Notifications) {
            (window as any).Vencord.Notifications.showNotification({
                title: "DDT Update Available",
                body: message,
                icon: "https://raw.githubusercontent.com/asrarkhann116-ops/DDT-Custom-Client/main/.github/ddt-icon.png",
                onClick: () => {
                    (window as any).DDTUpdater.showUpdatePanel();
                }
            });
        } else {
            // Fallback: Console + alert
            logger.info(`🔔 ${message}`);
            console.log(`%c[DDT Updater] ${message}`, "color: #a855f7; font-weight: bold; font-size: 14px;");
        }
    } catch (error) {
        logger.error("Failed to show notification:", error);
    }
}

// Periodic update check
function startUpdateCheckInterval() {
    if (updateCheckInterval) clearInterval(updateCheckInterval);

    const hours = settings.store.updateInterval;
    if (hours <= 0) return;

    const intervalMs = hours * 60 * 60 * 1000;

    updateCheckInterval = setInterval(async () => {
        logger.info("Running periodic update check...");
        const info = await checkForUpdates();
        if (info.hasUpdate) {
            showUpdateNotification(info);
        }
    }, intervalMs);

    logger.info(`Update check scheduled every ${hours} hour(s)`);
}

// Global API
(window as any).DDTUpdater = {
    checkForUpdates: async () => {
        const info = await checkForUpdates();
        console.table({
            "Has Update": info.hasUpdate,
            "Current Hash": info.currentHash.substring(0, 7),
            "Latest Hash": info.latestHash.substring(0, 7),
            "New Commits": info.commits.length,
            "Error": info.error || "None"
        });

        if (info.commits.length > 0) {
            console.log("\n📋 Recent commits:");
            info.commits.forEach((commit, i) => {
                console.log(`  ${i + 1}. ${commit.sha.substring(0, 7)} - ${commit.commit.message.split("\n")[0]}`);
                console.log(`     by ${commit.commit.author.name} on ${new Date(commit.commit.author.date).toLocaleDateString()}`);
            });
        }

        return info;
    },

    downloadUpdate: async () => {
        const success = await downloadUpdate();
        if (success) {
            console.log("%c[DDT Updater] Download started!", "color: #10b981; font-weight: bold;");
            console.log("After download:");
            console.log("  1. Extract ZIP");
            console.log("  2. Close Discord");
            console.log("  3. cd to extracted folder");
            console.log("  4. Run: python install.py");
        }
        return success;
    },

    getUpdateInfo: async () => {
        return await checkForUpdates();
    },

    openGitHubRepo: () => {
        window.open(`https://github.com/${GITHUB_REPO}`, "_blank");
    },

    openGitHubReleases: () => {
        window.open(`https://github.com/${GITHUB_REPO}/releases`, "_blank");
    },

    getCurrentHash: () => {
        return getCurrentCommitHash();
    },

    forceUpdate: async () => {
        logger.warn("Force update not yet implemented");
        logger.info("For now, use DDTUpdater.downloadUpdate()");
        return false;
    },

    help: () => {
        console.log(`
%c[DDT Auto-Updater] Available Commands
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Update Management:
  • checkForUpdates()    - Check GitHub for new commits
  • downloadUpdate()     - Download latest version (opens browser)
  • getUpdateInfo()      - Get detailed update information
  • getCurrentHash()     - Show current commit hash

🔗 Links:
  • openGitHubRepo()     - Open GitHub repository
  • openGitHubReleases() - Open releases page

🔧 Settings:
  • Settings → Vencord → Plugins → DDTUpdater
  • Configure auto-check, notifications, etc.

⚡ Quick Update:
  1. DDTUpdater.checkForUpdates()
  2. DDTUpdater.downloadUpdate()
  3. Extract ZIP, close Discord
  4. python install.py in extracted folder
        `, "color: #a855f7; font-weight: bold;");
    }
};

export default definePlugin({
    name: "DDTUpdater",
    description: "Automatic update checker for DDT Custom Client with GitHub integration",
    authors: [Devs.Ven],
    tags: ["Customisation"],
    enabledByDefault: true, // Always ON by default for all users

    settings,

    async start() {
        try {
            logger.info("DDT Auto-Updater started");

            // Initialize current hash
            currentCommitHash = getCurrentCommitHash();
            logger.info(`Current version: ${currentCommitHash.substring(0, 7)}`);

            // Check on startup if enabled
            if (settings.store.autoCheckOnStartup) {
                // Delay to avoid blocking Discord startup
                setTimeout(async () => {
                    const info = await checkForUpdates();
                    if (info.hasUpdate) {
                        showUpdateNotification(info);

                        if (settings.store.autoDownload) {
                            logger.info("Auto-download enabled, starting download...");
                            await downloadUpdate();
                        }
                    }
                }, 5000); // 5 second delay
            }

            // Start periodic checks
            if (settings.store.updateInterval > 0) {
                startUpdateCheckInterval();
            }

            logger.info("Use window.DDTUpdater for update commands");
            console.log("%cDDT Updater loaded! Type DDTUpdater.help() for commands.", "color: #a855f7; font-weight: bold;");
        } catch (error) {
            logger.error("Failed to start DDT Updater:", error);
        }
    },

    stop() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
            updateCheckInterval = null;
        }

        delete (window as any).DDTUpdater;
        logger.info("DDT Auto-Updater stopped");
    }
});
