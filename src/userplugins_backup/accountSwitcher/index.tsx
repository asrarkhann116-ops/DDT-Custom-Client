/*
 * DDT Custom Client - Account Switcher
 * Copyright (c) 2024 DDT Team
 * 
 * Switch between Discord accounts using access tokens
 * Features: Token validation, encrypted storage, one-click switching
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, Tooltip } from "@webpack/common";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";

// Import modal components properly
const { ModalRoot, ModalHeader, ModalContent, ModalCloseButton } = require("@utils/modal");

const logger = new Logger("Account Switcher", "#10b981");

interface SavedAccount {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    token: string; // Encrypted
    nickname?: string;
    addedAt: number;
}

interface UserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
}

// XOR encryption for token storage
const ENCRYPTION_KEY = "DDT_SECURE_KEY_2024";

function xorEncrypt(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
            text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        );
    }
    return btoa(result);
}

function xorDecrypt(encrypted: string): string {
    try {
        const text = atob(encrypted);
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
            );
        }
        return result;
    } catch {
        return "";
    }
}

// Validate token and fetch user info
async function validateToken(token: string): Promise<UserInfo> {
    try {
        const response = await fetch("https://discord.com/api/v9/users/@me", {
            headers: {
                Authorization: token
            }
        });

        if (!response.ok) {
            throw new Error(`Invalid token (HTTP ${response.status})`);
        }

        return await response.json();
    } catch (error) {
        logger.error("Token validation failed:", error);
        throw new Error("Invalid or expired token");
    }
}

// Get avatar URL
function getAvatarUrl(userId: string, avatarHash: string | null): string {
    if (!avatarHash) {
        return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
}

// Switch to account
async function switchAccount(token: string) {
    console.log("🔥 [DEBUG] switchAccount function called");
    try {
        const decryptedToken = xorDecrypt(token);
        console.log("🔥 [DEBUG] Token decrypted, length:", decryptedToken?.length);
        logger.info("🔄 Starting account switch...");
        
        let success = false;

        // Method 1: Vencord's Webpack Token Module (PRIMARY - PROVEN WORKING)
        console.log("🔥 [DEBUG] Attempting Vencord.Webpack token module...");
        try {
            const { Webpack } = Vencord;
            const tokenModule = Webpack.findByProps("getToken", "setToken");
            
            if (tokenModule?.setToken) {
                console.log("🔥 [DEBUG] Found setToken via Vencord.Webpack!");
                tokenModule.setToken(decryptedToken);
                console.log("🔥 [DEBUG] Token set successfully via Vencord!");
                logger.info("✅ Token set via Vencord.Webpack");
                success = true;
            } else {
                console.error("🔥 [DEBUG] tokenModule.setToken not found!");
            }
        } catch (e) {
            console.error("🔥 [DEBUG] Vencord.Webpack error:", e);
            logger.error("❌ Vencord.Webpack failed:", e);
        }

        // Method 2: DiscordNative (Backup - if somehow available)
        if (!success && (window as any).DiscordNative?.app?.token) {
            console.log("🔥 [DEBUG] Attempting DiscordNative...");
            try {
                await (window as any).DiscordNative.app.token.setToken(decryptedToken);
                logger.info("✅ Token set via DiscordNative");
                success = true;
            } catch (e) {
                console.error("🔥 [DEBUG] DiscordNative error:", e);
            }
        }

        if (!success) {
            console.error("🔥 [DEBUG] ALL METHODS FAILED!");
            throw new Error("All token setting methods failed!");
        }

        // Reload Discord after successful token set
        console.log("🔥 [DEBUG] Preparing to reload...");
        logger.info("🔄 Token set successful! Reloading in 1 second...");
        setTimeout(() => {
            console.log("🔥 [DEBUG] RELOADING NOW!");
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error("🔥 [DEBUG] Fatal error in switchAccount:", error);
        logger.error("❌ Fatal: Failed to switch account:", error);
        throw error;
    }
}

// Account storage using Vencord settings
function loadAccounts(): SavedAccount[] {
    try {
        const stored = settings.store.savedAccounts;
        if (!stored || stored === "[]") return [];
        return JSON.parse(stored);
    } catch (error) {
        logger.error("Failed to load accounts:", error);
        return [];
    }
}

function saveAccounts(accountList: SavedAccount[]) {
    try {
        settings.store.savedAccounts = JSON.stringify(accountList);
        logger.info(`Saved ${accountList.length} accounts`);
    } catch (error) {
        logger.error("Failed to save accounts:", error);
    }
}

// Add Account Form Component
function AddAccountForm({ onClose, onAdd }: { onClose: () => void; onAdd: (account: SavedAccount) => void }) {
    const [token, setToken] = React.useState("");
    const [nickname, setNickname] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleAdd = async () => {
        if (!token.trim()) {
            setError("Token is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            logger.info("Validating token...");
            const userInfo = await validateToken(token.trim());

            const newAccount: SavedAccount = {
                id: userInfo.id,
                username: userInfo.username,
                discriminator: userInfo.discriminator,
                avatar: userInfo.avatar,
                token: xorEncrypt(token.trim()),
                nickname: nickname.trim() || undefined,
                addedAt: Date.now()
            };

            onAdd(newAccount);
            logger.info(`Account added: ${userInfo.username}#${userInfo.discriminator}`);
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to validate token");
            logger.error("Failed to add account:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <Forms.FormTitle>Add New Account</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: "10px", color: "#b9bbbe" }}>
                Enter your Discord access token to add an account. Your token is encrypted before storage.
            </Forms.FormText>

            {error && (
                <div style={{
                    padding: "10px",
                    marginBottom: "15px",
                    backgroundColor: "#f04747",
                    color: "white",
                    borderRadius: "5px"
                }}>
                    ⚠️ {error}
                </div>
            )}

            <Forms.FormTitle style={{ marginTop: "15px" }}>Access Token</Forms.FormTitle>
            <TextInput
                value={token}
                onChange={setToken}
                placeholder="Paste your Discord token here..."
                disabled={loading}
                style={{ marginBottom: "15px" }}
            />

            <Forms.FormTitle>Nickname (Optional)</Forms.FormTitle>
            <TextInput
                value={nickname}
                onChange={setNickname}
                placeholder="e.g., Work Account, Alt Account"
                disabled={loading}
                style={{ marginBottom: "20px" }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={handleAdd}
                    disabled={loading}
                >
                    {loading ? "Validating..." : "Add Account"}
                </Button>
            </div>

            {/* @ts-ignore */}
            <Forms.FormDivider style={{ marginTop: "20px", marginBottom: "10px" }} />
            <Forms.FormText style={{ fontSize: "12px", color: "#72767d" }}>
                🔒 Your tokens are encrypted using XOR encryption before storage. Never share your tokens with anyone.
            </Forms.FormText>
        </div>
    );
}

