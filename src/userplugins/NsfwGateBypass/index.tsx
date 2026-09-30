/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { createRoot, React } from "@webpack/common";

const logger = new Logger("NSFWGateBypass");

// Native module runs in Electron main process — CORS does not exist there
const Native = VencordNative.pluginHelpers.NSFWGateBypass as PluginNative<typeof import("./native")>;

// Fetch via native IPC (main process) — zero CORS restrictions
async function fetchApi(url: string): Promise<any> {
    const text = await Native.fetchUrl(url);
    return JSON.parse(text);
}

// ============================================
// API HANDLERS (CORS-FRIENDLY & PAGINATED)
// ============================================

interface MediaItem {
    id: string;
    thumbnail: string;
    full: string;
    source: string;
    tags: string[];
    score: number;
}

// Safebooru (SFW but same format, for testing)
async function fetchSafebooru(tags: string, limit = 42, page = 1): Promise<MediaItem[]> {
    try {
        const pid = page - 1;
        const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(tags)}&limit=${limit}&pid=${pid}&json=1`;
        const data = await fetchApi(url);
        if (!Array.isArray(data)) return [];

        return data.map((item: any) => {
            const highResUrl = `https://safebooru.org/images/${item.directory}/${item.image}`;
            return {
                id: String(item.id),
                thumbnail: highResUrl, // Using original for high quality
                full: highResUrl,
                source: "Safebooru",
                tags: item.tags ? item.tags.split(" ") : [],
                score: item.score || 0
            };
        });
    } catch (err) {
        logger.error("Safebooru fetch failed:", err);
        return [];
    }
}

// Nekos.best (SFW Anime — verified working, no Cloudflare)
async function fetchNekosBest(tags: string, limit = 20, page = 1): Promise<MediaItem[]> {
    try {
        // nekos.best categories: neko, kitsune, husbando, waifu
        const category = tags || "neko";
        const amount = Math.min(limit, 20); // max 20 per request
        const url = `https://nekos.best/api/v2/${encodeURIComponent(category)}?amount=${amount}`;
        const data = await fetchApi(url);
        if (!data.results) return [];

        return data.results.map((item: any) => ({
            id: item.url.split("/").pop()?.split(".")[0] || String(Date.now()),
            thumbnail: item.url,
            full: item.url,
            source: "Nekos.best",
            tags: [category],
            score: 0
        }));
    } catch (err) {
        logger.error("Nekos.best fetch failed:", err);
        return [];
    }
}

// NekosAPI v4 (SFW/NSFW — verified working, no Cloudflare)
async function fetchNekosApi(tags: string, limit = 40, page = 1): Promise<MediaItem[]> {
    try {
        const offset = (page - 1) * limit;
        const url = `https://api.nekosapi.com/v4/images?limit=${limit}&offset=${offset}${tags ? `&tag=${encodeURIComponent(tags)}` : ""}`;
        const data = await fetchApi(url);
        if (!data.items) return [];

        return data.items.map((item: any) => ({
            id: String(item.id),
            thumbnail: item.url,
            full: item.url,
            source: "NekosAPI",
            tags: item.tags || [],
            score: 0
        })).filter((i: MediaItem) => i.thumbnail && i.full);
    } catch (err) {
        logger.error("NekosAPI fetch failed:", err);
        return [];
    }
}

const API_MAP = {
    favorites: { fetch: async () => [], name: "Favorites ❤️", color: "#ff474d", popular: [] },
    safebooru: { fetch: fetchSafebooru, name: "Safebooru", color: "#58a6ff", popular: ["blonde_hair", "1girl", "solo", "long_hair"] },
    nekosbest: { fetch: fetchNekosBest, name: "Nekos.best", color: "#e84393", popular: ["neko", "kitsune", "waifu", "husbando"] },
    nekosapi: { fetch: fetchNekosApi, name: "NekosAPI", color: "#ff7675", popular: ["girl", "catgirl", "brown_hair", "school_uniform"] },
};

type SourceKey = keyof typeof API_MAP;

// ============================================
// DASHBOARD COMPONENT
// ============================================

interface DashboardProps {
    onClose: () => void;
}

