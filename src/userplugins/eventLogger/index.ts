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
import { FluxDispatcher } from "@webpack/common";

interface DiscordEvent {
    id: string;
    timestamp: number;
    type: string;
    data: any;
    raw?: any;
}

interface EventLoggerState {
    events: DiscordEvent[];
    subscriptions: Map<string, (event: any) => void>;
    filters: {
        types: Set<string>;
        enabled: boolean;
    };
}

const state: EventLoggerState = {
    events: [],
    subscriptions: new Map(),
    filters: {
        types: new Set(),
        enabled: false
    }
};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable event logging",
        default: true
    },
    maxEvents: {
        type: OptionType.NUMBER,
        description: "Maximum number of events to store",
        default: 500
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log events to browser console",
        default: false
    },
    logMessages: {
        type: OptionType.BOOLEAN,
        description: "Log message events (MESSAGE_CREATE, MESSAGE_UPDATE, etc.)",
        default: true
    },
    logPresence: {
        type: OptionType.BOOLEAN,
        description: "Log presence updates (USER_PRESENCE_UPDATE)",
        default: true
    },
    logVoice: {
        type: OptionType.BOOLEAN,
        description: "Log voice events (VOICE_STATE_UPDATE, etc.)",
        default: true
    },
    logGuild: {
        type: OptionType.BOOLEAN,
        description: "Log guild events (GUILD_CREATE, GUILD_MEMBER_ADD, etc.)",
        default: true
    },
    logTyping: {
        type: OptionType.BOOLEAN,
        description: "Log typing events",
        default: false
    },
    logChannel: {
        type: OptionType.BOOLEAN,
        description: "Log channel events (CHANNEL_SELECT, etc.)",
        default: true
    },
    logRelationship: {
        type: OptionType.BOOLEAN,
        description: "Log relationship events (friend requests, blocks, etc.)",
        default: true
    }
});

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function shouldLogEvent(type: string): boolean {
    if (!settings.store.enabled) return false;

    // Category-based filtering
    if (type.startsWith("MESSAGE_") && !settings.store.logMessages) return false;
    if (type === "PRESENCE_UPDATE" && !settings.store.logPresence) return false;
    if (type.startsWith("VOICE_") && !settings.store.logVoice) return false;
    if (type.startsWith("GUILD_") && !settings.store.logGuild) return false;
    if (type === "TYPING_START" && !settings.store.logTyping) return false;
    if (type.startsWith("CHANNEL_") && !settings.store.logChannel) return false;
    if (type.startsWith("RELATIONSHIP_") && !settings.store.logRelationship) return false;

    // Custom filter
    if (state.filters.enabled && state.filters.types.size > 0) {
        return state.filters.types.has(type);
    }

    return true;
}

function addEvent(type: string, data: any, raw?: any) {
    if (!shouldLogEvent(type)) return;

    const event: DiscordEvent = {
        id: generateId(),
        timestamp: Date.now(),
        type,
        data,
        raw
    };

    state.events.unshift(event);
    if (state.events.length > settings.store.maxEvents) {
        state.events.pop();
    }

    if (settings.store.logToConsole) {
        console.log(`[Event Logger] ${type}`, data);
    }
}

// Common Discord event types to monitor
const MONITORED_EVENTS = [
    // Message events
    "MESSAGE_CREATE",
    "MESSAGE_UPDATE",
    "MESSAGE_DELETE",
    "MESSAGE_DELETE_BULK",
    "MESSAGE_REACTION_ADD",
    "MESSAGE_REACTION_REMOVE",
    "MESSAGE_ACK",
    
    // Channel events
    "CHANNEL_SELECT",
    "CHANNEL_CREATE",
    "CHANNEL_UPDATE",
    "CHANNEL_DELETE",
    "CHANNEL_PINS_UPDATE",
    
    // Guild events
    "GUILD_CREATE",
    "GUILD_UPDATE",
    "GUILD_DELETE",
    "GUILD_MEMBER_ADD",
    "GUILD_MEMBER_UPDATE",
    "GUILD_MEMBER_REMOVE",
    "GUILD_MEMBERS_CHUNK",
    "GUILD_ROLE_CREATE",
    "GUILD_ROLE_UPDATE",
    "GUILD_ROLE_DELETE",
    "GUILD_BAN_ADD",
    "GUILD_BAN_REMOVE",
    
    // Voice events
    "VOICE_STATE_UPDATE",
    "VOICE_CHANNEL_SELECT",
    "VOICE_SERVER_UPDATE",
    "AUDIO_TOGGLE_SELF_MUTE",
    "AUDIO_TOGGLE_SELF_DEAF",
    
    // User/Presence events
    "PRESENCE_UPDATE",
    "USER_UPDATE",
    "USER_SETTINGS_UPDATE",
    "USER_NOTE_UPDATE",
    "USER_GUILD_SETTINGS_UPDATE",
    
    // Relationship events
    "RELATIONSHIP_ADD",
    "RELATIONSHIP_REMOVE",
    "RELATIONSHIP_UPDATE",
    
    // Typing events
    "TYPING_START",
    
    // Connection events
    "CONNECTION_OPEN",
    "CONNECTION_CLOSED",
    
    // Notification events
    "NOTIFICATION_CREATE",
    
    // Call events
    "CALL_CREATE",
    "CALL_UPDATE",
    "CALL_DELETE",
    
    // Experiment events
    "EXPERIMENT_BUCKET_OVERRIDE",
    
    // Modal events
    "MODAL_PUSH",
    "MODAL_POP",
    
    // Layer events
    "LAYER_PUSH",
    "LAYER_POP"
];

