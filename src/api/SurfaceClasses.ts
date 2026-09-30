/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const SurfaceId: any = {} as any;
export type SurfaceId = any;
export interface SurfaceProvidedProps {
    [key: string]: any;
}
export function addSurfacePropsProvider(...args: any[]): () => void {
    return () => {};
}
export function notifySurfaceClassesChanged(...args: any[]) {}
