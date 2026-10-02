/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { ApplicationCommandInputType } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { ChannelRouter, ChannelStore, GuildStore, IconUtils, Modal, openModal, React, RelationshipStore, UserStore, useState } from "@webpack/common";

const logger = new Logger("DDT:ChatStats");

const STATS_STORAGE_KEY = "DDT_ChatStats_Data_v1";

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
    hourlyCounts: Record<string, number>; // "00" through "23"
}

let stats: AnalyticsState = {
    totalMessagesSent: 0,
    channelCounts: {},
    recentFriends: {},
    hourlyCounts: {},
};

async function loadPersistedStats() {
    try {
        const saved = await DataStore.get<AnalyticsState>(STATS_STORAGE_KEY);
        if (saved) {
            stats = {
                totalMessagesSent: saved.totalMessagesSent ?? 0,
                channelCounts: saved.channelCounts ?? {},
                recentFriends: saved.recentFriends ?? {},
                hourlyCounts: saved.hourlyCounts ?? {},
            };
        }
    } catch (e) {
        logger.error("Failed to load persisted stats", e);
    }
}

function saveStatsDebounced() {
    void DataStore.set(STATS_STORAGE_KEY, stats);
}

function StatsIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" width={props.width ?? 20} height={props.height ?? 20} fill="currentColor">
            <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
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
    return guild ? `${guild.name} » #${ch.name}` : `#${ch.name}`;
}

