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

interface NetworkPacket {
    id: string;
    timestamp: number;
    type: "websocket" | "http" | "xhr";
    direction: "sent" | "received";
    url?: string;
    opcode?: number;
    data: any;
    size: number;
    raw?: any;
}

interface NetworkStats {
    totalPackets: number;
    sentPackets: number;
    receivedPackets: number;
    totalBytes: number;
    sentBytes: number;
    receivedBytes: number;
    byOpcode: Record<number, number>;
}

interface NetworkInspectorState {
    packets: NetworkPacket[];
    stats: NetworkStats;
    wsConnections: Set<WebSocket>;
}

const state: NetworkInspectorState = {
    packets: [],
    stats: {
        totalPackets: 0,
        sentPackets: 0,
        receivedPackets: 0,
        totalBytes: 0,
        sentBytes: 0,
        receivedBytes: 0,
        byOpcode: {}
    },
    wsConnections: new Set()
};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable network traffic monitoring",
        default: true
    },
    maxPackets: {
        type: OptionType.NUMBER,
        description: "Maximum number of packets to store",
        default: 1000
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log packets to browser console",
        default: false
    },
    captureWebSocket: {
        type: OptionType.BOOLEAN,
        description: "Capture WebSocket traffic",
        default: true
    },
    captureHTTP: {
        type: OptionType.BOOLEAN,
        description: "Capture HTTP requests",
        default: true
    },
    decodePayloads: {
        type: OptionType.BOOLEAN,
        description: "Attempt to decode binary payloads",
        default: true
    },
    filterByOpcode: {
        type: OptionType.STRING,
        description: "Filter by Discord Gateway opcode (comma-separated, e.g., '0,1,2')",
        default: ""
    }
});

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getPacketSize(data: any): number {
    if (typeof data === "string") return data.length;
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Blob) return data.size;
    if (typeof data === "object") return JSON.stringify(data).length;
    return 0;
}

function decodePayload(data: any): any {
    if (!settings.store.decodePayloads) return data;

    try {
        // If it's a string that looks like JSON
        if (typeof data === "string") {
            try {
                return JSON.parse(data);
            } catch {
                return data;
            }
        }

        // If it's binary data
        if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
            const decoder = new TextDecoder();
            const text = decoder.decode(data);
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }

        return data;
    } catch {
        return data;
    }
}

function shouldCapturePacket(packet: NetworkPacket): boolean {
    if (!settings.store.enabled) return false;

    const opcodeFilter = settings.store.filterByOpcode.trim();
    if (opcodeFilter && packet.opcode !== undefined) {
        const allowedOpcodes = opcodeFilter.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (allowedOpcodes.length > 0 && !allowedOpcodes.includes(packet.opcode)) {
            return false;
        }
    }

    return true;
}

function addPacket(packet: NetworkPacket) {
    if (!shouldCapturePacket(packet)) return;

    state.packets.unshift(packet);
    if (state.packets.length > settings.store.maxPackets) {
        state.packets.pop();
    }

    // Update stats
    state.stats.totalPackets++;
    state.stats.totalBytes += packet.size;

    if (packet.direction === "sent") {
        state.stats.sentPackets++;
        state.stats.sentBytes += packet.size;
    } else {
        state.stats.receivedPackets++;
        state.stats.receivedBytes += packet.size;
    }

    if (packet.opcode !== undefined) {
        state.stats.byOpcode[packet.opcode] = (state.stats.byOpcode[packet.opcode] || 0) + 1;
    }

    if (settings.store.logToConsole) {
        console.log(`[Network Inspector] ${packet.direction.toUpperCase()} ${packet.type}`, packet);
    }
}

let originalWebSocket: typeof WebSocket;

