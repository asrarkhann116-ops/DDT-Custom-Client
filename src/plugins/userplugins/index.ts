/*
 * Discord Developer Tools
 * Copyright (c) 2024 Discord Developer Tools Team
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

interface APIRequest {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    body?: any;
    headers?: Record<string, string>;
    response?: any;
    responseHeaders?: Record<string, string>;
    status?: number;
    duration?: number;
}

interface APIInspectorState {
    requests: APIRequest[];
    filters: {
        method?: string;
        url?: string;
        status?: number;
    };
}

const state: APIInspectorState = {
    requests: [],
    filters: {}
};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable API request logging",
        default: true
    },
    maxLogs: {
        type: OptionType.NUMBER,
        description: "Maximum number of requests to store",
        default: 100
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log requests to browser console",
        default: false
    },
    filterByMethod: {
        type: OptionType.STRING,
        description: "Filter by HTTP method (GET, POST, etc.) - leave empty for all",
        default: ""
    },
    filterByUrl: {
        type: OptionType.STRING,
        description: "Filter by URL pattern (supports regex)",
        default: ""
    }
});

let originalFetch: typeof window.fetch;
let originalXHROpen: typeof XMLHttpRequest.prototype.open;
let originalXHRSend: typeof XMLHttpRequest.prototype.send;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function matchesFilters(request: APIRequest): boolean {
    const methodFilter = settings.store.filterByMethod.trim().toUpperCase();
    if (methodFilter && request.method !== methodFilter) return false;

    const urlFilter = settings.store.filterByUrl.trim();
    if (urlFilter) {
        try {
            const regex = new RegExp(urlFilter, "i");
            if (!regex.test(request.url)) return false;
        } catch {
            if (!request.url.toLowerCase().includes(urlFilter.toLowerCase())) return false;
        }
    }

    return true;
}

function addRequest(request: APIRequest) {
    if (!settings.store.enabled) return;
    if (!matchesFilters(request)) return;

    state.requests.unshift(request);
    if (state.requests.length > settings.store.maxLogs) {
        state.requests.pop();
    }

    if (settings.store.logToConsole) {
        console.log(`[API Inspector] ${request.method} ${request.url}`, request);
    }
}

function patchFetch() {
    originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const id = generateId();
        const startTime = performance.now();

        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method || "GET";
        const headers = init?.headers ? Object.fromEntries(new Headers(init.headers)) : {};

        const request: APIRequest = {
            id,
            timestamp: Date.now(),
            method: method.toUpperCase(),
            url,
            headers,
            body: init?.body
        };

        try {
            const response = await originalFetch.call(this, input, init);
            const duration = performance.now() - startTime;

            const clonedResponse = response.clone();
            const responseBody = await clonedResponse.text();
            const responseHeaders = Object.fromEntries(clonedResponse.headers);

            request.response = responseBody;
            request.responseHeaders = responseHeaders;
            request.status = response.status;
            request.duration = duration;

            addRequest(request);

            return response;
        } catch (error) {
            const duration = performance.now() - startTime;
            request.duration = duration;
            request.response = { error: String(error) };
            request.status = 0;
            addRequest(request);
            throw error;
        }
    };
}

function patchXHR() {
    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
        this._apiInspectorData = {
            id: generateId(),
            timestamp: Date.now(),
            method: method.toUpperCase(),
            url: url.toString(),
            startTime: performance.now()
        };
        return (originalXHROpen as any).call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        if (this._apiInspectorData) {
            const data = this._apiInspectorData;

            this.addEventListener("loadend", function () {
                const duration = performance.now() - data.startTime;

                const request: APIRequest = {
                    id: data.id,
                    timestamp: data.timestamp,
                    method: data.method,
                    url: data.url,
                    body,
                    response: this.responseText,
                    status: this.status,
                    duration
                };

                addRequest(request);
            });
        }

        return originalXHRSend.call(this, body);
    };
}

function unpatchFetch() {
    if (originalFetch) {
        window.fetch = originalFetch;
    }
}

function unpatchXHR() {
    if (originalXHROpen) {
        XMLHttpRequest.prototype.open = originalXHROpen;
    }
    if (originalXHRSend) {
        XMLHttpRequest.prototype.send = originalXHRSend;
    }
}

// Global API for console access
(window as any).APIInspector = {
    getRequests: () => state.requests,
    clearRequests: () => { state.requests = []; console.log("[API Inspector] Cleared all requests"); },
    getRequest: (id: string) => state.requests.find(r => r.id === id),
    exportRequests: () => {
        const data = JSON.stringify(state.requests, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `api-inspector-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("[API Inspector] Exported requests");
    },
    stats: () => {
        const total = state.requests.length;
        const byMethod = state.requests.reduce((acc, r) => {
            acc[r.method] = (acc[r.method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const avgDuration = state.requests.reduce((sum, r) => sum + (r.duration || 0), 0) / total;

        console.table({
            "Total Requests": total,
            "Average Duration (ms)": avgDuration.toFixed(2),
            "By Method": JSON.stringify(byMethod)
        });
    },
    filterByUrl: (pattern: string) => {
        const regex = new RegExp(pattern, "i");
        return state.requests.filter(r => regex.test(r.url));
    },
    filterByMethod: (method: string) => {
        return state.requests.filter(r => r.method === method.toUpperCase());
    },
    filterByStatus: (status: number) => {
        return state.requests.filter(r => r.status === status);
    }
};

export default definePlugin({
    name: "APIInspector",
    description: "Monitor and log all Discord API requests with advanced filtering and export capabilities",
    authors: [Devs.Ven],
    tags: ["Developers"],

    settings,

    start() {
        patchFetch();
        patchXHR();
        console.log("[API Inspector] Started monitoring API requests");
        console.log("[API Inspector] Use window.APIInspector for programmatic access");
        console.log("[API Inspector] Available commands: getRequests(), clearRequests(), exportRequests(), stats(), filterByUrl(pattern), filterByMethod(method), filterByStatus(code)");
    },

    stop() {
        unpatchFetch();
        unpatchXHR();
        state.requests = [];
        delete (window as any).APIInspector;
        console.log("[API Inspector] Stopped monitoring");
    }
});
