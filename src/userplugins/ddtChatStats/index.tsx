/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 DDT Custom Client contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { ApplicationCommandInputType } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Modal, openModal, React } from "@webpack/common";

const logger = new Logger("DDT:ChatStats");

interface ChatStats {
    totalMessagesSent: number;
    channelCounts: Record<string, number>;
}

const stats: ChatStats = {
    totalMessagesSent: 0,
    channelCounts: {},
};

function StatsIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" width={props.width ?? 20} height={props.height ?? 20} fill="currentColor">
            <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
        </svg>
    );
}

function ChatStatsModal({ rootProps }: { rootProps: any }) {
    const topChannels = Object.entries(stats.channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return (
        <Modal
            {...rootProps}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "18px" }}>
                    <span>📊</span>
                    <span>DDT Chat Analytics Dashboard</span>
                </div>
            }
            actions={[
                {
                    text: "Close",
                    variant: "secondary",
                    onClick: rootProps.onClose,
                }
            ]}
        >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", color: "var(--text-normal)" }}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    background: "var(--background-secondary)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid var(--background-tertiary)"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-accent, #5865F2)" }}>
                            {stats.totalMessagesSent}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Total Messages Sent
                        </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--status-positive, #57F287)" }}>
                            {Object.keys(stats.channelCounts).length}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Active Channels
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", color: "var(--header-secondary)" }}>
                        🔥 Top Active Channels
                    </h3>
                    {topChannels.length === 0 ? (
                        <div style={{ fontStyle: "italic", color: "var(--text-muted)", padding: "12px", textAlign: "center" }}>
                            No messages recorded yet in this session. Start chatting!
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {topChannels.map(([id, count], idx) => (
                                <div
                                    key={id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "8px 12px",
                                        background: "var(--background-secondary-alt)",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ color: "var(--text-muted)", fontSize: "12px", width: "16px" }}>#{idx + 1}</span>
                                        <span style={{ fontWeight: "500" }}>&lt;#{id}&gt;</span>
                                    </span>
                                    <span style={{
                                        background: "var(--background-tertiary)",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: "600"
                                    }}>
                                        {count} msg{count === 1 ? "" : "s"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function openStatsModal() {
    openModal(props => <ChatStatsModal rootProps={props} />);
}

export default definePlugin({
    name: "DDTChatStats",
    description: "Tracks your chat analytics locally and shows a stats icon in the titlebar.",
    authors: [Devs.Ven],
    tags: ["Chat"],
    enabledByDefault: false,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: { author?: { id: string }; channel_id: string }; optimistic?: boolean }) {
            if (optimistic) {
                stats.totalMessagesSent++;
                const channelId = message.channel_id;
                stats.channelCounts[channelId] = (stats.channelCounts[channelId] || 0) + 1;
            }
        }
    },

    commands: [{
        name: "mystats",
        description: "Open the DDT Chat Analytics Dashboard",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => {
            openStatsModal();
            return {
                content: "📊 Opening DDT Chat Analytics Dashboard..."
            };
        }
    }],

    start() {
        logger.info("DDTChatStats started");
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