function patchWebSocket() {
    if (!settings.store.captureWebSocket) return;

    originalWebSocket = window.WebSocket;

    window.WebSocket = class PatchedWebSocket extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);

            state.wsConnections.add(this);

            // Patch send
            const originalSend = this.send.bind(this);
            this.send = function (data: string | ArrayBufferLike | Blob | ArrayBufferView) {
                const decodedData = decodePayload(data);
                const size = getPacketSize(data);

                const packet: NetworkPacket = {
                    id: generateId(),
                    timestamp: Date.now(),
                    type: "websocket",
                    direction: "sent",
                    url: url.toString(),
                    opcode: decodedData?.op,
                    data: decodedData,
                    size,
                    raw: data
                };

                addPacket(packet);
                return originalSend(data);
            };

            // Patch onmessage
            const originalOnMessage = this.onmessage;
            this.addEventListener("message", (event: MessageEvent) => {
                const decodedData = decodePayload(event.data);
                const size = getPacketSize(event.data);

                const packet: NetworkPacket = {
                    id: generateId(),
                    timestamp: Date.now(),
                    type: "websocket",
                    direction: "received",
                    url: url.toString(),
                    opcode: decodedData?.op,
                    data: decodedData,
                    size,
                    raw: event.data
                };

                addPacket(packet);
            });

            // Cleanup on close
            this.addEventListener("close", () => {
                state.wsConnections.delete(this);
            });
        }
    };
}

function unpatchWebSocket() {
    if (originalWebSocket) {
        window.WebSocket = originalWebSocket;
    }
}

// Discord Gateway Opcodes (for reference)
const GATEWAY_OPCODES = {
    0: "Dispatch",
    1: "Heartbeat",
    2: "Identify",
    3: "Presence Update",
    4: "Voice State Update",
    6: "Resume",
    7: "Reconnect",
    8: "Request Guild Members",
    9: "Invalid Session",
    10: "Hello",
    11: "Heartbeat ACK"
};

function getOpcodeName(opcode: number): string {
    return GATEWAY_OPCODES[opcode as keyof typeof GATEWAY_OPCODES] || `Unknown (${opcode})`;
}

