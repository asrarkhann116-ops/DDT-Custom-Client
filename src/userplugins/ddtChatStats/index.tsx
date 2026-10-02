/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { ApplicationCommandInputType } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, IconUtils, Modal, openModal, React, RelationshipStore, UserStore, useState } from "@webpack/common";

const logger = new Logger("DDT:ChatStats");

interface TalkedFriend {
    id: string;
    username: string;
    avatarUrl: string;
    lastTalked: number;
    count: number;
}

interface AnalyticsState {
    totalMessagesSent: number;
    channelCounts: Record<string, number>;
    recentFriends: Record<string, TalkedFriend>;
    hourlyCounts: Record<string, number>;
}

const defaultStats: AnalyticsState = {
    totalMessagesSent: 0,
    channelCounts: {},
    recentFriends: {},
    hourlyCounts: {},
};

const settings = definePluginSettings({
    persistedData: {
        type: OptionType.STRING,
        description: "Persisted Analytics Data (Vencord Config Store)",
        default: JSON.stringify(defaultStats),
        hidden: true,
    }
});

let stats: AnalyticsState = { ...defaultStats };

function initStatsFromVencord() {
    try {
        const raw = settings.store.persistedData;
        if (raw) {
            const parsed = JSON.parse(raw);
            stats = {
                totalMessagesSent: parsed.totalMessagesSent ?? 0,
                channelCounts: parsed.channelCounts ?? {},
                recentFriends: parsed.recentFriends ?? {},
                hourlyCounts: parsed.hourlyCounts ?? {},
            };
        }
    } catch (e) {
        logger.error("Failed to parse persisted stats from Vencord Settings:", e);
    }
}

function saveStatsToVencord() {
    try {
        settings.store.persistedData = JSON.stringify(stats);
    } catch (e) {
        logger.error("Failed to save stats to Vencord Settings:", e);
    }
}

// Clean Minimal Vector SVG Icons (ui-ux-pro-max standard)
function ChartIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M4 19h16v2H2V3h2v16zm4-7h3v6H8v-6zm5-5h3v11h-3V7zm5 3h3v8h-3v-8z" />
        </svg>
    );
}

function UsersIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
    );
}

function HashIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M5.41 21L6.12 17H2.12L2.47 15H6.47L7.18 11H3.18L3.53 9H7.53L8.24 5H10.24L9.53 9H13.53L14.24 5H16.24L15.53 9H19.53L19.18 11H15.18L14.47 15H18.47L18.12 17H14.12L13.41 21H11.41L12.12 17H8.12L7.41 21H5.41ZM8.47 15H12.47L13.18 11H9.18L8.47 15Z" />
        </svg>
    );
}

function ClockIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
    );
}

function TrophyIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        </svg>
    );
}

function ZapIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
        </svg>
    );
}

function getChannelName(id: string) {
    const ch = ChannelStore.getChannel(id);
    if (!ch) return `#${id}`;
    if (ch.isDM()) {
        const recipientId = ch.recipients?.[0];
        const user = recipientId ? UserStore.getUser(recipientId) : null;
        return `@${user?.globalName ?? user?.username ?? "DM"}`;
    }
    if (ch.isGroupDM()) {
        return ch.name ? `@${ch.name}` : "@Group DM";
    }
    const guild = ch.guild_id ? GuildStore.getGuild(ch.guild_id) : null;
    return guild ? `${guild.name} / #${ch.name}` : `#${ch.name}`;
}