// Account Card Component
function AccountCard({
    account,
    isCurrent,
    onSwitch,
    onDelete
}: {
    account: SavedAccount;
    isCurrent: boolean;
    onSwitch: () => void;
    onDelete: () => void;
}) {
    const avatarUrl = getAvatarUrl(account.id, account.avatar);
    const displayName = account.nickname || `${account.username}#${account.discriminator}`;

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            padding: "16px",
            backgroundColor: isCurrent ? "#5865f215" : "#2b2d31",
            borderRadius: "12px",
            marginBottom: "10px",
            border: isCurrent ? "2px solid #5865f2" : "2px solid transparent",
            transition: "all 0.2s ease",
            cursor: "default"
        }}>
            <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    marginRight: "16px",
                    border: "3px solid #313338"
                }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ 
                    fontWeight: "600", 
                    color: "#ffffff",
                    fontSize: "16px",
                    marginBottom: "4px"
                }}>
                    {displayName}
                    {isCurrent && (
                        <span style={{ 
                            marginLeft: "10px", 
                            color: "#5865f2",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: "#5865f220",
                            padding: "2px 8px",
                            borderRadius: "4px"
                        }}>
                            ● Current
                        </span>
                    )}
                </div>
                <div style={{ fontSize: "13px", color: "#949ba4" }}>
                    {account.username}#{account.discriminator}
                </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
                {!isCurrent && (
                    <Button
                        color={Button.Colors.BRAND}
                        size={Button.Sizes.SMALL}
                        onClick={onSwitch}
                    >
                        Switch
                    </Button>
                )}
                <Button
                    color={Button.Colors.RED}
                    size={Button.Sizes.SMALL}
                    onClick={onDelete}
                >
                    {isCurrent ? "Remove" : "Delete"}
                </Button>
            </div>
        </div>
    );
}

