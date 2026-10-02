/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";

const cl = classNameFactory("vc-plugins-");

function DDTTestcordIcon() {
    return (
        <svg aria-label="DDT and Testcord" className={cl("source")} role="img" viewBox="0 0 100 100">
            <defs>
                <clipPath id="vc-DDT-port-DDT">
                    <path d="M0 0H100L0 100Z" />
                </clipPath>
                <clipPath id="vc-DDT-port-testcord">
                    <path d="M100 0V100H0Z" />
                </clipPath>
            </defs>
            <image clipPath="url(#vc-DDT-port-DDT)" height="100" href="https://DDT.st/image.png" width="100" />
            <image clipPath="url(#vc-DDT-port-testcord)" height="100" href="https://raw.githubusercontent.com/TestcordDev/TestCord/main/browser/icon.png" width="100" />
        </svg>
    );
}

const SafeDDTTestcordIcon = ErrorBoundary.wrap(DDTTestcordIcon, { noop: true });

export default definePlugin({
    name: "DDTPort",
    description: "Marks DDT plugins ported from DDT and Testcord.",
    authors: [Devs.irritably],
    required: true,
    enabledByDefault: true,

    isDDTPlugin(name: string) {
        return name === "LarpCord" || name === "StreamProofEnhanched";
    },

    getPluginSource(name: string) {
        return name === "LarpCord"
            ? { badge: <SafeDDTTestcordIcon />, tooltip: "DDT / Testcord Plugin" }
            : null;
    }
});