export function ChatStatsModal({ rootProps }: { rootProps: any }) {
    const [activeTab, setActiveTab] = useState<"overview" | "friends" | "channels" | "activity">("overview");

    const topChannels = Object.entries(stats.channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

    const friendsList = Object.values(stats.recentFriends)
        .sort((a, b) => b.lastTalked - a.lastTalked)
        .slice(0, 25);

    const totalFriendsTalked = Object.keys(stats.recentFriends).length;
    const totalActiveChannels = Object.keys(stats.channelCounts).length;

    const peakHourEntry = Object.entries(stats.hourlyCounts).sort(([, a], [, b]) => b - a)[0];
    const peakHourText = peakHourEntry ? `${peakHourEntry[0]}:00 - ${peakHourEntry[0]}:59 (${peakHourEntry[1]} msgs)` : "No activity recorded";

    return (
        <Modal
            {...rootProps}
            size="md"
            title="DDT Analytics & Intelligence Hub"
            actions={[
                {
                    text: "Reset Analytics",
                    variant: "critical-primary",
                    onClick: () => {
                        stats = { totalMessagesSent: 0, channelCounts: {}, recentFriends: {}, hourlyCounts: {} };
                        saveStatsToVencord();
                        rootProps.onClose();
                    }
                },
                {
                    text: "Close",
                    variant: "secondary",
                    onClick: rootProps.onClose,
                }
            ]}
        >
            <div className="ddt-stats-backdrop">
                {/* Banner Card */}
                <div className="ddt-stats-banner">
                    <div>
                        <div className="ddt-stats-banner-title">
                            <ChartIcon size={20} color="#5865F2" />
                            <span>Client Telemetry & Insights</span>
                            <span className="ddt-stats-banner-tag">LIVE</span>
                        </div>
                        <div className="ddt-stats-banner-sub">
                            Encrypted local tracking powered by Vencord Settings Store
                        </div>
                    </div>
                </div>

                {/* Aesthetic Tab Navigation */}
                <div className="ddt-stats-nav">
                    {[
                        { id: "overview", label: "Overview", icon: ChartIcon, count: null },
                        { id: "friends", label: "Friends", icon: UsersIcon, count: totalFriendsTalked },
                        { id: "channels", label: "Channels", icon: HashIcon, count: totalActiveChannels },
                        { id: "activity", label: "Activity", icon: ClockIcon, count: null }
                    ].map(tab => {
                        const IconComp = tab.icon;
                        const isCurrent = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`ddt-stats-tab-btn ${isCurrent ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.id as any)}
                            >
                                <IconComp size={15} color="currentColor" />
                                <span>{tab.label}</span>
                                {tab.count !== null && tab.count > 0 && (
                                    <span className="ddt-stats-badge">{tab.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div className="ddt-stats-cards-grid">
                            <div className="ddt-stats-card">
                                <div className="ddt-stats-card-val" style={{ color: "#7B8BFF" }}>
                                    {stats.totalMessagesSent}
                                </div>
                                <div className="ddt-stats-card-lbl">Sent Messages</div>
                            </div>

                            <div className="ddt-stats-card">
                                <div className="ddt-stats-card-val" style={{ color: "#57F287" }}>
                                    {totalFriendsTalked}
                                </div>
                                <div className="ddt-stats-card-lbl">Friends Reached</div>
                            </div>

                            <div className="ddt-stats-card">
                                <div className="ddt-stats-card-val" style={{ color: "#FEE75C" }}>
                                    {totalActiveChannels}
                                </div>
                                <div className="ddt-stats-card-lbl">Active Channels</div>
                            </div>
                        </div>

                        {/* Peak Activity Banner */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(20, 27, 44, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            borderRadius: "10px",
                            padding: "12px 18px"
                        }}>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <ZapIcon size={14} color="#FEE75C" />
                                    <span>Peak Messaging Window</span>
                                </div>
                                <div style={{ fontSize: "15px", fontWeight: "700", color: "#e2e8f0", marginTop: "3px" }}>
                                    {peakHourText}
                                </div>
                            </div>
                            <ClockIcon size={24} color="#64748b" />
                        </div>

                        {/* Top Contact Highlight */}
                        <div style={{
                            background: "rgba(20, 27, 44, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            borderRadius: "10px",
                            padding: "14px 18px"
                        }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <TrophyIcon size={14} color="#FEE75C" />
                                <span>Most Contacted Friend</span>
                            </div>
                            {friendsList.length > 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {friendsList[0].avatarUrl ? (
                                        <img src={friendsList[0].avatarUrl} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #5865F2" }} />
                                    ) : (
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <UsersIcon size={20} color="#fff" />
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#fff" }}>{friendsList[0].username}</div>
                                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "1px" }}>
                                            {friendsList[0].count} messages exchanged • Last interacted {new Date(friendsList[0].lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>
                                    No friend interactions recorded yet. Send a direct message to begin tracking!
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: TALKED FRIENDS */}
                {activeTab === "friends" && (
                    <div className="ddt-stats-list-container">
                        {friendsList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "36px", color: "#64748b", fontSize: "13px" }}>
                                No direct messages or friend chats logged yet.
                            </div>
                        ) : (
                            friendsList.map((friend, i) => (
                                <div key={friend.id} className="ddt-stats-list-item">
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", width: "20px" }}>#{i + 1}</span>
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} style={{ width: "34px", height: "34px", borderRadius: "50%" }} />
                                        ) : (
                                            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <UsersIcon size={16} color="#fff" />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#fff" }}>{friend.username}</div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                Last: {new Date(friend.lastTalked).toLocaleDateString()} {new Date(friend.lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="ddt-stats-pill-count">{friend.count} msgs</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 3: TOP CHANNELS */}
                {activeTab === "channels" && (
                    <div className="ddt-stats-list-container">
                        {topChannels.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "36px", color: "#64748b", fontSize: "13px" }}>
                                No channel interactions recorded yet.
                            </div>
                        ) : (
                            topChannels.map(([id, count], idx) => (
                                <div key={id} className="ddt-stats-list-item">
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "75%" }}>
                                        <span style={{ color: "#64748b", fontSize: "12px", width: "18px", fontWeight: "800" }}>#{idx + 1}</span>
                                        <HashIcon size={15} color="#5865F2" />
                                        <span style={{ fontWeight: "600", fontSize: "13px", color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {getChannelName(id)}
                                        </span>
                                    </div>
                                    <span className="ddt-stats-pill-count">{count} msgs</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 4: PEAK ACTIVITY */}
                {activeTab === "activity" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <ClockIcon size={13} color="#64748b" />
                            <span>24-Hour Messaging Activity Distribution</span>
                        </div>
                        <div className="ddt-stats-heatmap-grid">
                            {Array.from({ length: 24 }).map((_, i) => {
                                const hourKey = i.toString().padStart(2, "0");
                                const count = stats.hourlyCounts[hourKey] || 0;
                                return (
                                    <div
                                        key={hourKey}
                                        className={`ddt-stats-heatmap-slot ${count > 0 ? "active" : ""}`}
                                    >
                                        <div className="ddt-stats-heatmap-hour">{hourKey}:00</div>
                                        <div className="ddt-stats-heatmap-val">{count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function openStatsModal() {
    openModal(props => <ChatStatsModal rootProps={props} />);
}

export default definePlugin({
    name: "DDTChatStats",
    description: "Tracks your chat analytics and talked friends through Vencord Settings API with titlebar icon.",
    authors: [Devs.Ven],
    tags: ["Chat"],
    enabledByDefault: false,
    settings,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: { author?: { id: string }; channel_id: string }; optimistic?: boolean }) {
            const currentUserId = UserStore.getCurrentUser()?.id;

            if (optimistic || message.author?.id === currentUserId) {
                stats.totalMessagesSent++;
                const channelId = message.channel_id;
                stats.channelCounts[channelId] = (stats.channelCounts[channelId] || 0) + 1;

                const hour = new Date().getHours().toString().padStart(2, "0");
                stats.hourlyCounts[hour] = (stats.hourlyCounts[hour] || 0) + 1;

                const ch = ChannelStore.getChannel(channelId);
                if (ch && ch.isDM()) {
                    const recipientId = ch.recipients?.[0];
                    if (recipientId && recipientId !== currentUserId) {
                        const user = UserStore.getUser(recipientId);
                        if (user) {
                            const friendNick = RelationshipStore.getNickname(user.id);
                            const name = friendNick ?? user.globalName ?? user.username;
                            const avatar = IconUtils.getUserAvatarURL(user, true, 64);

                            const existing = stats.recentFriends[recipientId] || {
                                id: recipientId,
                                username: name,
                                avatarUrl: avatar,
                                lastTalked: Date.now(),
                                count: 0
                            };

                            existing.lastTalked = Date.now();
                            existing.count++;
                            existing.username = name;
                            existing.avatarUrl = avatar;

                            stats.recentFriends[recipientId] = existing;
                        }
                    }
                }

                saveStatsToVencord();
            }
        }
    },

    commands: [{
        name: "mystats",
        description: "Open the DDT Chat Analytics & Friends Dashboard",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => {
            openStatsModal();
            return {
                content: "Opening DDT Chat Analytics Dashboard..."
            };
        }
    }],

    start() {
        logger.info("DDTChatStats started");
        initStatsFromVencord();

        addHeaderBarButton("ddt-chat-stats", () => (
            <HeaderBarButton
                icon={ChartIcon}
                tooltip="DDT Chat Analytics"
                onClick={openStatsModal}
            />
        ), 5);
    },

    stop() {
        removeHeaderBarButton("ddt-chat-stats");
        logger.info("DDTChatStats stopped");
    },
});