function subscribeToEvents() {
    MONITORED_EVENTS.forEach(eventType => {
        const handler = (data: any) => {
            addEvent(eventType, data, data);
        };
        
        FluxDispatcher.subscribe(eventType, handler);
        state.subscriptions.set(eventType, handler);
    });
}

function unsubscribeFromEvents() {
    state.subscriptions.forEach((handler, eventType) => {
        FluxDispatcher.unsubscribe(eventType, handler);
    });
    state.subscriptions.clear();
}

// Global API for console access
(window as any).EventLogger = {
    getEvents: () => state.events,
    
    clearEvents: () => {
        state.events = [];
        console.log("[Event Logger] Cleared all events");
    },
    
    getEvent: (id: string) => state.events.find(e => e.id === id),
    
    filterByType: (type: string) => {
        return state.events.filter(e => e.type === type);
    },
    
    filterByTimeRange: (startTime: number, endTime: number) => {
        return state.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    },
    
    getEventTypes: () => {
        const types = new Set(state.events.map(e => e.type));
        return Array.from(types).sort();
    },
    
    stats: () => {
        const total = state.events.length;
        const byType = state.events.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const sortedTypes = Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        
        console.log(`[Event Logger] Total Events: ${total}`);
        console.log("[Event Logger] Top 10 Event Types:");
        console.table(Object.fromEntries(sortedTypes));
    },
    
    exportEvents: (filename?: string) => {
        const data = JSON.stringify(state.events, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `event-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("[Event Logger] Exported events");
    },
    
    searchEvents: (query: string) => {
        const lowerQuery = query.toLowerCase();
        return state.events.filter(e => {
            const dataStr = JSON.stringify(e.data).toLowerCase();
            return e.type.toLowerCase().includes(lowerQuery) || dataStr.includes(lowerQuery);
        });
    },
    
    addFilter: (eventType: string) => {
        state.filters.types.add(eventType);
        state.filters.enabled = true;
        console.log(`[Event Logger] Added filter for ${eventType}`);
    },
    
    removeFilter: (eventType: string) => {
        state.filters.types.delete(eventType);
        if (state.filters.types.size === 0) {
            state.filters.enabled = false;
        }
        console.log(`[Event Logger] Removed filter for ${eventType}`);
    },
    
    clearFilters: () => {
        state.filters.types.clear();
        state.filters.enabled = false;
        console.log("[Event Logger] Cleared all filters");
    },
    
    getFilters: () => Array.from(state.filters.types),
    
    watchEvent: (eventType: string, callback: (event: DiscordEvent) => void) => {
        const handler = (data: any) => {
            if (shouldLogEvent(eventType)) {
                const event: DiscordEvent = {
                    id: generateId(),
                    timestamp: Date.now(),
                    type: eventType,
                    data,
                    raw: data
                };
                callback(event);
            }
        };
        
        FluxDispatcher.subscribe(eventType, handler);
        console.log(`[Event Logger] Started watching ${eventType}`);
        
        return () => {
            FluxDispatcher.unsubscribe(eventType, handler);
            console.log(`[Event Logger] Stopped watching ${eventType}`);
        };
    },
    
    timeline: (minutes: number = 5) => {
        const now = Date.now();
        const startTime = now - (minutes * 60 * 1000);
        const events = state.events.filter(e => e.timestamp >= startTime);
        
        console.log(`[Event Logger] Timeline (Last ${minutes} minutes):`);
        events.reverse().forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            console.log(`${time} - ${e.type}`);
        });
    }
};

export default definePlugin({
    name: "EventLogger",
    description: "Comprehensive Discord event logger with advanced filtering, search, and export capabilities",
    authors: [Devs.Ven],
    tags: ["Developers"],

    settings,

    start() {
        subscribeToEvents();
        console.log("[Event Logger] Started monitoring Discord events");
        console.log(`[Event Logger] Monitoring ${MONITORED_EVENTS.length} event types`);
        console.log("[Event Logger] Use window.EventLogger for programmatic access");
        console.log("[Event Logger] Available commands:");
        console.log("  - getEvents() - Get all logged events");
        console.log("  - clearEvents() - Clear event log");
        console.log("  - filterByType(type) - Filter by event type");
        console.log("  - getEventTypes() - List all event types");
        console.log("  - stats() - Show event statistics");
        console.log("  - exportEvents() - Export to JSON");
        console.log("  - searchEvents(query) - Search events");
        console.log("  - watchEvent(type, callback) - Watch specific event");
        console.log("  - timeline(minutes) - Show recent timeline");
    },

    stop() {
        unsubscribeFromEvents();
        state.events = [];
        delete (window as any).EventLogger;
        console.log("[Event Logger] Stopped monitoring");
    }
});
