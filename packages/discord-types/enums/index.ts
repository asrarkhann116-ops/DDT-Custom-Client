export * from "./activity";
export * from "./application";
export * from "./channel";
export * from "./commands";
export * from "./guild";
export * from "./messages";
export * from "./misc";
export * from "./settings";
export * from "./user";
export * from "./voice";

export enum QuestRewardType {
    UNKNOWN = 0,
    REWARD = 1,
    REWARD_CODE = 2,
    IN_GAME = 3,
    COLLECTIBLE = 4,
    VIRTUAL_CURRENCY = 5,
    FRACTIONAL_PREMIUM = 6
}

export enum QuestTaskType {
    UNKNOWN = 0,
    STREAM = 1,
    PLAY = 2,
    WATCH_VIDEO = 3,
    WATCH_VIDEO_ON_MOBILE = 4,
    ACHIEVEMENT_IN_ACTIVITY = 5,
    ACHIEVEMENT_IN_GAME = 6,
    PLAY_ACTIVITY = 7,
    PLAY_ON_DESKTOP = 8,
    PLAY_ON_DESKTOP_V2 = 9,
    STREAM_ON_DESKTOP = 10,
    PLAY_ON_PLAYSTATION = 11,
    PLAY_ON_XBOX = 12
}

export enum QuestTargetedContent {
    UNKNOWN = 0,
    QUEST_HOME_DESKTOP = 1
}

export type Quest = any;
export type QuestTaskWatchVideo = any;
export type QuestTaskWatchVideoOnMobile = any;
export type QuestUserStatus = any;
