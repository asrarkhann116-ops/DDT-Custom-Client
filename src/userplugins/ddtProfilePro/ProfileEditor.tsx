/*
 * DDT Discord Client, a Discord client mod
 * Copyright (c) 2026 DDT and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { showToast, Text, TextInput, Toasts, UserStore, useState } from "@webpack/common";

import { DDTProfile, deleteProfile, getProfile, logger, saveProfile } from "./api";
import { settings } from "./settings";

const FIELDS: { key: keyof DDTProfile; label: string; placeholder: string; }[] = [
    { key: "background", label: "Background image", placeholder: "https://i.imgur.com/xyz.gif" },
    { key: "song", label: "Profile song", placeholder: "https://open.spotify.com/track/..." },
    { key: "bio", label: "Mini bio (max 190)", placeholder: "DDT on top" },
    { key: "accent", label: "Accent colour", placeholder: "#7c3aed" }
];

export default function ProfileEditor() {
    const { apiUrl, clientId } = settings.use(["apiUrl", "clientId"]);
    const [profile, setProfile] = useState<DDTProfile>(() => ({ ...getProfile(UserStore.getCurrentUser()?.id) }));
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (!apiUrl || !clientId) {
        return <Paragraph>Set the API URL and Client ID below, then restart Discord to edit your Profile Pro.</Paragraph>;
    }

    async function run(action: () => Promise<void>, success: string) {
        setBusy(true);
        setError(null);
        try {
            await action();
            showToast(success, Toasts.Type.SUCCESS);
        } catch (e) {
            logger.error(e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="vc-ddtpp-editor">
            {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                    <Heading tag="h5">{label}</Heading>
                    <TextInput
                        value={profile[key] ?? ""}
                        placeholder={placeholder}
                        maxLength={key === "bio" ? 190 : 300}
                        onChange={(value: string) => setProfile(p => ({ ...p, [key]: value.trim() ? value : undefined }))}
                    />
                </div>
            ))}
            {error && <Text className="vc-ddtpp-error" variant="text-sm/normal">{error}</Text>}
            <div className="vc-ddtpp-actions">
                <Button disabled={busy} onClick={() => run(() => saveProfile(profile), "Profile Pro saved")}>
                    Save
                </Button>
                <Button
                    variant="dangerSecondary"
                    disabled={busy}
                    onClick={() => run(async () => {
                        await deleteProfile();
                        setProfile({});
                    }, "Profile Pro removed")}
                >
                    Remove
                </Button>
            </div>
            <Paragraph>Backgrounds must be hosted on Imgur, Catbox, Discord CDN, ImgBB, Pinterest, Tenor or GitHub raw.</Paragraph>
        </div>
    );
}
