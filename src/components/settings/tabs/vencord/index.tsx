/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { FolderIcon, GithubIcon, LinkIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/Icons";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SpecialCard } from "@components/settings/SpecialCard";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openContributorModal } from "@components/settings/tabs/plugins/ContributorModal";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import SettingsPlugin from "@plugins/_core/settings";
import { gitRemote } from "@shared/vencordUserAgent";
import { IS_WINDOWS } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { ConfirmModal, Forms, openModal, React, useMemo, UserStore } from "@webpack/common";

import { DonateButtonComponent, isDonor } from "./DonateButton";
import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";
// @ts-ignore
import ddtWaifu from "file://./ddt_waifu.webp?base64";
// @ts-ignore
import ddtWaifu2 from "file://./ddt_waifu2.webp?base64";
// @ts-ignore
import ddtWaifu3 from "file://./ddt_waifu3.webp?base64";
// @ts-ignore
import ddtWaifu4 from "file://./ddt_waifu4.webp?base64";

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";
const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";
const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function Switches() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "frameless", "winNativeTitleBar", "transparent", "winCtrlQ", "disableMinSize", "showWaifuBanner"]);

    const Switches = [
        {
            key: "showWaifuBanner",
            title: "Show Waifu Banner",
            description: "Toggle the visibility of the waifu support banner at the top of the Developer Tools tab"
        },
        {
            key: "useQuickCss",
            title: "Enable Custom CSS",
            description: "Apply your configured QuickCSS"
        },
        !IS_WEB && (!IS_DISCORD_DESKTOP || !IS_WINDOWS ? {
            key: "frameless",
            title: "Disable the window frame",
            restartRequired: true
        } : {
            key: "winNativeTitleBar",
            title: "Use Windows' native title bar instead of Discord's custom one",
            restartRequired: true
        }),
        !IS_WEB && {
            key: "transparent",
            title: "Enable window transparency",
            description: "A theme that supports transparency is required or this will do nothing. Stops the window from being resizable as a side effect",
            restartRequired: true
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: "Disable minimum window size",
            description: "Allows you to resize the window to any size, even smaller than Discord's minimum size",
            restartRequired: true
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
            restartRequired: true
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: "Enable React Developer Tools",
            description: "Mainly useful for plugin developers. Ignore this if you don't know what it is",
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
    }>;

    return Switches.map(setting => {
        if (!setting) {
            return null;
        }

        const { key, title, description, restartRequired } = setting;

        return (
            <FormSwitch
                key={key}
                title={title}
                description={description}
                value={settings[key]}
                hideBorder
                onChange={v => {
                    settings[key] = v;

                    if (restartRequired) {
                        openModal(props => (
                            <ConfirmModal
                                {...props}
                                title="Restart Required"
                                subtitle="A restart is required to apply this change"
                                confirmText="Restart now"
                                cancelText="Later!"
                                variant="primary"
                                onConfirm={relaunch}
                            />
                        ));
                    }
                }}
            />
        );
    });
}

function VencordSettings() {
    const settings = useSettings(["showWaifuBanner"]);
    const donateImage = useMemo(() =>
        Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE,
        []
    );

    const user = UserStore?.getCurrentUser();

    return (
        <SettingsTab>
            {/* DDT Waifu Banner */}
            {settings.showWaifuBanner && (
            <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "0px",
                marginBottom: "8px",
                padding: "8px 0 0 0",
            }}>
                {/* Waifu 1 — front view */}
                <img
                    src={`data:image/webp;base64,${ddtWaifu}`}
                    style={{
                        height: "280px",
                        objectFit: "contain",
                        imageRendering: "auto",
                        filter: "drop-shadow(0 8px 24px rgba(88, 101, 242, 0.35))"
                    }}
                    alt="DDT Waifu"
                />
                {/* Waifu 3 — pink doggy pose */}
                <img
                    src={`data:image/webp;base64,${ddtWaifu3}`}
                    style={{
                        height: "280px",
                        objectFit: "contain",
                        imageRendering: "auto",
                        filter: "drop-shadow(0 8px 24px rgba(255, 100, 180, 0.4))"
                    }}
                    alt="DDT Waifu 3"
                />
                {/* Middle: support text */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 12px",
                    marginBottom: "40px",
                    gap: "6px",
                }}>
                    <div style={{
                        letterSpacing: "0.15em",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        textAlign: "center",
                        background: "linear-gradient(90deg, #5865F2, #a0aeff, #5865F2)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        lineHeight: 1.4,
                    }}>
                        ✦ Feel free to<br />support us ✦
                    </div>
                    <div style={{ fontSize: "22px", opacity: 0.6, lineHeight: 1 }}>↔</div>
                </div>
                {/* Waifu 2 — back view standing */}
                <img
                    src={`data:image/webp;base64,${ddtWaifu2}`}
                    style={{
                        height: "280px",
                        objectFit: "contain",
                        imageRendering: "auto",
                        filter: "drop-shadow(0 8px 24px rgba(88, 101, 242, 0.35))"
                    }}
                    alt="DDT Waifu 2"
                />
                {/* Waifu 4 — purple bikini doggy */}
                <img
                    src={`data:image/webp;base64,${ddtWaifu4}`}
                    style={{
                        height: "280px",
                        objectFit: "contain",
                        imageRendering: "auto",
                        filter: "drop-shadow(0 8px 24px rgba(200, 80, 255, 0.4))"
                    }}
                    alt="DDT Waifu 4"
                />
            </div>
            )}
            <section>
                <Forms.FormTitle tag="h5">Quick Actions</Forms.FormTitle>

                <QuickActionCard>
                    <QuickAction
                        Icon={LogIcon}
                        text="Notification Log"
                        action={openNotificationLogModal}
                    />
                    <QuickAction
                        Icon={PaintbrushIcon}
                        text="Edit QuickCSS"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                    {!IS_WEB && (
                        <>
                            <QuickAction
                                Icon={RestartIcon}
                                text="Relaunch Discord"
                                action={relaunch}
                            />
                            <QuickAction
                                Icon={FolderIcon}
                                text="Open Settings Folder"
                                action={() => VencordNative.settings.openFolder()}
                            />
                        </>
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text="View Source Code"
                        action={() => VencordNative.native.openExternal("https://github.com/asrarkhann116-ops/DDT-Custom-Client")}
                    />
                    <QuickAction
                        Icon={LinkIcon}
                        text="Join our DC Server"
                        action={() => VencordNative.native.openExternal("https://discord.gg/3fb9Q7ucSN")}
                    />
                </QuickActionCard>
            </section>

            <Divider />

            <section className={Margins.top16}>
                <Forms.FormTitle tag="h5">Settings</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    Hint: You can change the position of this settings section in the{" "}
                    <a onClick={() => openPluginModal(SettingsPlugin)}>
                        settings of the Settings plugin
                    </a>!
                </Forms.FormText>

                <div className="vc-settings-switches">
                    <Switches />
                </div>
            </section>


            <MacOSVibrancySettings />
            <WindowsMaterialSettings />

            <NotificationSection />
        </SettingsTab>
    );
}

export default wrapTab(VencordSettings, "Discord Developer Tools");