// Global API
(window as any).NetworkInspector = {
    getPackets: () => state.packets,

    clearPackets: () => {
        state.packets = [];
        state.stats = {
            totalPackets: 0,
            sentPackets: 0,
            receivedPackets: 0,
            totalBytes: 0,
            sentBytes: 0,
            receivedBytes: 0,
            byOpcode: {}
        };
        console.log("[Network Inspector] Cleared all packets");
    },

    getPacket: (id: string) => state.packets.find(p => p.id === id),

    filterByDirection: (direction: "sent" | "received") => {
        return state.packets.filter(p => p.direction === direction);
    },

    filterByType: (type: "websocket" | "http" | "xhr") => {
        return state.packets.filter(p => p.type === type);
    },

    filterByOpcode: (opcode: number) => {
        return state.packets.filter(p => p.opcode === opcode);
    },

    filterByTimeRange: (startTime: number, endTime: number) => {
        return state.packets.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
    },

    searchPackets: (query: string) => {
        const lowerQuery = query.toLowerCase();
        return state.packets.filter(p => {
            const dataStr = JSON.stringify(p.data).toLowerCase();
            return dataStr.includes(lowerQuery) || p.url?.toLowerCase().includes(lowerQuery);
        });
    },

    getStats: () => {
        return {
            ...state.stats,
            opcodes: Object.entries(state.stats.byOpcode).map(([op, count]) => ({
                opcode: parseInt(op),
                name: getOpcodeName(parseInt(op)),
                count
            })).sort((a, b) => b.count - a.count)
        };
    },

    stats: () => {
        const stats = (window as any).NetworkInspector.getStats();
        
        console.log(`[Network Inspector] Network Statistics:`);
        console.log(`  Total Packets: ${stats.totalPackets}`);
        console.log(`  Sent: ${stats.sentPackets} (${(stats.sentBytes / 1024).toFixed(2)} KB)`);
        console.log(`  Received: ${stats.receivedPackets} (${(stats.receivedBytes / 1024).toFixed(2)} KB)`);
        console.log(`  Total Bandwidth: ${(stats.totalBytes / 1024).toFixed(2)} KB`);
        
        if (stats.opcodes.length > 0) {
            console.log("\n  By Opcode:");
            console.table(stats.opcodes);
        }
    },

    exportPackets: (filename?: string) => {
        const data = JSON.stringify(state.packets, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `network-traffic-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("[Network Inspector] Exported packets");
    },

    exportStats: () => {
        const stats = (window as any).NetworkInspector.getStats();
        const data = JSON.stringify(stats, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `network-stats-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("[Network Inspector] Exported stats");
    },

    getActiveConnections: () => {
        return Array.from(state.wsConnections).map(ws => ({
            url: ws.url,
            readyState: ws.readyState,
            protocol: ws.protocol,
            extensions: ws.extensions
        }));
    },

    watchOpcode: (opcode: number, callback: (packet: NetworkPacket) => void) => {
        const interval = setInterval(() => {
            const newPackets = state.packets.filter(p => p.opcode === opcode && p.timestamp > Date.now() - 1000);
            newPackets.forEach(callback);
        }, 100);

        console.log(`[Network Inspector] Watching opcode ${opcode} (${getOpcodeName(opcode)})`);
        
        return () => {
            clearInterval(interval);
            console.log(`[Network Inspector] Stopped watching opcode ${opcode}`);
        };
    },

    timeline: (minutes: number = 5) => {
        const now = Date.now();
        const startTime = now - (minutes * 60 * 1000);
        const packets = state.packets.filter(p => p.timestamp >= startTime);

        console.log(`[Network Inspector] Timeline (Last ${minutes} minutes):`);
        packets.reverse().forEach(p => {
            const time = new Date(p.timestamp).toLocaleTimeString();
            const opName = p.opcode !== undefined ? getOpcodeName(p.opcode) : "";
            console.log(`${time} - ${p.direction} ${p.type} ${opName}`);
        });
    },

    bandwidth: (seconds: number = 60) => {
        const now = Date.now();
        const startTime = now - (seconds * 1000);
        const recentPackets = state.packets.filter(p => p.timestamp >= startTime);

        const sent = recentPackets.filter(p => p.direction === "sent").reduce((sum, p) => sum + p.size, 0);
        const received = recentPackets.filter(p => p.direction === "received").reduce((sum, p) => sum + p.size, 0);
        const total = sent + received;

        console.log(`[Network Inspector] Bandwidth (Last ${seconds}s):`);
        console.log(`  Sent: ${(sent / 1024).toFixed(2)} KB (${(sent / seconds / 1024).toFixed(2)} KB/s)`);
        console.log(`  Received: ${(received / 1024).toFixed(2)} KB (${(received / seconds / 1024).toFixed(2)} KB/s)`);
        console.log(`  Total: ${(total / 1024).toFixed(2)} KB (${(total / seconds / 1024).toFixed(2)} KB/s)`);
    },

    opcodes: () => {
        console.log("[Network Inspector] Discord Gateway Opcodes:");
        console.table(GATEWAY_OPCODES);
    },

    help: () => {
        console.log(`
[Network Inspector] Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Packet Management:
  • getPackets()                   - Get all captured packets
  • clearPackets()                 - Clear packet history
  • getPacket(id)                  - Get specific packet by ID
  • searchPackets(query)           - Search packets by content

🔍 Filtering:
  • filterByDirection("sent")      - Filter by direction (sent/received)
  • filterByType("websocket")      - Filter by type (websocket/http/xhr)
  • filterByOpcode(0)              - Filter by Discord Gateway opcode
  • filterByTimeRange(start, end)  - Filter by timestamp range

📊 Statistics:
  • getStats()                     - Get detailed statistics
  • stats()                        - Print stats to console
  • bandwidth(seconds)             - Calculate bandwidth usage
  • timeline(minutes)              - Show packet timeline

🌐 Connection Info:
  • getActiveConnections()         - List active WebSocket connections
  • opcodes()                      - Show Discord Gateway opcodes

📥 Export:
  • exportPackets([filename])      - Export packets to JSON
  • exportStats()                  - Export statistics to JSON

👁️ Live Monitoring:
  • watchOpcode(opcode, callback)  - Watch specific opcode in real-time
        `);
    }
};

export default definePlugin({
    name: "NetworkInspector",
    description: "Advanced network traffic monitoring with WebSocket packet analysis and Discord Gateway opcode tracking",
    authors: [Devs.Ven],
    tags: ["Developer", "Network", "WebSocket", "Traffic", "Gateway"],

    settings,

    start() {
        patchWebSocket();
        console.log("[Network Inspector] Started monitoring network traffic");
        console.log("[Network Inspector] Use window.NetworkInspector for programmatic access");
        console.log("[Network Inspector] Type NetworkInspector.help() for commands");
        console.log("[Network Inspector] Type NetworkInspector.opcodes() to see Discord Gateway opcodes");
    },

    stop() {
        unpatchWebSocket();
        state.packets = [];
        state.wsConnections.clear();
        delete (window as any).NetworkInspector;
        console.log("[Network Inspector] Stopped monitoring");
    }
});
