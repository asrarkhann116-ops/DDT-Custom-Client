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
import { Button, Forms, React, Select, Switch, TextArea, TextInput, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    showInToolbar: {
        type: OptionType.BOOLEAN,
        description: "Show DevTools button in toolbar",
        default: true
    },
    defaultTab: {
        type: OptionType.SELECT,
        description: "Default tab to open",
        options: [
            { label: "API Inspector", value: "api", default: true },
            { label: "Event Logger", value: "events" },
            { label: "Token Manager", value: "tokens" },
            { label: "Console", value: "console" }
        ]
    }
});

interface DevToolsPanelState {
    activeTab: string;
    apiRequests: any[];
    events: any[];
    consoleOutput: string[];
}

const state: DevToolsPanelState = {
    activeTab: "api",
    apiRequests: [],
    events: [],
    consoleOutput: []
};

function DevToolsPanel() {
    const [activeTab, setActiveTab] = React.useState<string>(settings.store.defaultTab);
    const [apiRequests, setApiRequests] = React.useState<any[]>([]);
    const [events, setEvents] = React.useState<any[]>([]);
    const [accounts, setAccounts] = React.useState<any[]>([]);
    const [refreshKey, setRefreshKey] = React.useState(0);

    const refresh = () => setRefreshKey(prev => prev + 1);

    React.useEffect(() => {
        if ((window as any).APIInspector) {
            setApiRequests((window as any).APIInspector.getRequests());
        }
        if ((window as any).EventLogger) {
            setEvents((window as any).EventLogger.getEvents());
        }
        if ((window as any).TokenManager) {
            setAccounts((window as any).TokenManager.listAccounts());
        }
    }, [refreshKey]);

    const renderAPIInspector = () => (
        <div style={{ padding: "20px" }}>
            <Forms.FormTitle tag="h3">API Inspector</Forms.FormTitle>
            <Forms.FormText>Monitor Discord API requests in real-time</Forms.FormText>
            
            <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        refresh();
                        Toasts.show({ message: "Refreshed API requests", type: Toasts.Type.SUCCESS, id: "ddt-refresh" });
                    }}
                >
                    Refresh ({apiRequests.length})
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => {
                        (window as any).APIInspector?.clearRequests();
                        setApiRequests([]);
                        Toasts.show({ message: "Cleared API logs", type: Toasts.Type.SUCCESS, id: "ddt-clear" });
                    }}
                >
                    Clear
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        (window as any).APIInspector?.exportRequests();
                        Toasts.show({ message: "Exported to JSON", type: Toasts.Type.SUCCESS, id: "ddt-export" });
                    }}
                >
                    Export
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        (window as any).APIInspector?.stats();
                        Toasts.show({ message: "Stats logged to console", type: Toasts.Type.INFO, id: "ddt-stats" });
                    }}
                >
                    View Stats
                </Button>
            </div>

            <div style={{ marginTop: "20px", maxHeight: "400px", overflowY: "auto", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", padding: "10px" }}>
                {apiRequests.length === 0 ? (
                    <Forms.FormText style={{ textAlign: "center", padding: "20px" }}>
                        No API requests logged yet
                    </Forms.FormText>
                ) : (
                    apiRequests.slice(0, 50).map(req => (
                        <div key={req.id} style={{ 
                            padding: "10px", 
                            marginBottom: "8px", 
                            background: "var(--background-secondary)", 
                            borderRadius: "4px",
                            borderLeft: `3px solid ${req.status >= 200 && req.status < 300 ? "var(--green-360)" : "var(--red-400)"}`
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                <span style={{ fontWeight: "bold", color: "var(--header-primary)" }}>
                                    {req.method} {req.status}
                                </span>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    {req.duration ? `${req.duration.toFixed(0)}ms` : ""}
                                </span>
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-normal)", wordBreak: "break-all" }}>
                                {req.url}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Forms.FormText style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
                💡 Use <code>window.APIInspector</code> in console for advanced features
            </Forms.FormText>
        </div>
    );

    const renderEventLogger = () => (
        <div style={{ padding: "20px" }}>
            <Forms.FormTitle tag="h3">Event Logger</Forms.FormTitle>
            <Forms.FormText>Monitor Discord client events</Forms.FormText>
            
            <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        refresh();
                        Toasts.show({ message: "Refreshed events", type: Toasts.Type.SUCCESS, id: "ddt-refresh" });
                    }}
                >
                    Refresh ({events.length})
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => {
                        (window as any).EventLogger?.clearEvents();
                        setEvents([]);
                        Toasts.show({ message: "Cleared event logs", type: Toasts.Type.SUCCESS, id: "ddt-clear" });
                    }}
                >
                    Clear
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        (window as any).EventLogger?.exportEvents();
                        Toasts.show({ message: "Exported to JSON", type: Toasts.Type.SUCCESS, id: "ddt-export" });
                    }}
                >
                    Export
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        (window as any).EventLogger?.stats();
                        Toasts.show({ message: "Stats logged to console", type: Toasts.Type.INFO, id: "ddt-stats" });
                    }}
                >
                    View Stats
                </Button>
            </div>

            <div style={{ marginTop: "20px", maxHeight: "400px", overflowY: "auto", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", padding: "10px" }}>
                {events.length === 0 ? (
                    <Forms.FormText style={{ textAlign: "center", padding: "20px" }}>
                        No events logged yet
                    </Forms.FormText>
                ) : (
                    events.slice(0, 50).map(event => (
                        <div key={event.id} style={{ 
                            padding: "8px", 
                            marginBottom: "6px", 
                            background: "var(--background-secondary)", 
                            borderRadius: "4px",
                            fontSize: "13px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "bold", color: "var(--text-link)" }}>
                                    {event.type}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Forms.FormText style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
                💡 Use <code>window.EventLogger</code> in console for advanced features
            </Forms.FormText>
        </div>
    );

    const renderTokenManager = () => (
        <div style={{ padding: "20px" }}>
            <Forms.FormTitle tag="h3">Token Manager</Forms.FormTitle>
            <Forms.FormText style={{ color: "var(--text-danger)" }}>
                ⚠️ Never share your Discord token! It provides full account access.
            </Forms.FormText>
            
            <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        refresh();
                        Toasts.show({ message: "Refreshed accounts", type: Toasts.Type.SUCCESS, id: "ddt-refresh" });
                    }}
                >
                    Refresh ({accounts.length})
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        (window as any).TokenManager?.saveCurrentAccount();
                        setTimeout(refresh, 500);
                        Toasts.show({ message: "Saved current account", type: Toasts.Type.SUCCESS, id: "ddt-save" });
                    }}
                >
                    Save Current
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        (window as any).TokenManager?.copyCurrentToken();
                        Toasts.show({ message: "Token copied to clipboard", type: Toasts.Type.SUCCESS, id: "ddt-copy" });
                    }}
                >
                    Copy Token
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        (window as any).TokenManager?.exportAccounts(false);
                        Toasts.show({ message: "Exported accounts (no tokens)", type: Toasts.Type.SUCCESS, id: "ddt-export" });
                    }}
                >
                    Export
                </Button>
            </div>

            <div style={{ marginTop: "20px", maxHeight: "400px", overflowY: "auto", border: "1px solid var(--background-modifier-accent)", borderRadius: "4px", padding: "10px" }}>
                {accounts.length === 0 ? (
                    <Forms.FormText style={{ textAlign: "center", padding: "20px" }}>
                        No accounts saved yet. Click "Save Current" to add this account.
                    </Forms.FormText>
                ) : (
                    accounts.map((acc: any) => (
                        <div key={acc.id} style={{ 
                            padding: "12px", 
                            marginBottom: "8px", 
                            background: "var(--background-secondary)", 
                            borderRadius: "4px"
                        }}>
                            <div style={{ fontWeight: "bold", marginBottom: "5px", color: "var(--header-primary)" }}>
                                {acc.username}#{acc.discriminator}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                Email: {acc.email || "N/A"}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                                Added: {acc.addedAt}
                            </div>
                            <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                                <Button
                                    size={Button.Sizes.TINY}
                                    color={Button.Colors.PRIMARY}
                                    onClick={() => {
                                        (window as any).TokenManager?.switchAccount(acc.id);
                                    }}
                                >
                                    Switch
                                </Button>
                                <Button
                                    size={Button.Sizes.TINY}
                                    color={Button.Colors.RED}
                                    onClick={() => {
                                        (window as any).TokenManager?.removeAccount(acc.id);
                                        setTimeout(refresh, 200);
                                        Toasts.show({ message: "Account removed", type: Toasts.Type.SUCCESS, id: "ddt-remove" });
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Forms.FormText style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
                💡 Use <code>window.TokenManager</code> in console for advanced features
            </Forms.FormText>
        </div>
    );

    const renderConsole = () => (
        <div style={{ padding: "20px" }}>
            <Forms.FormTitle tag="h3">Developer Console</Forms.FormTitle>
            <Forms.FormText>Quick access to developer tools</Forms.FormText>
            
            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                <Button
                    onClick={() => {
                        console.log("=== Discord Developer Tools ===");
                        console.log("Available APIs:");
                        console.log("• window.APIInspector - API request monitoring");
                        console.log("• window.EventLogger - Event logging");
                        console.log("• window.TokenManager - Token management");
                        Toasts.show({ message: "Help logged to console", type: Toasts.Type.INFO, id: "ddt-help" });
                    }}
                >
                    📖 Show Help
                </Button>
                
                <Button
                    onClick={() => {
                        console.clear();
                        Toasts.show({ message: "Console cleared", type: Toasts.Type.SUCCESS, id: "ddt-clear" });
                    }}
                >
                    🧹 Clear Console
                </Button>

                <Button
                    onClick={() => {
                        (window as any).APIInspector?.stats();
                        (window as any).EventLogger?.stats();
                        Toasts.show({ message: "Stats in console", type: Toasts.Type.INFO, id: "ddt-stats" });
                    }}
                >
                    📊 View All Stats
                </Button>

                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        const timestamp = Date.now();
                        (window as any).APIInspector?.exportRequests(`api-${timestamp}.json`);
                        (window as any).EventLogger?.exportEvents(`events-${timestamp}.json`);
                        Toasts.show({ message: "Exported all data", type: Toasts.Type.SUCCESS, id: "ddt-export-all" });
                    }}
                >
                    💾 Export All
                </Button>

                <Button
                    color={Button.Colors.RED}
                    onClick={() => {
                        if (confirm("Clear all logs and data?")) {
                            (window as any).APIInspector?.clearRequests();
                            (window as any).EventLogger?.clearEvents();
                            Toasts.show({ message: "All data cleared", type: Toasts.Type.SUCCESS, id: "ddt-clear-all" });
                        }
                    }}
                >
                    🗑️ Clear All Data
                </Button>

                <Button
                    onClick={() => {
                        window.open("https://discord.com/developers/docs/intro", "_blank");
                    }}
                >
                    📚 Discord API Docs
                </Button>
            </div>

            <div style={{ marginTop: "20px", padding: "15px", background: "var(--background-secondary)", borderRadius: "4px" }}>
                <Forms.FormTitle tag="h5">Console Commands</Forms.FormTitle>
                <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-normal)" }}>
                    <div style={{ marginBottom: "5px" }}>• <code>APIInspector.getRequests()</code> - Get all API requests</div>
                    <div style={{ marginBottom: "5px" }}>• <code>EventLogger.getEvents()</code> - Get all events</div>
                    <div style={{ marginBottom: "5px" }}>• <code>EventLogger.filterByType("MESSAGE_CREATE")</code> - Filter events</div>
                    <div style={{ marginBottom: "5px" }}>• <code>TokenManager.listAccounts()</code> - List saved accounts</div>
                    <div style={{ marginBottom: "5px" }}>• <code>TokenManager.help()</code> - Show all commands</div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: "500px" }}>
            <div style={{ display: "flex", borderBottom: "2px solid var(--background-modifier-accent)" }}>
                {[
                    { id: "api", label: "API Inspector", icon: "🔍" },
                    { id: "events", label: "Event Logger", icon: "📡" },
                    { id: "tokens", label: "Token Manager", icon: "🔑" },
                    { id: "console", label: "Console", icon: "💻" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: "12px",
                            background: activeTab === tab.id ? "var(--background-modifier-accent)" : "transparent",
                            border: "none",
                            borderBottom: activeTab === tab.id ? "2px solid var(--brand-500)" : "none",
                            color: activeTab === tab.id ? "var(--header-primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontWeight: activeTab === tab.id ? "bold" : "normal",
                            transition: "all 0.2s"
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "api" && renderAPIInspector()}
            {activeTab === "events" && renderEventLogger()}
            {activeTab === "tokens" && renderTokenManager()}
            {activeTab === "console" && renderConsole()}
        </div>
    );
}

export default definePlugin({
    name: "DevToolsPanel",
    description: "Unified developer tools panel with API Inspector, Event Logger, and Token Manager",
    authors: [Devs.Ven],
    tags: ["Developer", "Tools", "Panel", "UI"],

    settings,

    toolboxActions: {
        "Open DevTools Panel": () => {
            const { openModal } = require("@webpack/common");
            openModal(props => (
                <div {...props} style={{ width: "800px", maxWidth: "90vw" }}>
                    <DevToolsPanel />
                </div>
            ));
        }
    }
});