// Main Switcher Modal
function AccountSwitcherModal({ modalProps, currentUserId }: { modalProps: any; currentUserId: string }) {
    const [accountList, setAccountList] = React.useState<SavedAccount[]>([]);
    const [showAddForm, setShowAddForm] = React.useState(false);

    React.useEffect(() => {
        setAccountList(loadAccounts());
    }, []);

    const handleAddAccount = (newAccount: SavedAccount) => {
        // Check if account already exists
        const exists = accountList.some(acc => acc.id === newAccount.id);
        if (exists) {
            logger.warn("Account already exists");
            return;
        }

        const updated = [...accountList, newAccount];
        setAccountList(updated);
        saveAccounts(updated);
        setShowAddForm(false);
    };

    const handleSwitch = async (account: SavedAccount) => {
        console.log("🔥 [DEBUG] handleSwitch called for:", account.username);
        logger.info(`🔥 Attempting to switch to ${account.username}#${account.discriminator}`);
        
        if (confirm(`Switch to ${account.username}#${account.discriminator}?\n\nDiscord will reload.`)) {
            console.log("🔥 [DEBUG] User confirmed switch");
            try {
                await switchAccount(account.token);
                console.log("🔥 [DEBUG] switchAccount completed");
            } catch (error) {
                console.error("🔥 [DEBUG] switchAccount failed:", error);
                alert(`Failed to switch account: ${error}`);
                logger.error("Switch failed:", error);
            }
        } else {
            console.log("🔥 [DEBUG] User cancelled switch");
        }
    };

    const handleDelete = (accountId: string) => {
        if (confirm("Are you sure you want to delete this account?")) {
            const updated = accountList.filter(acc => acc.id !== accountId);
            setAccountList(updated);
            saveAccounts(updated);
            logger.info("Account deleted");
        }
    };

    if (showAddForm) {
        return (
            <ModalRoot {...modalProps}>
                <ModalHeader>
                    <Forms.FormTitle tag="h2">DDT Account Switcher</Forms.FormTitle>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </ModalHeader>
                <ModalContent>
                    <AddAccountForm
                        onClose={() => setShowAddForm(false)}
                        onAdd={handleAddAccount}
                    />
                </ModalContent>
            </ModalRoot>
        );
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">DDT Account Switcher</Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "20px" }}>
                    <Forms.FormTitle>Saved Accounts ({accountList.length})</Forms.FormTitle>
                    <Forms.FormText style={{ marginBottom: "15px", color: "#b9bbbe" }}>
                        Switch between Discord accounts instantly without logging out.
                    </Forms.FormText>

                    {accountList.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px 20px",
                            color: "#72767d"
                        }}>
                            <div style={{ fontSize: "48px", marginBottom: "10px" }}>👤</div>
                            <div>No accounts saved yet</div>
                            <div style={{ fontSize: "12px", marginTop: "5px" }}>
                                Click "Add Account" below to get started
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: "15px" }}>
                            {accountList.map(account => (
                                <AccountCard
                                    key={account.id}
                                    account={account}
                                    isCurrent={account.id === currentUserId}
                                    onSwitch={() => handleSwitch(account)}
                                    onDelete={() => handleDelete(account.id)}
                                />
                            ))}
                        </div>
                    )}

                    <Button
                        color={Button.Colors.GREEN}
                        onClick={() => setShowAddForm(true)}
                        style={{ width: "100%" }}
                    >
                        + Add Account
                    </Button>

                    {/* @ts-ignore */}
                    <Forms.FormDivider style={{ margin: "20px 0" }} />
                    <Forms.FormText style={{ fontSize: "12px", color: "#72767d" }}>
                        💡 <strong>Tip:</strong> Use Ctrl+Alt+S to quickly open this menu.
                    </Forms.FormText>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

