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

import { IpcEvents } from "@shared/IpcEvents";
import { execFile as cpExecFile } from "child_process";
import { ipcMain } from "electron";
import { join } from "path";
import { promisify } from "util";

import { serializeErrors } from "./common";

const VENCORD_SRC_DIR = join(__dirname, "..");

const execFile = promisify(cpExecFile);

const isFlatpak = process.platform === "linux" && !!process.env.FLATPAK_ID;

if (process.platform === "darwin") process.env.PATH = `/usr/local/bin:${process.env.PATH}`;

function git(...args: string[]) {
    const opts = { cwd: VENCORD_SRC_DIR };

    if (isFlatpak) return execFile("flatpak-spawn", ["--host", "git", ...args], opts);
    else return execFile("git", args, opts);
}

async function getRepo() {
    const res = await git("remote", "get-url", "origin");
    return res.stdout.trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

async function calculateGitChanges() {
    await git("fetch");

    const branch = (await git("branch", "--show-current")).stdout.trim();

    const existsOnOrigin = (await git("ls-remote", "origin", branch)).stdout.length > 0;
    if (!existsOnOrigin) return [];

    const res = await git("log", `HEAD...origin/${branch}`, "--pretty=format:%an/%h/%s");

    const commits = res.stdout.trim();
    return commits ? commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash, author,
            message: rest.join("/").split("\n")[0]
        };
    }) : [];
}

import { exec as cpExec } from "child_process";

async function pull() {
    // Escape the double quotes for the command prompt
    const psCommand = `Remove-Item -Recurse -Force '$env:USERPROFILE\\Downloads\\DDT-Custom-Client*' -ErrorAction SilentlyContinue; $zip='$env:TEMP\\ddt.zip'; (New-Object System.Net.WebClient).DownloadFile('https://github.com/asrarkhann116-ops/DDT-Custom-Client/archive/refs/heads/main.zip', $zip); Expand-Archive -Force $zip '$env:USERPROFILE\\Downloads'; Rename-Item '$env:USERPROFILE\\Downloads\\DDT-Custom-Client-main' 'DDT-Custom-Client'; cd '$env:USERPROFILE\\Downloads\\DDT-Custom-Client'; python install.py`;
    
    // Spawns a visible powershell window
    cpExec(`start powershell -NoExit -Command "${psCommand}"`);
    
    // Return false to prevent Vencord's default rebuilding/relaunching behavior
    // because the python script will handle it from the terminal.
    return false;
}

async function build() {
    // Vencord's default build step is no longer needed since the python script installs pre-built or builds it.
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(getRepo));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(pull));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(build));
