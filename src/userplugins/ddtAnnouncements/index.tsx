/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { GithubIcon, OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { closeModal, Modal, openModal } from "@webpack/common";

const DISCORD_URL = "https://discord.gg/AVFfV8fXAN";
const GITHUB_URL = "https://github.com/asrarkhann116-ops/DDT-Custom-Client/tree/main";
const cl = classNameFactory("vc-DDT-announcements-");
const DISCORD_LOCK_UNLOCKED_EVENT = "vencord-discordlock-unlocked";

let hasOpened = false;
let pendingOpen = false;
let pendingForceOpen = false;

const settings = definePluginSettings({
    hideFromToolbox: {
        type: OptionType.BOOLEAN,
        description: "Hide this plugin from DDT Toolbox.",
        default: true
    },
    showStartupModal: {
        type: OptionType.BOOLEAN,
        description: "Show the DDT announcements popup on startup.",
        default: true
    }
});

interface AnnouncementModalProps {
    modalProps: RenderModalProps;
}

function openExternal(url: string) {
    VencordNative.native.openExternal(url);
}

function isDiscordLockActive() {
    return document.documentElement.dataset.discordLockActive === "true" || document.getElementById("vcl-overlay") != null;
}

function deferUntilDiscordUnlock(force: boolean) {
    pendingForceOpen ||= force;
    if (pendingOpen) return;

    pendingOpen = true;
    window.addEventListener(DISCORD_LOCK_UNLOCKED_EVENT, () => {
        const forceOpen = pendingForceOpen;
        pendingOpen = false;
        pendingForceOpen = false;
        openDDTAnnouncementModal(forceOpen);
    }, { once: true });
}

function DDTAnnouncementModal({ modalProps }: AnnouncementModalProps) {
    const dismissForever = () => {
        settings.store.showStartupModal = false;
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            size="md"
            title={<BaseText tag="h2" size="lg" weight="semibold" className={cl("title")}>DDT Updates</BaseText>}
            subtitle="Join the Discord server for updates, announcements, issue notices, and a direct place to contact the DDT maintainer."
            actions={[
                {
                    text: "Do not show again",
                    variant: "secondary",
                    onClick: dismissForever
                },
                {
                    text: "Continue",
                    variant: "primary",
                    onClick: modalProps.onClose
                }
            ]}
        >
            <div className={cl("modal")}>
            <div className={cl("content")}>
                <div className={cl("actions")}>
                    <section className={cl("action")}>
                        <div>
                            <BaseText size="md" weight="semibold">Discord community</BaseText>
                            <BaseText tag="p" size="sm" color="text-muted">
                                Updates, announcements, problem reports, and support contact live here.
                            </BaseText>
                        </div>
                        <Button onClick={() => openExternal(DISCORD_URL)} className={cl("action-button")}>
                            Join Discord
                            <OpenExternalIcon height={16} width={16} />
                        </Button>
                    </section>

                    <section className={cl("action")}>
                        <div>
                            <BaseText size="md" weight="semibold">Source code</BaseText>
                            <BaseText tag="p" size="sm" color="text-muted">
                                Star the GitHub repository if DDT is useful to you.
                            </BaseText>
                        </div>
                        <Button variant="secondary" onClick={() => openExternal(GITHUB_URL)} className={cl("action-button")}>
                            Star on GitHub
                            <GithubIcon height={16} width={16} />
                        </Button>
                    </section>
                </div>
            </div>
            </div>
        </Modal>
    );
}

const SafeDDTAnnouncementModal = ErrorBoundary.wrap(DDTAnnouncementModal, { noop: true });

function DDTAnnouncementSettings() {
    return (
        <div className={cl("settings")}>
            <BaseText tag="p" size="sm" color="text-muted">
                You can reopen the announcement popup here whenever you want.
            </BaseText>
            <Button size="small" onClick={() => openDDTAnnouncementModal(true)}>
                Open popup
            </Button>
        </div>
    );
}

const SafeDDTAnnouncementSettings = ErrorBoundary.wrap(DDTAnnouncementSettings, { noop: true });

export function openDDTAnnouncementModal(force = false) {
    if (!force && (!settings.store.showStartupModal || hasOpened)) return;
    if (isDiscordLockActive()) {
        deferUntilDiscordUnlock(force);
        return;
    }

    hasOpened = true;
    const modalKey = openModal(modalProps => (
        <ErrorBoundary noop onError={() => closeModal(modalKey)}>
            <SafeDDTAnnouncementModal modalProps={modalProps} />
        </ErrorBoundary>
    ));
}

export default definePlugin({
    name: "DDTAnnouncements",
    description: "Shows DDT Discord and GitHub announcements.",
    tags: ["Utility"],
    authors: [Devs.irritably],
    required: true,
    enabledByDefault: true,
    settings,
    settingsAboutComponent: SafeDDTAnnouncementSettings,
    get toolboxActions(): Record<string, () => void> {
        if (settings.store.hideFromToolbox) return {};

        return {
            "Open DDT popup": () => openDDTAnnouncementModal(true)
        };
    },
    flux: {
        POST_CONNECTION_OPEN() {
            openDDTAnnouncementModal();
        }
    }
});
