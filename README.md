<p align="center">
  <img src="assets/hero.svg" alt="DDT Custom Client: Build, Customize, Explore" width="100%" />
</p>

<p align="center">
  <img src="assets/typing.svg" alt="288+ built-in plugins. Zero telemetry. 110+ themes. 2-4x faster startup with DDT-Asar." width="760" />
</p>

<p align="center">
  <a href="https://discord.gg/AVFfV8fXAN"><img src="https://img.shields.io/badge/Discord-Community_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Server" /></a>
  <a href="https://github.com/asrarkhann116-ops/DDT-Custom-Client"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/badge/Plugins-288+_Built--in-2F81FF?style=for-the-badge" alt="288+ built-in plugins" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22 or newer" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-2F81FF?style=for-the-badge" alt="GPL-3.0 License" />
</p>

<p align="center">
  <a href="#what-is-ddt"><b>Overview</b></a> &nbsp;/&nbsp;
  <a href="#quick-install"><b>Quick Install</b></a> &nbsp;/&nbsp;
  <a href="#ddt-asar-performance-boost"><b>DDT-Asar</b></a> &nbsp;/&nbsp;
  <a href="#manual-installation"><b>Manual Install</b></a> &nbsp;/&nbsp;
  <a href="#highlighted-plugins"><b>Highlights</b></a> &nbsp;/&nbsp;
  <a href="#complete-ddt-user-plugin-directory"><b>All Plugins</b></a> &nbsp;/&nbsp;
  <a href="#community--support"><b>Community</b></a>
</p>

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## What is DDT?

**DDT (Discord Developer Tool)** is an advanced, ultra-high-performance Discord client modification built on top of [Vencord](https://github.com/Vendicated/Vencord). It supercharges your Discord experience with an enormous catalog of **288+ built-in custom user plugins**, specialized developer inspection utilities, audio visualizers, theme loaders, and an active titlebar status indicator.

<p align="center">
  <img src="assets/stats.svg" alt="DDT at a glance: 288+ user plugins, 170+ core plugins, 110+ themes, 230K+ lines of code, 0% telemetry" width="100%" />
</p>

- **Lean:** ~1.1 MB optimized renderer bundle
- **Private:** zero telemetry, everything stays local
- **Modern:** built for Node.js 22+ and pnpm

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## Quick Install

Run the installer and watch DDT build itself, inject into Discord, and (optionally) drop in DDT-Asar:

<p align="center">
  <img src="assets/terminal.svg" alt="Animated terminal: python install.py checks Node.js and pnpm, installs dependencies, builds DDT, injects it into Discord and installs DDT-Asar" width="100%" />
</p>

> **Requirements:** Windows, Python 3 and Node.js 22+. The installer checks Node.js and installs pnpm for you.

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

After the installer finishes, fully close Discord (check the system tray) and restart it.

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## DDT-Asar Performance Boost

During installation you'll be asked whether to install **DDT-Asar**, an optional performance enhancement:

<p align="center">
  <img src="assets/speed.svg" alt="DDT-Asar starts Discord about 4x faster than the stock asar (about 1.5 s vs 6 s) and is 99% smaller (about 47 KB vs 9 MB)" width="100%" />
</p>

### What is DDT-Asar?

- **2-4x faster Discord startup** (typically 6 seconds down to 1.5 seconds)
- **Custom DDT-branded purple splash screen** with smooth animations
- **99% smaller file size** (~47 KB vs ~9 MB for the original Discord asar)
- **Zero tracking or telemetry**, unlike the original Discord asar
- **100% compatible** with DDT Client injection

### How it works

DDT-Asar is a custom-branded fork of OpenAsar that replaces Discord's bloated `app.asar` with an optimized version:

- DDT plugins keep working perfectly, because injection is separate
- An automatic backup is created before installation
- Completely optional: DDT works great without it
- Pre-built and bundled, so no build tools are needed

### Installation

The installer (`install.py`) will automatically:

1. Detect whether DDT is already injected
2. Prompt: **"Install DDT-Asar? (y/n)"**
3. If yes: safely replace Discord's core with DDT-Asar
4. If no: skip it and continue with the standard setup

**Recommended:** answer **y** for the best performance.

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## Manual Installation

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

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## Highlighted Plugins

| Plugin | ID | What it does |
| :--- | :--- | :--- |
| **DDT Auto Updater** | `ddtUpdater` | Real-time updates directly via the GitHub API |
| **DDT Announcements** | `ddtAnnouncements` | Integrated update modal connecting to the community Discord and GitHub |
| **DDT Dynamic Island** | `ddtDynamicIsland` | Fluid floating status bar with spring physics |
| **DDT Message Logger** | `ddtMessageLogger` | High-precision local message log retention and search |
| **DDT Quest Automator** | `ddtQuestAutomator` | Automated Discord quest tracking and rewards |
| **DDT Tutorial** | `ddtTutorial` | Interactive step-by-step feature onboarding |
| **DDT Mutual Scanner** | `mutualScanner` | Scan mutual servers and shared friends |
| **DDT Presence Lab** | `presenceLab` | Local activity and presence session sandbox |
| **DDT Send Trail** | `sendTrail` | Sent message tracking, rapid actions, and purge controls |
| **Music Visualizer** | `musicVisualizer` | In-app streaming with a real-time waveform HUD and lyrics |
| **Account Switcher** | `accountSwitcher` | Instant multi-account switching with encrypted storage |
| **DDT Theme Manager** | `developerTheme` | 110+ curated themes with instant switching |

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## Complete DDT User Plugin Directory

> Every user plugin in this client is part of the DDT ecosystem. Browse the full A-Z catalog of **288 built-in user plugins** below. Click any section to expand it.

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

<p align="center"><img src="assets/divider.svg" alt="" width="100%" /></p>

## Community & Support

Join our official community for support, updates, discussions, and plugin requests:

- **Discord Server:** [discord.gg/AVFfV8fXAN](https://discord.gg/AVFfV8fXAN)
- **Issue Tracker:** [GitHub Issues](https://github.com/asrarkhann116-ops/DDT-Custom-Client/issues)
- **Source Code:** [DDT GitHub Repo](https://github.com/asrarkhann116-ops/DDT-Custom-Client)

## License & Credits

- Licensed under **GPL-3.0**.
- Developed with passion by [asrarkhann116-ops](https://github.com/asrarkhann116-ops) & contributors.
- Based on [Vencord](https://github.com/Vendicated/Vencord).

<p align="center">
  <img src="assets/footer.svg" alt="DDT: Build, Customize, Explore" width="100%" />
</p>