function DashboardComponent({ onClose }: DashboardProps) {
    const [source, setSource] = React.useState<SourceKey>("nekosapi");
    const [query, setQuery] = React.useState("");
    const [items, setItems] = React.useState<MediaItem[]>([]);

    // Pagination state
    const [page, setPage] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);

    // UI state
    const [selectedItem, setSelectedItem] = React.useState<MediaItem | null>(null);
    const [showWelcome, setShowWelcome] = React.useState(true);
    const [downloading, setDownloading] = React.useState(false);

    // Favorites state
    const [favorites, setFavorites] = React.useState<MediaItem[]>([]);

    // Load favorites from local storage on mount
    React.useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = window.localStorage.getItem("nsfw_hub_favorites");
                if (saved) setFavorites(JSON.parse(saved));
            }
        } catch (e) {
            logger.error("Failed to load favorites", e);
        }
    }, []);

    // Save favorites to local storage on change
    React.useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem("nsfw_hub_favorites", JSON.stringify(favorites));
            }
        } catch (e) {
            logger.error("Failed to save favorites", e);
        }
    }, [favorites]);

    const currentSource = API_MAP[source];

    const handleSearch = async (isLoadMore = false, overrideQuery?: string) => {
        if (source === "favorites") return;
        const activeQuery = overrideQuery !== undefined ? overrideQuery : query;
        if (!activeQuery.trim() && !isLoadMore) return;

        const targetPage = isLoadMore ? page + 1 : 1;

        if (isLoadMore) setLoadingMore(true);
        else {
            setLoading(true);
            setItems([]);
            setShowWelcome(false);
        }

        try {
            const results = await currentSource.fetch(activeQuery, 40, targetPage);

            if (results.length < 40) setHasMore(false);
            else setHasMore(true);

            if (isLoadMore) setItems(prev => [...prev, ...results]);
            else setItems(results);

            setPage(targetPage);
        } catch (err) {
            logger.error("Search failed:", err);
            if (!isLoadMore) setItems([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleQuickTag = (tag: string) => {
        setQuery(tag);
        setShowWelcome(false);
        setTimeout(() => handleSearch(false, tag), 50);
    };

    const toggleFavorite = (item: MediaItem, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFavorites(prev => {
            const exists = prev.find(f => f.id === item.id && f.source === item.source);
            if (exists) return prev.filter(f => !(f.id === item.id && f.source === item.source));
            return [...prev, item];
        });
    };

    const isFavorite = (item: MediaItem) => {
        return favorites.some(f => f.id === item.id && f.source === item.source);
    };

    const handleDownload = async (item: MediaItem) => {
        if (downloading) return;
        setDownloading(true);
        try {
            // Open image URL directly — browser will handle the download
            window.open(item.full, "_blank");
        } catch (err) {
            logger.error("Download failed", err);
        } finally {
            setDownloading(false);
        }
    };

    // Auto-load favorites when tab is selected
    React.useEffect(() => {
        if (source === "favorites") {
            setItems(favorites);
            setShowWelcome(false);
            setHasMore(false);
        }
    }, [source, favorites]);

    const displayedItems = source === "favorites" ? favorites : items;

    return (
        <div className="nsfw-hub-overlay" onClick={onClose}>
            <div className="nsfw-hub-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="nsfw-hub-header">
                    <div className="nsfw-hub-title">
                        <span className="nsfw-hub-icon">🔞</span>
                        <h2>NSFW Hub</h2>
                        <span className="nsfw-hub-badge">{currentSource.name}</span>
                    </div>
                    <button onClick={onClose} className="nsfw-hub-close" title="Close">×</button>
                </div>

                {/* Source Tabs */}
                <div className="nsfw-hub-tabs">
                    {(Object.keys(API_MAP) as SourceKey[]).map(key => (
                        <button
                            key={key}
                            className={`nsfw-hub-tab ${source === key ? "active" : ""}`}
                            style={{ "--tab-color": API_MAP[key].color } as any}
                            onClick={() => {
                                setSource(key);
                                setQuery("");
                                setItems([]);
                                setPage(1);
                                setHasMore(true);
                                setShowWelcome(key !== "favorites");
                            }}
                        >
                            {API_MAP[key].name} {key === "favorites" ? `(${favorites.length})` : ""}
                        </button>
                    ))}
                </div>

                {/* Search Bar (Hide on favorites tab) */}
                {source !== "favorites" && (
                    <div className="nsfw-hub-search">
                        <input
                            type="text"
                            placeholder={`Search ${currentSource.name} tags... (e.g. 1girl solo)`}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSearch(false)}
                            className="nsfw-hub-input"
                        />
                        <button onClick={() => handleSearch(false)} disabled={loading || !query.trim()} className="nsfw-hub-button">
                            {loading ? "⏳" : "🔍"} {loading ? "Searching..." : "Search"}
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="nsfw-hub-content" id="nsfw-scroll-container">
                    {showWelcome && source !== "favorites" && (
                        <div className="nsfw-hub-welcome">
                            <h3>Popular Tags for {currentSource.name}</h3>
                            <div className="nsfw-hub-tags-grid">
                                {currentSource.popular.map(tag => (
                                    <button
                                        key={tag}
                                        className="nsfw-hub-tag-btn"
                                        onClick={() => handleQuickTag(tag)}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <p className="nsfw-hub-hint">💡 Click a tag or enter custom search above to start</p>
                        </div>
                    )}

                    {loading && (
                        <div className="nsfw-hub-loading">
                            <div className="nsfw-hub-spinner"></div>
                            <p>Fetching culture from {currentSource.name}...</p>
                        </div>
                    )}

                    {!showWelcome && !loading && displayedItems.length === 0 && (
                        <div className="nsfw-hub-empty">
                            <p>😔</p>
                            <h3>{source === "favorites" ? "No favorites yet" : "No results found"}</h3>
                            <p className="nsfw-hub-hint">
                                {source === "favorites"
                                    ? "Click the heart icon on any image to save it here!"
                                    : "Try different tags or switch to another source."}
                            </p>
                        </div>
                    )}

                    {!showWelcome && displayedItems.length > 0 && (
                        <>
                            <div className="nsfw-hub-gallery">
                                {displayedItems.map(item => (
                                    <div
                                        key={`${item.source}-${item.id}`}
                                        className="nsfw-hub-thumb"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <img src={item.thumbnail} alt="" loading="lazy" />
                                        <div className="nsfw-hub-thumb-overlay">
                                            <span className="nsfw-hub-score">⭐ {item.score}</span>
                                            <button
                                                className={`nsfw-hub-fav-btn ${isFavorite(item) ? "active" : ""}`}
                                                onClick={e => toggleFavorite(item, e)}
                                                title={isFavorite(item) ? "Remove from Favorites" : "Add to Favorites"}
                                            >
                                                {isFavorite(item) ? "❤️" : "🤍"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Load More Button for Pagination */}
                            {source !== "favorites" && hasMore && displayedItems.length > 0 && (
                                <div className="nsfw-hub-load-more-container">
                                    <button
                                        className="nsfw-hub-load-more"
                                        onClick={() => handleSearch(true)}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? "Loading more..." : "Load More"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Image Viewer */}
                {selectedItem && (
                    <div className="nsfw-hub-viewer" onClick={() => setSelectedItem(null)}>
                        <div className="nsfw-hub-viewer-box" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedItem(null)} className="nsfw-hub-viewer-close">×</button>

                            <img src={selectedItem.full} alt="" />

                            <div className="nsfw-hub-viewer-actions">
                                <button
                                    className="nsfw-hub-action-btn download"
                                    onClick={() => handleDownload(selectedItem)}
                                    disabled={downloading}
                                >
                                    {downloading ? "⏳ Downloading..." : "💾 Download Image"}
                                </button>
                                <button
                                    className={`nsfw-hub-action-btn fav ${isFavorite(selectedItem) ? "active" : ""}`}
                                    onClick={() => toggleFavorite(selectedItem)}
                                >
                                    {isFavorite(selectedItem) ? "❤️ Remove from Favorites" : "🤍 Add to Favorites"}
                                </button>
                            </div>

                            <div className="nsfw-hub-viewer-info">
                                <div className="nsfw-hub-viewer-meta">
                                    <span className="nsfw-hub-viewer-source">{selectedItem.source} #{selectedItem.id}</span>
                                    <span className="nsfw-hub-viewer-score">⭐ {selectedItem.score}</span>
                                </div>
                                <div className="nsfw-hub-viewer-tags">
                                    {selectedItem.tags.slice(0, 30).map((tag, i) => (
                                        <span key={i} className="nsfw-hub-viewer-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// PLUGIN DEFINITION
// ============================================

let dashboardContainer: HTMLDivElement | null = null;
let dashboardRoot: any = null;

function openDashboard() {
    if (dashboardContainer) {
        logger.info("Dashboard already open");
        return;
    }

    logger.info("Opening NSFW Hub...");

    dashboardContainer = document.createElement("div");
    dashboardContainer.id = "nsfw-hub-root";
    document.body.appendChild(dashboardContainer);

    const closeHandler = () => {
        if (dashboardContainer && dashboardRoot) {
            dashboardRoot.unmount();
            dashboardContainer.remove();
            dashboardContainer = null;
            dashboardRoot = null;
            logger.info("Dashboard closed");
        }
    };

    dashboardRoot = createRoot(dashboardContainer);
    dashboardRoot.render(React.createElement(DashboardComponent, { onClose: closeHandler }));
}

export default definePlugin({
    name: "NSFWGateBypass",
    description: "Browse NSFW content from multiple booru sources with a polished in-Discord interface",
    authors: [Devs.Unknown],
    tags: ["Fun", "Media"],

    toolboxActions: {
        "🔞 Open NSFW Hub": openDashboard
    },

    commands: [{
        name: "nsfw",
        description: "Open NSFW Hub",
        execute: () => {
            openDashboard();
        }
    }],

    start() {
        logger.info("NSFW Hub ready! Use /nsfw command or DDT Toolbox");

        // Global access
        (window as any).NSFWHub = {
            open: openDashboard,
            close: () => {
                if (dashboardContainer && dashboardRoot) {
                    dashboardRoot.unmount();
                    dashboardContainer.remove();
                    dashboardContainer = null;
                    dashboardRoot = null;
                }
            }
        };
    },

    stop() {
        logger.info("Plugin stopped");
        if (dashboardContainer && dashboardRoot) {
            dashboardRoot.unmount();
            dashboardContainer.remove();
            dashboardContainer = null;
            dashboardRoot = null;
        }
    }
});