function ChatStatsModal({ rootProps }: { rootProps: any }) {
    const [activeTab, setActiveTab] = useState<"overview" | "friends" | "channels" | "activity">("overview");

    const topChannels = Object.entries(stats.channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

    const friendsList = Object.values(stats.recentFriends)
        .sort((a, b) => b.lastTalked - a.lastTalked)
        .slice(0, 20);

    const totalFriendsTalked = Object.keys(stats.recentFriends).length;
    const totalActiveChannels = Object.keys(stats.channelCounts).length;

    // Peak active hour
    const peakHourEntry = Object.entries(stats.hourlyCounts).sort(([, a], [, b]) => b - a)[0];
    const peakHourText = peakHourEntry ? `${peakHourEntry[0]}:00 - ${peakHourEntry[0]}:59 (${peakHourEntry[1]} msgs)` : "No data yet";

    return (
        <Modal
            {...rootProps}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", fontSize: "19px" }}>
                    <span style={{ fontSize: "22px" }}>📊</span>
                    <span>DDT Client Intelligence & Chat Analytics</span>
                </div>
            }
            actions={[
                {
                    text: "Clear Stats",
                    variant: "critical-primary",
                    onClick: () => {
                        stats = { totalMessagesSent: 0, channelCounts: {}, recentFriends: {}, hourlyCounts: {} };
                        saveStatsDebounced();
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
            <div style={{ minWidth: "550px", maxHeight: "580px", display: "flex", flexDirection: "column", gap: "14px", color: "var(--text-normal)" }}>
                {/* Navigation Tabs */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "8px" }}>
                    {[
                        { id: "overview", label: "📈 Overview", count: null },
                        { id: "friends", label: "👥 Talked Friends", count: totalFriendsTalked },
                        { id: "channels", label: "💬 Top Channels", count: totalActiveChannels },
                        { id: "activity", label: "⏰ Peak Activity", count: null }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                border: "none",
                                background: activeTab === tab.id ? "var(--brand-experiment, #5865F2)" : "var(--background-secondary)",
                                color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.15s ease"
                            }}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== null && (
                                <span style={{
                                    fontSize: "11px",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                    background: activeTab === tab.id ? "rgba(0,0,0,0.25)" : "var(--background-tertiary)"
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "10px"
                        }}>
                            <div style={{ background: "var(--background-secondary)", padding: "14px", borderRadius: "8px", textAlign: "center" }}>
                                <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-accent, #5865F2)" }}>
                                    {stats.totalMessagesSent}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", marginTop: "4px" }}>
                                    Total Sent Messages
                                </div>
                            </div>

                            <div style={{ background: "var(--background-secondary)", padding: "14px", borderRadius: "8px", textAlign: "center" }}>
                                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#57F287" }}>
                                    {totalFriendsTalked}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", marginTop: "4px" }}>
                                    Friends Interacted
                                </div>
                            </div>

                            <div style={{ background: "var(--background-secondary)", padding: "14px", borderRadius: "8px", textAlign: "center" }}>
                                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FEE75C" }}>
                                    {totalActiveChannels}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", marginTop: "4px" }}>
                                    Channels Used
                                </div>
                            </div>
                        </div>

                        <div style={{ background: "var(--background-secondary-alt)", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>⚡ Peak Chatter Time</div>
                                <div style={{ fontSize: "15px", fontWeight: "600", marginTop: "2px" }}>{peakHourText}</div>
                            </div>
                            <span style={{ fontSize: "24px" }}>🔥</span>
                        </div>

                        <div style={{ background: "var(--background-secondary)", padding: "12px 14px", borderRadius: "8px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", color: "var(--header-secondary)" }}>
                                🏆 Most Contacted Friend
                            </div>
                            {friendsList.length > 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {friendsList[0].avatarUrl ? (
                                        <img src={friendsList[0].avatarUrl} style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
                                    ) : (
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>
                                    )}
                                    <div>
                                        <div style={{ fontWeight: "600", fontSize: "14px" }}>{friendsList[0].username}</div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            {friendsList[0].count} messages exchanged • Last talked {new Date(friendsList[0].lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>No friend interactions recorded yet.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: TALKED FRIENDS */}
                {activeTab === "friends" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "380px", paddingRight: "4px" }}>
                        {friendsList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                                👥 No direct messages or friend interactions recorded yet.
                            </div>
                        ) : (
                            friendsList.map((friend, i) => (
                                <div
                                    key={friend.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        background: "var(--background-secondary)",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--background-tertiary)"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold", width: "18px" }}>#{i + 1}</span>
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                                        ) : (
                                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>👤</div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "13px" }}>{friend.username}</div>
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                                Last: {new Date(friend.lastTalked).toLocaleDateString()} {new Date(friend.lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{
                                            background: "var(--background-tertiary)",
                                            padding: "3px 9px",
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            color: "var(--text-accent, #5865F2)"
                                        }}>
                                            {friend.count} msgs
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 3: TOP CHANNELS */}
                {activeTab === "channels" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "380px", paddingRight: "4px" }}>
                        {topChannels.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                                💬 No channel messages recorded yet.
                            </div>
                        ) : (
                            topChannels.map(([id, count], idx) => (
                                <div
                                    key={id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "10px 14px",
                                        background: "var(--background-secondary)",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "75%" }}>
                                        <span style={{ color: "var(--text-muted)", fontSize: "12px", width: "16px", fontWeight: "bold" }}>#{idx + 1}</span>
                                        <span style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {getChannelName(id)}
                                        </span>
                                    </div>
                                    <span style={{
                                        background: "var(--background-tertiary)",
                                        padding: "3px 9px",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: "600"
                                    }}>
                                        {count} msg{count === 1 ? "" : "s"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 4: PEAK ACTIVITY */}
                {activeTab === "activity" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                            24-Hour Messaging Activity Distribution
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 1fr)",
                            gap: "8px",
                            maxHeight: "340px",
                            overflowY: "auto"
                        }}>
                            {Array.from({ length: 24 }).map((_, i) => {
                                const hourKey = i.toString().padStart(2, "0");
                                const count = stats.hourlyCounts[hourKey] || 0;
                                return (
                                    <div
                                        key={hourKey}
                                        style={{
                                            background: count > 0 ? "rgba(88, 101, 242, 0.15)" : "var(--background-secondary)",
                                            border: count > 0 ? "1px solid var(--brand-experiment, #5865F2)" : "1px solid transparent",
                                            borderRadius: "6px",
                                            padding: "8px",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>{hourKey}:00</div>
                                        <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: "2px", color: count > 0 ? "var(--text-accent, #5865F2)" : "var(--text-muted)" }}>
                                            {count}
                                        </div>
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
    description: "Tracks your chat analytics, recently talked friends, peak hours with a titlebar icon.",
    authors: [Devs.Ven],
    tags: ["Chat"],
    enabledByDefault: false,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: { author?: { id: string }; channel_id: string; timestamp?: string }; optimistic?: boolean }) {
            const currentUserId = UserStore.getCurrentUser()?.id;

            // Track sent messages or DM interactions
            if (optimistic || message.author?.id === currentUserId) {
                stats.totalMessagesSent++;
                const channelId = message.channel_id;
                stats.channelCounts[channelId] = (stats.channelCounts[channelId] || 0) + 1;

                // Track hour
                const hour = new Date().getHours().toString().padStart(2, "0");
                stats.hourlyCounts[hour] = (stats.hourlyCounts[hour] || 0) + 1;

                // Track DM Friend if applicable
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

                saveStatsDebounced();
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
                content: "📊 Opening DDT Chat Analytics Dashboard..."
            };
        }
    }],

    async start() {
        logger.info("DDTChatStats started");
        await loadPersistedStats();

        addHeaderBarButton("ddt-chat-stats", () => (
            <HeaderBarButton
                icon={StatsIcon}
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
