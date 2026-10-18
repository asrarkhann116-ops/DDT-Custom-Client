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
import { Alerts, Forms, React, useMemo, UserStore } from "@webpack/common";

import Plugins from "~plugins";
import { isPluginEnabled } from "@api/PluginManager";

import { DonateButtonComponent, isDonor } from "./DonateButton";
import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";
// @ts-ignore
import ddtWaifu from "file://./ddt_waifu.webp?base64";
// @ts-ignore
import ddtWaifu2 from "file://./ddt_waifu2.webp?base64";

function CyberBoltIcon({ size = 15, color = "#00ff88" }: { size?: number; color?: string; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${color})` }}>
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
        </svg>
    );
}

function CyberGearIcon({ size = 15, color = "#a0aeff" }: { size?: number; color?: string; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${color})` }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15ZM12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill={color} />
            <path fillRule="evenodd" clipRule="evenodd" d="M9.35294 2.05882C9.56942 1.43936 10.1558 1 10.8118 1H13.1882C13.8442 1 14.4306 1.43936 14.6471 2.05882L15.2353 3.73529C15.8235 4.02941 16.3824 4.38235 16.8824 4.79412L18.5882 4.14706C19.2076 3.91176 19.9118 4.11765 20.3235 4.64706L21.5 6.17647C21.9118 6.70588 21.8824 7.44118 21.4412 7.94118L20.2647 9.29412C20.3529 9.88235 20.4118 10.4706 20.4118 11.0882V12.9118C20.4118 13.5294 20.3529 14.1176 20.2647 14.7059L21.4412 16.0588C21.8824 16.5588 21.9118 17.2941 21.5 17.8235L20.3235 19.3529C19.9118 19.8824 19.2076 20.0882 18.5882 19.8529L16.8824 19.2059C16.3824 19.6176 15.8235 19.9706 15.2353 20.2647L14.6471 21.9412C14.4306 22.5606 13.8442 23 13.1882 23H10.8118C10.1558 23 9.56942 22.5606 9.35294 21.9412L8.76471 20.2647C8.17647 19.9706 7.61765 19.6176 7.11765 19.2059L5.41176 19.8529C4.79235 20.0882 4.08824 19.8824 3.67647 19.3529L2.5 17.8235C2.08824 17.2941 2.11765 16.5588 2.55882 16.0588L3.73529 14.7059C3.64706 14.1176 3.58824 13.5294 3.58824 12.9118V11.0882C3.58824 10.4706 3.64706 9.88235 3.73529 9.29412L2.55882 7.94118C2.11765 7.44118 2.08824 6.70588 2.5 6.17647L3.67647 4.64706C4.08824 4.11765 4.79235 3.91176 5.41176 4.14706L7.11765 4.79412C7.61765 4.38235 8.17647 4.02941 8.76471 3.73529L9.35294 2.05882Z" fill={color} fillOpacity="0.85" />
        </svg>
    );
}

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
                        Alerts.show({
                            title: "Restart Required",
                            body: "A restart is required to apply this change.",
                            confirmText: "Restart now",
                            cancelText: "Later",
                            onConfirm: relaunch
                        });
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

    const { totalPlugins, activePlugins } = useMemo(() => {
        const pluginNames = Object.keys(Plugins);
        const total = pluginNames.length;
        let active = 0;
        for (const name of pluginNames) {
            if (isPluginEnabled(name)) {
                active++;
            }
        }
        return { totalPlugins: total, activePlugins: active };
    }, []);

    return (
        <SettingsTab>
            {/* DDT Remastered HUD Header */}
            <div className="ddt-scanlines" style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: "rgba(14, 16, 22, 0.75)",
                border: "1px solid rgba(88, 101, 242, 0.25)",
                borderRadius: "10px",
                marginBottom: "16px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CyberBoltIcon size={16} color="#00ff88" />
                    <span style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        background: "linear-gradient(90deg, #5865F2, #00FF88)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textTransform: "uppercase"
                    }}>
                        DDT REMASTERED
                    </span>
                    <span className="ddt-hud-badge">v3.0.0 PRO</span>
                    <span className="ddt-pixel-counter">{activePlugins} / {totalPlugins} ACTIVE</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="ddt-hud-badge ddt-hud-badge-purple">
                        60 FPS CAPPED
                    </span>
                    <span className="ddt-hud-badge">
                        CORE: LIVE
                    </span>
                </div>
            </div>

            {/* DDT Waifu Banner / Holographic Pedestal */}
            {settings.showWaifuBanner && (
            <div className="ddt-remastered-hero ddt-scanlines">
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: "12px",
                }}>
                    {/* Waifu 1 — front view */}
                    <img
                        className="ddt-pedestal-waifu"
                        src={`data:image/webp;base64,${ddtWaifu}`}
                        style={{
                            height: "270px",
                            objectFit: "contain",
                            imageRendering: "auto",
                            filter: "drop-shadow(0 8px 24px rgba(88, 101, 242, 0.4))"
                        }}
                        alt="DDT Waifu"
                    />

                    {/* Middle: Cyber Emblem & Support */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 18px",
                        marginBottom: "46px",
                        gap: "10px",
                        minWidth: "160px",
                        flexShrink: 0,
                    }}>
                        <div style={{
                            padding: "10px 18px",
                            background: "rgba(12, 14, 22, 0.85)",
                            borderRadius: "14px",
                            border: "1px solid rgba(88, 101, 242, 0.45)",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(88, 101, 242, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                            backdropFilter: "blur(8px)",
                        }}>
                            <div style={{
                                letterSpacing: "0.15em",
                                fontSize: "11px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                background: "linear-gradient(90deg, #00FF88, #5865F2)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>
                                ✦ CYBER DIVISION ✦
                            </div>
                            <div style={{
                                width: "40px",
                                height: "1px",
                                background: "linear-gradient(90deg, transparent, rgba(88, 101, 242, 0.6), transparent)"
                            }} />
                            <div style={{
                                letterSpacing: "0.1em",
                                fontSize: "10px",
                                fontWeight: 650,
                                textTransform: "uppercase",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                color: "#c4cbff",
                            }}>
                                Feel Free To Support
                            </div>
                        </div>
                        <div style={{
                            fontSize: "11px",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            color: "rgba(255, 255, 255, 0.6)",
                            letterSpacing: "0.08em",
                            whiteSpace: "nowrap",
                            background: "rgba(255, 255, 255, 0.04)",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            border: "1px solid rgba(255, 255, 255, 0.06)"
                        }}>
                            [ DDT CORE SUITE ]
                        </div>
                    </div>

                    {/* Waifu 2 — back view standing */}
                    <img
                        className="ddt-pedestal-waifu"
                        src={`data:image/webp;base64,${ddtWaifu2}`}
                        style={{
                            height: "270px",
                            objectFit: "contain",
                            imageRendering: "auto",
                            filter: "drop-shadow(0 8px 24px rgba(88, 101, 242, 0.4))"
                        }}
                        alt="DDT Waifu 2"
                    />
                </div>
            </div>
            )}

            <section>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px"
                }}>
                    <CyberBoltIcon size={14} color="#00ff88" />
                    <Forms.FormTitle tag="h5" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "12px", color: "#a0aeff" }}>
                        Quick Tactical Actions
                    </Forms.FormTitle>
                </div>

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
                                text="Relaunch Client"
                                action={relaunch}
                            />
                            <QuickAction
                                Icon={FolderIcon}
                                text="Settings Folder"
                                action={() => VencordNative.settings.openFolder()}
                            />
                        </>
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text="Source Code"
                        action={() => VencordNative.native.openExternal("https://github.com/asrarkhann116-ops/DDT-Custom-Client")}
                    />
                    <QuickAction
                        Icon={LinkIcon}
                        text="Join DC Server"
                        action={() => VencordNative.native.openExternal("https://discord.gg/3fb9Q7ucSN")}
                    />
                </QuickActionCard>
            </section>

            <Divider />

            <section className={Margins.top16}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <CyberGearIcon size={14} color="#a0aeff" />
                        <Forms.FormTitle tag="h5" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "12px", color: "#a0aeff" }}>
                            Client Core Settings
                        </Forms.FormTitle>
                    </div>
                    <Forms.FormText style={{ color: "var(--text-muted)", fontSize: "12px", margin: 0 }}>
                        Position reconfigurable in{" "}
                        <a onClick={() => openPluginModal(SettingsPlugin)} style={{ color: "#5865F2", textDecoration: "underline" }}>
                            Settings plugin
                        </a>
                    </Forms.FormText>
                </div>

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
