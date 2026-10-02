# DDT Custom Client

<p align="center">
  <img src="./DDT%20CLIENT.png" alt="DDT Client Banner" width="100%" />
</p>

<p align="center">
  <img src="./ddt%20cleint%20icon.png" alt="DDT Icon" width="90" height="90" />
  <br/>
  <b>Discord Developer Tools Client</b>
  <br/>
  <i>Engineered for Developers, Power Users, and Enthusiasts.</i>
</p>

<p align="center">
  <a href="https://discord.gg/AVFfV8fXAN"><img src="https://img.shields.io/badge/Discord-Community_Server-5865F2?style=for-the-badge" alt="Discord Server" /></a>
  <a href="https://github.com/asrarkhann116-ops/DDT-Custom-Client"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/badge/Plugins-288+_Builtin-00D26A?style=for-the-badge" alt="Plugins" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge" alt="License" />
</p>

---

##  What is DDT?

**DDT (Discord Developer Tools)** is an advanced, ultra-high-performance Discord client modification built on top of [Vencord](https://github.com/Vendicated/Vencord). DDT supercharges your Discord experience with an enormous catalog of **288+ built-in custom user plugins**, specialized developer inspection utilities, audio visualizers, theme loaders, and an active titlebar status indicator.

---

## Live Project Stats

| Metric | Details |
| :--- | :--- |
| **Total DDT Plugins** | **288+ Custom Plugins** (Full built-in catalog) |
| **Core Framework Plugins** | **171 Built-in System Plugins** |
| **Curated Themes** | **112+ Themes** available via Theme Manager |
| **Source Lines** | **206,000+ Lines** of TypeScript/React |
| **Bundle Size** | **~1.0 MB** ultra-optimized renderer bundle |
| **Telemetry & Tracking** | **0% (Zero Telemetry, 100% Local)** |

---

##  Quick Install (Recommended)

### Windows Automated One-Liner (PowerShell)

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\Downloads\DDT-Custom-Client*" -ErrorAction SilentlyContinue; $zip="$env:TEMP\ddt.zip"; (New-Object System.Net.WebClient).DownloadFile("https://github.com/asrarkhann116-ops/DDT-Custom-Client/archive/refs/heads/main.zip", $zip); Expand-Archive -Force $zip "$env:USERPROFILE\Downloads"; Rename-Item "$env:USERPROFILE\Downloads\DDT-Custom-Client-main" "DDT-Custom-Client"; cd "$env:USERPROFILE\Downloads\DDT-Custom-Client"; python install.py
```

### Windows Git Clone Method

```powershell
git clone https://github.com/asrarkhann116-ops/DDT-Custom-Client.git "$env:USERPROFILE\Downloads\DDT-Custom-Client"
cd "$env:USERPROFILE\Downloads\DDT-Custom-Client"
python install.py
```

---

##  DDT-Asar Performance Boost (Optional)

During installation, you'll be prompted to install **DDT-Asar** - an optional performance enhancement:

### What is DDT-Asar?
- **2-4x faster Discord startup** (typically 6 seconds → 1.5 seconds)
- **Custom DDT-branded purple splash screen** with smooth animations
- **99% smaller file size** (58 KB vs 9 MB original Discord asar)
- **Zero tracking or telemetry** (unlike original Discord asar)
- **100% compatible** with DDT Client injection

### How it works
DDT-Asar is a custom-branded fork of OpenAsar that replaces Discord's bloated `app.asar` with an optimized version:
- ✅ DDT plugins continue working perfectly (injection is separate)
- ✅ Automatic backup created before installation
- ✅ Completely optional - DDT works great without it
- ✅ Pre-built and bundled (no build tools needed)

### Installation
The installer (`install.py`) will automatically:
1. Detect if DDT is already injected
2. Prompt: **"Install DDT-Asar? (y/n)"**
3. If yes: safely replace Discord's core with DDT-Asar
4. If no: skip and continue with standard setup

**Recommended:** Say **yes** for best performance! 🚀

---

##  Manual Installation

```powershell
# 1. Clone repository
git clone https://github.com/asrarkhann116-ops/DDT-Custom-Client.git
cd DDT-Custom-Client

# 2. Install dependencies
npm install -g pnpm
pnpm install

# 3. Build DDT
pnpm build

# 4. Inject into Discord
pnpm inject
```

---

## Highlighted DDT Plugins

### Native DDT Suites
- **DDT Auto Updater** (`ddtUpdater`)  Real-time updates directly via GitHub API.
- **DDT Announcements** (`ddtAnnouncements`)  Integrated update modal connecting to community Discord & GitHub.
- **DDT Dynamic Island** (`ddtDynamicIsland`)  Fluid floating status bar with spring physics.
- **DDT Message Logger** (`ddtMessageLogger`)  High-precision local message log retention & search.
- **DDT Quest Automator** (`ddtQuestAutomator`)  Automated discord quest tracking and rewards.
- **DDT Tutorial** (`ddtTutorial`)  Interactive step-by-step feature onboarding.
- **DDT Mutual Scanner** (`mutualScanner`)  Scan mutual servers & shared friends.
- **DDT Presence Lab** (`presenceLab`)  Local activity & presence session sandbox.
- **DDT Send Trail** (`sendTrail`)  Sent message tracking, rapid actions, and purge controls.
- **Music Visualizer** (`musicVisualizer`)  In-app streaming with real-time waveform HUD & lyrics.
- **Account Switcher** (`accountSwitcher`)  Instant multi-account switching with encrypted storage.
- **DDT Theme Manager** (`developerTheme`)  112+ curated themes with instant switching.

---

##  Complete DDT User Plugin Directory

> **Note:** Every user plugin in this client is part of the DDT ecosystem. Browse the full A-Z directory below using collapsible dropdowns.

### Complete DDT User Plugin Directory (288 Plugins)

> Explore the full catalog of built-in DDT user plugins below. Click any section to toggle.

<details>
<summary><b>Section # (1 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| 2FA HIder |
</details>

<details>
<summary><b>Section A (11 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| AnonLiDrop | AutoModBypass | accountSwitcher |
| advancedPermissions | altKrispSwitch | alwaysExpandProfiles |
| animalese | apiInspector | atSomeone |
| autoJumpToMessage | autoZipper |
</details>

<details>
<summary><b>Section B (19 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| BadgesSelector | BoosterCount-main | bannersEverywhere |
| baseDecoder | betterActivities | betterAudioPlayer |
| betterBanReasons | betterBlockedUsers | betterCommands |
| betterForwards | betterImageEditor | betterInvites |
| betterMicrophone.desktop | betterPlusReacts | betterScreenshare.desktop |
| blockKeywords | blockKrisp | bypassPinPrompt |
| bypassStatus |
</details>

<details>
<summary><b>Section C (27 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| ClientDiagnostics | ConsoleCleaner | CustomDNS |
| channelBadges | channelTabs | clanSwitcher |
| cleanChannelName | cleanerChannelGroups | clickableRoles |
| clientSideBlock | clipUpload.desktop | clipsEnhancements.discordDesktop |
| collapsibleUi | commandPalette | contentWarning |
| copyProfileColors | copyStatusUrls | copyUserMention |
| crashHandlerEnhanched | cursorBuddy | customFolderIcons |
| customSounds | customStatusTimeouts | customStream |
| customTimestamps | customUserColors | customWelcomer |
</details>

<details>
<summary><b>Section D (20 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| DiscordHardened | DiscordLock | ddtAnnouncements |
| ddtDynamicIsland | ddtEasterEgg | ddtMessageLogger |
| ddtQuestAutomator | ddtTutorial | ddtUpdater |
| declutter | detectBlock | devToolsPanel |
| developerTheme | disableAnimations | disableCameras |
| discordDevBanner | dontLimitMe | downloadAllAttachments |
| dragFavoriteEmotes | dragify |
</details>

<details>
<summary><b>Section E (10 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| elementHighlighter.dev | embeddedURLs | equibopStreamFixes.equibop |
| equicordHelper | equicordToolbox | equissant |
| eventLogger | exitSounds | expandedWidgets |
| exportMessages |
</details>

<details>
<summary><b>Section F (16 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| FakeMuteAndDeafen | FastGifPicker | FloeP2PService.desktop |
| FollowUser | fastDeleteChannels | favouriteAnything |
| fileUpload | findReply | fixFileExtensions |
| followVoiceUser | fontLoader | frequentQuickSwitcher |
| friendCodes | friendTags | friendshipRanks |
| fullVcPfp |
</details>

<details>
<summary><b>Section G (9 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| GhostSelfbot | gatewayLogger | ghosted |
| gifCollections | gifMaker | githubRepos |
| globalBadges | googleThat | guildPickerDumper |
</details>

<details>
<summary><b>Section H (7 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| Hisako's Optimizations | hideChatButtons | hideMessages |
| hideServers | homeTyping | hopOn |
| husk |
</details>

<details>
<summary><b>Section I (10 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| IGP | iRememberYou | iconViewer |
| idleAutoRestart | ignoreCalls | inRole |
| ingtoninator | instantScreenshare | invisibleChat.desktop |
| inviteDefaults |
</details>

<details>
<summary><b>Section J (1 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| jumpTo |
</details>

<details>
<summary><b>Section K (3 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| keyboardNavigation | keyboardSounds | keywordNotify |
</details>

<details>
<summary><b>Section L (4 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| LarpCord | lastActive | limitlessScreenshare |
| loginWithQR |
</details>

<details>
<summary><b>Section M (21 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| MassMention | MultiInstance | markdownTables |
| mediaPlaybackSpeed | messageBurst | messageColors |
| messageFetchTimer | messageLinkTooltip | messageLoggerEnhanced |
| messageNotifier | messagePeek | messageTranslate |
| micLoopbackTester | middleClickTweaks | moreCommands |
| moreStickers | moreUserTags | moyai |
| musicControls | musicVisualizer | mutualScanner |
</details>

<details>
<summary><b>Section N (13 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| NightcordPort | NightyNitroSniper | NitroSniper |
| NsfwGateBypass | networkInspector | neverPausePreviews |
| newPluginsManager | noNitroUpsell | noPushToTalk |
| noRPC.discordDesktop | noRoleHeaders | normalizeMessageLinks |
| notificationTitle.discordDesktop |
</details>

<details>
<summary><b>Section O (4 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| OSINTToolkit | opSec | openOptimizer |
| orbolayBridge |
</details>

<details>
<summary><b>Section P (11 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| PluginStars | PrivateSearchEngine.desktop | partyMode |
| pendingFriendRequest | philsPluginLibrary | pinIcon |
| pingNotifications | platformSpoofer | polishWording |
| presenceLab | profileSets |
</details>

<details>
<summary><b>Section Q (3 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| questify | quickThemeSwitcher.discordDesktop | quoter |
</details>

<details>
<summary><b>Section R (10 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| RamOptimizer.desktop | randomVoice | reactionTimestamps |
| recentDMSwitcher | remix | repeatMessages |
| replyPingControl | richMagnetLinks | richPresence |
| rpcEditor |
</details>

<details>
<summary><b>Section S (48 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| ScreenShareAlert | SecureBookmarks | SecureZipper |
| Securecord | SecurecordOpossum | ServerBadges |
| SilentDelete | SilentEdit | Silentcall |
| SoundPad | SpatialAudio | StaffDetector |
| StreamProof | Surveillance | saveFavoriteGIFs |
| scamLinkDetector | scheduledMessages | screenRecorder.equibop |
| searchFix | sedEnhanced | sekaiStickers |
| sendTrail | serverCloner | serverSearch |
| shareClientConfig | showBadgesInChat | showMessageEmbeds |
| showResourceChannels | showRolesInChat | showSongName |
| sidebarChat | signature | silenceUsers |
| snowfall | songLink.desktop | songSpotlight.desktop |
| splitLargeMessages | stalker | statusCycler |
| statusPresets | statusWhileActive.desktop | steamStatusSync |
| stereoInstaller.desktop | stereoScreenshareAudio | stickerBlocker |
| stopAutoUnread | streaks | streamingCodecDisabler |
</details>

<details>
<summary><b>Section T (12 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| talkInReverse | themeLibrary | tidalEmbeds |
| timezones | title | toastNotifications |
| toggleVideoBind | tokenManager | toneIndicators |
| translatePlus | triviaAI | typingFriends |
</details>

<details>
<summary><b>Section U (7 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| unitConverter | universalMention | unlimitedAccounts |
| unreadBadgeCount | urlHighlighter | userpfp |
| userpluginInstaller.dev |
</details>

<details>
<summary><b>Section V (11 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| vcPanelSettings | vencord-gpubinder-main | voiceButtons |
| voiceChannelLog | voiceChatUtils | voiceJoinMessages |
| voiceMessageTranscriber.desktop | voiceMessagesInBackground | voiceRejoin |
| voiceServerInfo | voiceStats |
</details>

<details>
<summary><b>Section W (7 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| waitForSlot | webRtcLeakPrevent | webpackTarball |
| whitelistedEmojis | whosWatching | wigglyText |
| writeUpperCase |
</details>

<details>
<summary><b>Section Y (1 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| yMusicSync.desktop |
</details>

<details>
<summary><b>Section Z (2 Plugins)</b></summary>

| Plugin Name | Plugin Name | Plugin Name |
| :--- | :--- | :--- |
| ZeroWidthSanitizer | zipPreview |
</details>
---

## Community & Support

Join our official community for support, updates, discussions, and plugin requests:

-  **Discord Server:** [discord.gg/AVFfV8fXAN](https://discord.gg/AVFfV8fXAN)
-  **Issue Tracker:** [GitHub Issues](https://github.com/asrarkhann116-ops/DDT-Custom-Client/issues)
-  **Source Code:** [DDT GitHub Repo](https://github.com/asrarkhann116-ops/DDT-Custom-Client)

---

## License & Credits

- Licensed under **GPL-3.0**.
- Developed with passion by [asrarkhann116-ops](https://github.com/asrarkhann116-ops) & contributors.
- Based on [Vencord](https://github.com/Vendicated/Vencord).
