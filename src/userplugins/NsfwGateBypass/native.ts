/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent, net } from "electron";

// Runs in Electron's MAIN process — no CORS, no CSP, no restrictions
export function fetchUrl(_: IpcMainInvokeEvent, url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = net.request({
            url,
            method: "GET",
        });

        let body = "";

        // Custom bot User-Agent often bypasses Cloudflare better than fake Chrome UAs
        request.setHeader("User-Agent", "NsfwGateBypass/1.0 (Discord Client Mod)");
        request.setHeader("Accept", "application/json");

        request.on("response", response => {
            response.on("data", (chunk: Buffer) => {
                body += chunk.toString("utf-8");
            });
            response.on("end", () => {
                resolve(body);
            });
            response.on("error", (err: Error) => {
                reject(err);
            });
        });

        request.on("error", (err: Error) => {
            reject(err);
        });

        request.end();
    });
}
