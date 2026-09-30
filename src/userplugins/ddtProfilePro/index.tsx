/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import definePlugin from "@utils/types";
import { Tooltip } from "@webpack/common";

import { getProfile, loadProfiles } from "./api";
import ProfileCard from "./ProfileCard";
import ProfileEditor from "./ProfileEditor";
import { settings } from "./settings";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function DDTMemberBadge() {
    return (
        <Tooltip text="DDT Member">
            {props => <span {...props} className="vc-ddtpp-badge">DDT</span>}
        </Tooltip>
    );
}

const badge: ProfileBadge = {
    id: "ddt-profile-pro-member",
    key: "ddt-profile-pro-member",
    description: "DDT Member",
    component: DDTMemberBadge,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => !!getProfile(userId)
};

let refreshTimer: ReturnType<typeof setInterval> | undefined;

export default definePlugin({
    name: "DDTProfilePro",
    description: "Free profile background, profile song, mini bio and a DDT Member badge, visible to every DDT user",
    tags: ["Appearance", "Customisation"],
    authors: [{ name: "DDT Development Team", id: 0n }],
    userProfileBadge: badge,
    settings,

    patches: [
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        },
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /userId:\i\.id,guild:\i\}\)(?=])/,
                replace: "$&,$self.ProfileCard(arguments[0])"
            }
        }
    ],

    settingsAboutComponent: ProfileEditor,
    ProfileCard,

    patchBannerUrl({ displayProfile }: { displayProfile?: { banner?: string; userId?: string; }; }) {
        if (displayProfile?.banner && settings.store.nitroFirst) return;
        return getProfile(displayProfile?.userId)?.background;
    },

    async start() {
        await loadProfiles();
        refreshTimer = setInterval(loadProfiles, REFRESH_INTERVAL_MS);
    },

    stop() {
        clearInterval(refreshTimer);
    }
});
