/*
 * DDT Custom Client - Custom Welcomer
 * Copyright (c) 2024 DDT Team
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import { DataStore } from "@api/index";

const DEFAULT_VIDEO_URL = "https://raw.githubusercontent.com/asrarkhann116-ops/DDT-Custom-Client/main/src/userplugins/customWelcomer/assets/Pixel_rocket_launching_intro_ani…_20260919131544.mp4";
const DEFAULT_AUDIO_URL = "https://raw.githubusercontent.com/asrarkhann116-ops/DDT-Custom-Client/main/src/userplugins/customWelcomer/assets/gta_iv.mp3";

// Storage keys for DataStore persistence across reloads
const DS_VIDEO_KEY = "customWelcomer_video";
const DS_AUDIO_KEY = "customWelcomer_audio";

// In-memory cache (loaded on plugin start)
let localVideoData: string | null = null;
let localAudioData: string | null = null;

// Safe storage using Vencord's DataStore (works in all contexts)
const safeStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await DataStore.get(key) || null;
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await DataStore.set(key, value);
        } catch (e) {
            console.warn("[Custom Welcomer] DataStore unavailable:", e);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await DataStore.del(key);
        } catch (e) {
            console.warn("[Custom Welcomer] DataStore unavailable:", e);
        }
    }
};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Custom Welcomer",
        default: true
    },
    useLocalFiles: {
        type: OptionType.BOOLEAN,
        description: "Use local files instead of URLs (upload below)",
        default: false
    },
    customVideoURL: {
        type: OptionType.STRING,
        description: "Custom Video URL (max 10s, leave empty for default)",
        default: "",
        placeholder: "https://example.com/video.mp4"
    },
    customAudioURL: {
        type: OptionType.STRING,
        description: "Custom Audio URL (max 10s, leave empty for default)",
        default: "",
        placeholder: "https://example.com/audio.mp3"
    },
    muteVideoAudio: {
        type: OptionType.BOOLEAN,
        description: "Mute video's original audio",
        default: true
    },
    fadeInDuration: {
        type: OptionType.SLIDER,
        description: "Fade-in duration (seconds)",
        default: 0.5,
        markers: [0.3, 0.5, 1, 1.5, 2],
        stickToMarkers: false
    },
    fadeOutDuration: {
        type: OptionType.SLIDER,
        description: "Fade-out duration (seconds)",
        default: 1,
        markers: [0.5, 1, 1.5, 2, 3],
        stickToMarkers: false
    },
    showOnEveryLoad: {
        type: OptionType.BOOLEAN,
        description: "Show welcome screen on every Discord load",
        default: true
    },
    uploadVideoButton: {
        type: OptionType.COMPONENT,
        description: "Upload Custom Video (max 10s, MP4/WebM)",
        component: () => {
            const { Button } = require("@webpack/common") as any;
            
            return React.createElement(Button, {
                onClick: () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "video/mp4,video/webm,video/*";
                    input.onchange = async (e: any) => {
                        const file = e.target?.files?.[0];
                        if (!file) return;
                        
                        // Check duration
                        const video = document.createElement("video");
                        video.preload = "metadata";
                        video.src = URL.createObjectURL(file);
                        
                        await new Promise((resolve) => {
                            video.onloadedmetadata = () => {
                                if (video.duration > 10) {
                                    alert("❌ Video too long! Max 10 seconds allowed.");
                                    URL.revokeObjectURL(video.src);
                                    resolve(false);
                                    return;
                                }
                                resolve(true);
                            };
                        });
                        
                        // Convert to base64 and persist
                        const reader = new FileReader();
                        reader.onload = async () => {
                            localVideoData = reader.result as string;
                            await safeStorage.setItem(DS_VIDEO_KEY, localVideoData);
                            alert(`✅ Video uploaded & saved: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) — will persist after Ctrl+R`);
                        };
                        reader.readAsDataURL(file);
                        
                        URL.revokeObjectURL(video.src);
                    };
                    input.click();
                }
            }, "📹 Upload Video File");
        }
    },
    uploadAudioButton: {
        type: OptionType.COMPONENT,
        description: "Upload Custom Audio (max 10s, MP3/WAV)",
        component: () => {
            const { Button } = require("@webpack/common") as any;
            
            return React.createElement(Button, {
                onClick: () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "audio/mp3,audio/mpeg,audio/wav,audio/*";
                    input.onchange = async (e: any) => {
                        const file = e.target?.files?.[0];
                        if (!file) return;
                        
                        // Check duration
                        const audio = document.createElement("audio");
                        audio.preload = "metadata";
                        audio.src = URL.createObjectURL(file);
                        
                        await new Promise((resolve) => {
                            audio.onloadedmetadata = () => {
                                if (audio.duration > 10) {
                                    alert("❌ Audio too long! Max 10 seconds allowed.");
                                    URL.revokeObjectURL(audio.src);
                                    resolve(false);
                                    return;
                                }
                                resolve(true);
                            };
                        });
                        
                        // Convert to base64 and persist
                        const reader = new FileReader();
                        reader.onload = async () => {
                            localAudioData = reader.result as string;
                            await safeStorage.setItem(DS_AUDIO_KEY, localAudioData);
                            alert(`✅ Audio uploaded & saved: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) — will persist after Ctrl+R`);
                        };
                        reader.readAsDataURL(file);
                        
                        URL.revokeObjectURL(audio.src);
                    };
                    input.click();
                }
            }, "🎵 Upload Audio File");
        }
    },
    clearLocalFiles: {
        type: OptionType.COMPONENT,
        description: "Clear uploaded local files",
        component: () => {
            const { Button } = require("@webpack/common") as any;
            
            return React.createElement(Button, {
                color: Button.Colors.RED,
                onClick: async () => {
                    localVideoData = null;
                    localAudioData = null;
                    await safeStorage.removeItem(DS_VIDEO_KEY);
                    await safeStorage.removeItem(DS_AUDIO_KEY);
                    alert("✅ Local files cleared! Will use default or URLs.");
                }
            }, "🗑️ Clear Local Files");
        }
    }
});

let hasShownThisSession = false;
let welcomeContainer: HTMLDivElement | null = null;
let videoElement: HTMLVideoElement | null = null;
let audioElement: HTMLAudioElement | null = null;

async function createWelcomeScreen() {
    try {
        // Check if already shown this session
        if (!settings.store.showOnEveryLoad && hasShownThisSession) {
            console.log("[Custom Welcomer] Already shown this session, skipping");
            return;
        }

        // Remove any existing welcome screen
        removeWelcomeScreen();

        // Determine video and audio sources
        let videoURL: string;
        let audioURL: string;

        if (settings.store.useLocalFiles && (localVideoData || localAudioData)) {
            // Use local uploaded files
            videoURL = localVideoData || DEFAULT_VIDEO_URL;
            audioURL = localAudioData || DEFAULT_AUDIO_URL;
            console.log("[Custom Welcomer] Using local uploaded files");
        } else {
            // Use URLs
            videoURL = settings.store.customVideoURL?.trim() || DEFAULT_VIDEO_URL;
            audioURL = settings.store.customAudioURL?.trim() || DEFAULT_AUDIO_URL;
            console.log("[Custom Welcomer] Using URLs");
        }
        const fadeInDur = settings.store.fadeInDuration || 0.5;
        const fadeOutDur = settings.store.fadeOutDuration || 1;
        const muteVideo = settings.store.muteVideoAudio !== false; // Default true

        console.log("[Custom Welcomer] Preloading media...");

        // Create container (hidden initially)
        welcomeContainer = document.createElement("div");
        welcomeContainer.id = "ddt-custom-welcomer";
        welcomeContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity ${fadeInDur}s ease-in;
        `;

        // Create video element
        videoElement = document.createElement("video");
        videoElement.src = videoURL;
        videoElement.muted = muteVideo;
        videoElement.playsInline = true;
        videoElement.preload = "auto"; // Force preload
        videoElement.style.cssText = `
            width: 100vw;
            height: 100vh;
            object-fit: cover;
        `;

        // Create audio element
        audioElement = document.createElement("audio");
        audioElement.src = audioURL;
        audioElement.volume = 0; // Start at 0 for fade-in
        audioElement.preload = "auto"; // Force preload

        // Append to DOM but keep hidden
        welcomeContainer.appendChild(videoElement);
        document.body.appendChild(welcomeContainer);

        // Wait for BOTH to be fully loaded
        console.log("[Custom Welcomer] Waiting for media to load...");
        
        await Promise.all([
            new Promise((resolve, reject) => {
                if (videoElement!.readyState >= 3) { // HAVE_FUTURE_DATA or better
                    resolve(true);
                } else {
                    videoElement!.addEventListener("canplaythrough", () => resolve(true), { once: true });
                    videoElement!.addEventListener("error", reject, { once: true });
                }
                // Timeout after 10s
                setTimeout(() => reject(new Error("Video load timeout")), 10000);
            }),
            new Promise((resolve, reject) => {
                if (audioElement!.readyState >= 3) {
                    resolve(true);
                } else {
                    audioElement!.addEventListener("canplaythrough", () => resolve(true), { once: true });
                    audioElement!.addEventListener("error", reject, { once: true });
                }
                // Timeout after 10s
                setTimeout(() => reject(new Error("Audio load timeout")), 10000);
            })
        ]);

        console.log("[Custom Welcomer] Media loaded! Starting playback in perfect sync...");

        // Get video duration
        const videoDuration = videoElement.duration;
        console.log(`[Custom Welcomer] Video duration: ${videoDuration}s`);

        // Setup audio trimming to match video duration
        audioElement.addEventListener("timeupdate", () => {
            if (audioElement && audioElement.currentTime >= videoDuration) {
                audioElement.pause();
                audioElement.currentTime = 0;
            }
        });

        // NOW play both together in PERFECT SYNC
        const playStartTime = performance.now();
        
        await Promise.all([
            videoElement.play().catch(err => {
                console.error("[Custom Welcomer] Video play failed:", err);
                throw err;
            }),
            audioElement.play().catch(err => {
                console.error("[Custom Welcomer] Audio play failed:", err);
                throw err;
            })
        ]);

        const playDelay = performance.now() - playStartTime;
        console.log(`[Custom Welcomer] Both started playing in ${playDelay.toFixed(2)}ms (perfect sync)`);

        // Fade in container
        setTimeout(() => {
            if (welcomeContainer) {
                welcomeContainer.style.opacity = "1";
            }
        }, 50);

        // Fade in audio
        fadeInAudio(audioElement, fadeInDur);

        // Schedule fade out and removal
        const fadeOutStart = Math.max(0, videoDuration - fadeOutDur);
        setTimeout(() => {
            fadeOutAndRemove(fadeOutDur);
        }, fadeOutStart * 1000);

        // Fallback: remove after 15s max
        setTimeout(() => {
            removeWelcomeScreen();
        }, 15000);

        // Mark as shown
        hasShownThisSession = true;
        console.log("[Custom Welcomer] Welcome screen displayed in perfect sync! 🚀");

    } catch (error) {
        console.error("[Custom Welcomer] Failed to create welcome screen:", error);
        removeWelcomeScreen();
    }
}

function fadeInAudio(audio: HTMLAudioElement, duration: number) {
    try {
        const steps = 50;
        const increment = 1 / steps;
        const interval = (duration * 1000) / steps;

        let currentVolume = 0;
        const fadeInterval = setInterval(() => {
            if (currentVolume >= 1) {
                clearInterval(fadeInterval);
                audio.volume = 1;
                return;
            }
            currentVolume += increment;
            audio.volume = Math.min(currentVolume, 1);
        }, interval);
    } catch (error) {
        console.error("[Custom Welcomer] Audio fade-in failed:", error);
    }
}

function fadeOutAndRemove(duration: number) {
    try {
        // Fade out container
        if (welcomeContainer) {
            welcomeContainer.style.transition = `opacity ${duration}s ease-out`;
            welcomeContainer.style.opacity = "0";
        }

        // Fade out audio
        if (audioElement) {
            const steps = 50;
            const decrement = audioElement.volume / steps;
            const interval = (duration * 1000) / steps;

            const fadeInterval = setInterval(() => {
                if (!audioElement || audioElement.volume <= 0) {
                    clearInterval(fadeInterval);
                    if (audioElement) {
                        audioElement.pause();
                        audioElement.volume = 0;
                    }
                    return;
                }
                audioElement.volume = Math.max(0, audioElement.volume - decrement);
            }, interval);
        }

        // Remove after fade completes
        setTimeout(() => {
            removeWelcomeScreen();
        }, duration * 1000 + 100);

    } catch (error) {
        console.error("[Custom Welcomer] Fade-out failed:", error);
        removeWelcomeScreen();
    }
}

function removeWelcomeScreen() {
    try {
        if (videoElement) {
            videoElement.pause();
            videoElement.src = "";
            videoElement = null;
        }

        if (audioElement) {
            audioElement.pause();
            audioElement.src = "";
            audioElement = null;
        }

        if (welcomeContainer) {
            welcomeContainer.remove();
            welcomeContainer = null;
        }

        console.log("[Custom Welcomer] Welcome screen removed");
    } catch (error) {
        console.error("[Custom Welcomer] Failed to remove welcome screen:", error);
    }
}

export default definePlugin({
    name: "CustomWelcomer",
    description: "Custom welcome screen with video and audio on Discord startup (max 10s, buttery smooth fades)",
    authors: [Devs.Ven],
    tags: ["Media", "Fun", "Customisation"],

    settings,

    start() {
        try {
            console.log("[Custom Welcomer] Started");

            // Load cached files from DataStore first
            (async () => {
                localVideoData = await safeStorage.getItem(DS_VIDEO_KEY);
                localAudioData = await safeStorage.getItem(DS_AUDIO_KEY);
                
                // Show welcome screen after loading cache
                setTimeout(() => {
                    if (settings.store.enabled) {
                        createWelcomeScreen();
                    }
                }, 1500);
            })();

        } catch (error) {
            console.error("[Custom Welcomer] Failed to start:", error);
        }
    },

    stop() {
        try {
            removeWelcomeScreen();
            hasShownThisSession = false;
            console.log("[Custom Welcomer] Stopped");
        } catch (error) {
            console.error("[Custom Welcomer] Failed to stop:", error);
        }
    }
});
