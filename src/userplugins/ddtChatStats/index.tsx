/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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

// Clean Modern SVG Icons (NO EMOJIS)
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

function ChatStatsModal({ rootProps }: { rootProps: any }) {
    const [activeTab, setActiveTab] = useState<"overview" | "friends" | "channels" | "activity">("overview");

    const topChannels = Object.entries(stats.channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

    const friendsList = Object.values(stats.recentFriends)
        .sort((a, b) => b.lastTalked - a.lastTalked)
        .slice(0, 25);

    const totalFriendsTalked = Object.keys(stats.recentFriends).length;
    const totalActiveChannels = Object.keys(stats.channelCounts).length;

    // Peak active hour
    const peakHourEntry = Object.entries(stats.hourlyCounts).sort(([, a], [, b]) => b - a)[0];
    const peakHourText = peakHourEntry ? `${peakHourEntry[0]}:00 - ${peakHourEntry[0]}:59 (${peakHourEntry[1]} messages)` : "No data yet";

    return (
        <Modal
            {...rootProps}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "700", fontSize: "20px" }}>
                    <ChartIcon size={24} color="var(--brand-experiment, #5865F2)" />
                    <span>DDT Client Intelligence & Analytics</span>
                </div>
            }
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
            <div style={{
                width: "100%",
                maxWidth: "720px",
                minWidth: "640px",
                maxHeight: "620px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                color: "var(--text-normal)",
                overflowX: "hidden",
                boxSizing: "border-box"
            }}>
                {/* Navigation Header Tabs (SVG Icons + Clean Labels) */}
                <div style={{
                    display: "flex",
                    gap: "10px",
                    borderBottom: "1px solid var(--background-modifier-accent)",
                    paddingBottom: "10px",
                    overflowX: "hidden"
                }}>
                    {[
                        { id: "overview", label: "Overview", icon: ChartIcon, count: null },
                        { id: "friends", label: "Talked Friends", icon: UsersIcon, count: totalFriendsTalked },
                        { id: "channels", label: "Top Channels", icon: HashIcon, count: totalActiveChannels },
                        { id: "activity", label: "Peak Activity", icon: ClockIcon, count: null }
                    ].map(tab => {
                        const IconComponent = tab.icon;
                        const isCurrent = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: isCurrent ? "var(--brand-experiment, #5865F2)" : "var(--background-secondary)",
                                    color: isCurrent ? "#ffffff" : "var(--text-muted)",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    transition: "background 0.15s ease"
                                }}
                            >
                                <IconComponent size={16} color={isCurrent ? "#ffffff" : "var(--text-muted)"} />
                                <span>{tab.label}</span>
                                {tab.count !== null && (
                                    <span style={{
                                        fontSize: "11px",
                                        padding: "1px 6px",
                                        borderRadius: "10px",
                                        background: isCurrent ? "rgba(0,0,0,0.25)" : "var(--background-tertiary)"
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "14px"
                        }}>
                            <div style={{ background: "var(--background-secondary)", padding: "18px 14px", borderRadius: "10px", textAlign: "center" }}>
                                <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--brand-experiment, #5865F2)" }}>
                                    {stats.totalMessagesSent}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginTop: "4px" }}>
                                    Total Sent Messages
                                </div>
                            </div>

                            <div style={{ background: "var(--background-secondary)", padding: "18px 14px", borderRadius: "10px", textAlign: "center" }}>
                                <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--status-positive, #57F287)" }}>
                                    {totalFriendsTalked}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginTop: "4px" }}>
                                    Friends Interacted
                                </div>
                            </div>

                            <div style={{ background: "var(--background-secondary)", padding: "18px 14px", borderRadius: "10px", textAlign: "center" }}>
                                <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--status-warning, #FEE75C)" }}>
                                    {totalActiveChannels}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginTop: "4px" }}>
                                    Active Channels
                                </div>
                            </div>
                        </div>

                        {/* Peak Chatter Card */}
                        <div style={{
                            background: "var(--background-secondary-alt)",
                            padding: "14px 18px",
                            borderRadius: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <ZapIcon size={14} color="var(--status-warning, #FEE75C)" />
                                    <span>Peak Messaging Window</span>
                                </div>
                                <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>{peakHourText}</div>
                            </div>
                            <ClockIcon size={28} color="var(--text-muted)" />
                        </div>

                        {/* Top Contact Highlight */}
                        <div style={{ background: "var(--background-secondary)", padding: "14px 18px", borderRadius: "10px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", color: "var(--header-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <TrophyIcon size={15} color="var(--status-warning, #FEE75C)" />
                                <span>Most Contacted Friend</span>
                            </div>
                            {friendsList.length > 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    {friendsList[0].avatarUrl ? (
                                        <img src={friendsList[0].avatarUrl} style={{ width: "42px", height: "42px", borderRadius: "50%" }} />
                                    ) : (
                                        <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--brand-experiment, #5865F2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <UsersIcon size={20} color="#ffffff" />
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontWeight: "700", fontSize: "15px" }}>{friendsList[0].username}</div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                            {friendsList[0].count} messages exchanged • Last interacted {new Date(friendsList[0].lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                                    No friend interactions recorded yet. Send a DM to start tracking!
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: TALKED FRIENDS */}
                {activeTab === "friends" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "400px", paddingRight: "4px" }}>
                        {friendsList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
                                No direct messages or friend interactions recorded yet.
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
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--background-tertiary)"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "700", width: "22px" }}>#{i + 1}</span>
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
                                        ) : (
                                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--brand-experiment, #5865F2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <UsersIcon size={16} color="#ffffff" />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "14px" }}>{friend.username}</div>
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                                                Last: {new Date(friend.lastTalked).toLocaleDateString()} {new Date(friend.lastTalked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{
                                        background: "var(--background-tertiary)",
                                        padding: "4px 12px",
                                        borderRadius: "14px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        color: "var(--brand-experiment, #5865F2)"
                                    }}>
                                        {friend.count} msgs
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 3: TOP CHANNELS */}
                {activeTab === "channels" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "400px", paddingRight: "4px" }}>
                        {topChannels.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
                                No channel messages recorded yet.
                            </div>
                        ) : (
                            topChannels.map(([id, count], idx) => (
                                <div
                                    key={id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px 16px",
                                        background: "var(--background-secondary)",
                                        borderRadius: "8px"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "75%" }}>
                                        <span style={{ color: "var(--text-muted)", fontSize: "13px", width: "20px", fontWeight: "700" }}>#{idx + 1}</span>
                                        <HashIcon size={16} color="var(--text-muted)" />
                                        <span style={{ fontWeight: "600", fontSize: "13.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {getChannelName(id)}
                                        </span>
                                    </div>
                                    <span style={{
                                        background: "var(--background-tertiary)",
                                        padding: "4px 12px",
                                        borderRadius: "14px",
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <ClockIcon size={14} color="var(--text-muted)" />
                            <span>24-Hour Messaging Activity Distribution</span>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 1fr)",
                            gap: "8px",
                            maxHeight: "360px",
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
                                            borderRadius: "8px",
                                            padding: "10px 6px",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>{hourKey}:00</div>
                                        <div style={{ fontSize: "15px", fontWeight: "800", marginTop: "3px", color: count > 0 ? "var(--brand-experiment, #5865F2)" : "var(--text-muted)" }}>
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
