/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { OAuth2AuthorizeModal, openModal, UserStore } from "@webpack/common";

import { settings } from "./settings";

export interface DDTProfile {
    background?: string;
    song?: string;
    bio?: string;
    accent?: string;
}

const TOKENS_KEY = "DDTProfilePro_tokens";

export const logger = new Logger("DDTProfilePro");

let profiles: Record<string, DDTProfile> = {};

export function getProfile(userId?: string): DDTProfile | undefined {
    return userId ? profiles[userId] : undefined;
}

function endpoint(path: string) {
    return settings.store.apiUrl.replace(/\/+$/, "") + path;
}

export async function loadProfiles() {
    if (!settings.store.apiUrl) return;

    try {
        const res = await fetch(endpoint("/users"));
        if (res.ok) profiles = (await res.json()).users ?? {};
    } catch (e) {
        logger.error("Failed to load profiles", e);
    }
}

async function getTokens() {
    return await DataStore.get<Record<string, string>>(TOKENS_KEY) ?? {};
}

async function setToken(token: string | null) {
    const tokens = await getTokens();
    const { id } = UserStore.getCurrentUser();
    if (token) tokens[id] = token;
    else delete tokens[id];
    await DataStore.set(TOKENS_KEY, tokens);
}

function authorize() {
    return new Promise<string>((resolve, reject) => openModal(props => (
        <OAuth2AuthorizeModal
            {...props}
            clientId={settings.store.clientId}
            redirectUri={endpoint("/callback")}
            scopes={["identify"]}
            responseType="code"
            permissions={0n}
            cancelCompletesFlow={false}
            callback={async ({ location }: { location?: string; }) => {
                try {
                    if (!location) throw new Error("Authorization cancelled");
                    const res = await fetch(location);
                    if (!res.ok) throw new Error(await res.text());

                    const token = await res.text();
                    await setToken(token);
                    resolve(token);
                } catch (e) {
                    reject(e);
                }
            }}
        />
    ), {
        onCloseCallback: () => reject(new Error("Authorization cancelled"))
    }));
}

async function authFetch(path: string, init: RequestInit, retried = false): Promise<Response> {
    const token = (await getTokens())[UserStore.getCurrentUser().id] ?? await authorize();
    const res = await fetch(endpoint(path), {
        ...init,
        headers: { ...init.headers, Authorization: token }
    });

    if (res.status === 401 && !retried) {
        await setToken(null);
        return authFetch(path, init, true);
    }
    if (!res.ok) throw new Error(await res.text());
    return res;
}

export async function saveProfile(profile: DDTProfile) {
    const res = await authFetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });
    profiles[UserStore.getCurrentUser().id] = await res.json();
}

export async function deleteProfile() {
    await authFetch("/profile", { method: "DELETE" });
    delete profiles[UserStore.getCurrentUser().id];
}
