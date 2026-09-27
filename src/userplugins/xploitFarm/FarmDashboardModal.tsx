/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// LOCK: Coming Soon — restore full FarmDashboardModal.tsx from git when backend is redeployed.

import { openModal } from "@utils/modal";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, React } from "@webpack/common";

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export function FarmDashboardModal({ rootProps }: { rootProps: RenderModalProps; apiBase?: string }) {
    return (
        <Modal
            {...rootProps}
            size="md"
            title="Xploit Farm • Member Injection Hub"
        >
            <div className="ddt-farm-modal">
                <div className="ddt-farm-lock-card">
                    <div className="ddt-farm-lock-icon-wrap">
                        <LockIcon />
                    </div>
                    <div className="ddt-farm-lock-badge">
                        Coming Soon
                    </div>
                    <div className="ddt-farm-lock-heading">Feature Locked</div>
                    <div className="ddt-farm-lock-desc">
                        The Xploit Member Farm Hub is currently under maintenance.<br />
                        Live farming will be available once the backend is redeployed.<br /><br />
                        Stay tuned in the Xploit HUB server for updates.
                    </div>
                    <a
                        href="https://discord.gg/3fb9Q7ucSN"
                        target="_blank"
                        rel="noreferrer"
                        className="ddt-farm-btn-action ddt-farm-btn-primary"
                        style={{ marginTop: "4px" }}
                    >
                        Join Xploit HUB
                    </a>
                </div>
            </div>
        </Modal>
    );
}

export function openFarmDashboardModal(apiBase: string) {
    openModal(props => <FarmDashboardModal rootProps={props} apiBase={apiBase} />);
}