// Get current user ID
function getCurrentUserId(): string {
    try {
        const token = localStorage.getItem("token");
        if (!token) return "";
        
        // Decode JWT token to get user ID
        const base64 = token.replace(/"/g, "").split(".")[0];
        const decoded = atob(base64);
        return JSON.parse(decoded).id || "";
    } catch {
        return "";
    }
}

// Global API
(window as any).AccountSwitcher = {
    open: () => {
        openModal(props => (
            <AccountSwitcherModal
                modalProps={props}
                currentUserId={getCurrentUserId()}
            />
        ));
    },

    addAccount: async (token: string, nickname?: string) => {
        try {
            const userInfo = await validateToken(token);
            const accounts = loadAccounts();
            
            const newAccount: SavedAccount = {
                id: userInfo.id,
                username: userInfo.username,
                discriminator: userInfo.discriminator,
                avatar: userInfo.avatar,
                token: xorEncrypt(token),
                nickname,
                addedAt: Date.now()
            };

            accounts.push(newAccount);
            saveAccounts(accounts);
            logger.info(`Account added via API: ${userInfo.username}`);
            return true;
        } catch (error) {
            logger.error("Failed to add account:", error);
            return false;
        }
    },

    listAccounts: () => {
        return loadAccounts().map(acc => ({
            id: acc.id,
            username: acc.username,
            discriminator: acc.discriminator,
            nickname: acc.nickname
        }));
    },

    switchTo: (userId: string) => {
        const accounts = loadAccounts();
        const account = accounts.find(acc => acc.id === userId);
        if (!account) {
            logger.error("Account not found");
            return false;
        }
        switchAccount(account.token);
        return true;
    },

    help: () => {
        console.log(`
%c[DDT Account Switcher] Available Commands
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Account Management:
  • open()                    - Open account switcher UI
  • addAccount(token, nick)   - Add account via console
  • listAccounts()            - List all saved accounts
  • switchTo(userId)          - Switch to account by ID

⌨️ Keyboard Shortcuts:
  • Ctrl+Alt+S                - Quick open switcher

🔒 Security:
  • All tokens are XOR encrypted before storage
  • Never share your tokens
  • Use at your own risk
        `, "color: #10b981; font-weight: bold;");
    }
};

const settings = definePluginSettings({
    savedAccounts: {
        type: OptionType.STRING,
        description: "Saved accounts data (JSON)",
        default: "[]",
        hidden: true
    }
});

export default definePlugin({
    name: "AccountSwitcher",
    description: "Switch between Discord accounts using access tokens with one click",
    authors: [Devs.Ven],
    tags: ["Utility"],
    enabledByDefault: true,

    settings,

    start() {
        try {
            logger.info("DDT Account Switcher started");

            // Load accounts on startup
            const accounts = loadAccounts();
            logger.info(`Loaded ${accounts.length} saved accounts`);

            // Add titlebar button
            this.addTitlebarButton();

            // Register hotkey (Ctrl+Alt+S)
            document.addEventListener("keydown", this.handleHotkey);

            logger.info("Use AccountSwitcher.open() or Ctrl+Alt+S to manage accounts");
            console.log("%cDDT Account Switcher loaded! Type AccountSwitcher.help() for commands.", "color: #10b981; font-weight: bold;");
        } catch (error) {
            logger.error("Failed to start Account Switcher:", error);
        }
    },

    stop() {
        this.removeTitlebarButton();
        document.removeEventListener("keydown", this.handleHotkey);
        delete (window as any).AccountSwitcher;
        logger.info("DDT Account Switcher stopped");
    },

    titlebarButtonComponent: null as any,

    addTitlebarButton() {
        this.titlebarButtonComponent = () => (
            <Tooltip text="Account Switcher (Ctrl+Alt+S)">
                {(tooltipProps: any) => (
                    <div
                        {...tooltipProps}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "48px",
                            height: "48px",
                            cursor: "pointer",
                            borderRadius: "16px",
                            backgroundColor: "transparent",
                            transition: "all 0.15s ease",
                            margin: "4px 0"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#404249";
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        onClick={() => (window as any).AccountSwitcher?.open()}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "#b5bac1" }}
                        >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
        // @ts-ignore - ComponentType issue with removeServerListElement
        addServerListElement(ServerListRenderPosition.Above, this.titlebarButtonComponent);
    },

    removeTitlebarButton() {
        if (this.titlebarButtonComponent) {
            // @ts-ignore - ComponentType issue with removeServerListElement
            removeServerListElement(ServerListRenderPosition.Above, this.titlebarButtonComponent);
        }
    },

    handleHotkey(event: KeyboardEvent) {
        // Ctrl+Alt+S
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "s") {
            event.preventDefault();
            (window as any).AccountSwitcher?.open();
        }
    }
});
