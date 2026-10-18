# 🔄 DDT Auto-Updater

**Automatic update checker with GitHub integration for DDT Custom Client**

## ✨ Features

- ✅ **GitHub API Integration** - Checks for new commits on main branch
- ✅ **Auto-Check on Startup** - Optional automatic update checking
- ✅ **Periodic Checks** - Configurable interval (hourly)
- ✅ **Desktop Notifications** - Get notified when updates are available
- ✅ **One-Click Download** - Opens browser with latest ZIP
- ✅ **Commit History** - View what's new in the update
- ✅ **Zero Dependencies** - Pure GitHub API, no Git required

## 🚀 Usage

### Console Commands

```javascript
// Check for updates
await DDTUpdater.checkForUpdates()

// Download latest version
await DDTUpdater.downloadUpdate()

// Get detailed update info
const info = await DDTUpdater.getUpdateInfo()

// Show current version
DDTUpdater.getCurrentHash()

// Open GitHub repo
DDTUpdater.openGitHubRepo()

// Show help
DDTUpdater.help()
```

### Settings

**Location:** Settings → Vencord → Plugins → DDTUpdater

- **Auto-check on startup** - Check for updates when Discord starts (5s delay)
- **Auto-download** - Automatically download updates (opens browser)
- **Update interval** - Check every X hours (0 = disabled)
- **Notify on update** - Show notification when updates are found

## 📋 Update Workflow

1. **Check for updates:**
   ```javascript
   await DDTUpdater.checkForUpdates()
   ```

2. **Download if available:**
   ```javascript
   await DDTUpdater.downloadUpdate()
   ```

3. **Install manually:**
   - Extract downloaded ZIP
   - Close Discord completely
   - Open terminal in extracted folder
   - Run: `python install.py`
   - Restart Discord

## 🔧 Technical Details

### How It Works

1. **Current Version Detection:**
   - Reads `__VENCORD_HASH__` (build-time Git hash)
   - Fallback to localStorage cache

2. **Update Check:**
   - Fetches last 50 commits from GitHub API
   - Compares current hash with latest commit
   - Returns commits between current and latest

3. **Download:**
   - Opens browser with ZIP download link
   - User manually extracts and runs `install.py`

### GitHub API

- **Endpoint:** `https://api.github.com/repos/asrarkhann116-ops/DDT-Custom-Client/commits`
- **Branch:** `main`
- **Rate Limit:** 60 requests/hour (unauthenticated)
- **No Auth Required:** Public repo access

### Storage

- `localStorage.ddt_current_commit` - Current version hash
- `localStorage.ddt_latest_commit` - Latest checked hash

## 🎯 Example Output

```javascript
> await DDTUpdater.checkForUpdates()

🔍 Checking for updates...
✅ Update available! Current: b9775ae → Latest: a1b2c3d

┌─────────────┬──────────────────────────────────┐
│   (index)   │             Values               │
├─────────────┼──────────────────────────────────┤
│ Has Update  │              true                │
│ Current Hash│            b9775ae               │
│ Latest Hash │            a1b2c3d               │
│ New Commits │               3                  │
│   Error     │             None                 │
└─────────────┴──────────────────────────────────┘

📋 Recent commits:
  1. a1b2c3d - Fix: Remove UpdateNotice call from QuestPanel
     by asrarkhann116-ops on 1/19/2025
  2. aa90a34 - Fix: Add all userplugins to GitHub
     by asrarkhann116-ops on 1/19/2025
  3. 4f81bdf - Fix: Add no-Git required install command
     by asrarkhann116-ops on 1/19/2025
```

## 🔒 Security

- ✅ **Read-only** - Only reads from GitHub, never writes
- ✅ **No Credentials** - Public API, no tokens needed
- ✅ **Manual Install** - User controls final installation step
- ✅ **Transparent** - All operations logged to console

## 🚨 Troubleshooting

### "Could not determine current commit hash"
- **Cause:** Build system didn't inject Git hash
- **Fix:** Hash stored in localStorage, will work after first update

### "GitHub API error: 403"
- **Cause:** Rate limit exceeded (60/hour)
- **Fix:** Wait 1 hour or authenticate (not implemented)

### "No commits found"
- **Cause:** GitHub API unreachable or repo private
- **Fix:** Check internet connection, verify repo is public

### Updates not detected
- **Cause:** Current hash not in recent 50 commits
- **Fix:** Considers you as "behind" and shows all recent commits

## 📦 Integration

Works seamlessly with:
- ✅ All DDT custom plugins
- ✅ Vencord core updater
- ✅ Theme Manager
- ✅ Token Manager
- ✅ Quest Automator

## 🎨 Future Enhancements

- [ ] Auto-extract ZIP (Node.js required)
- [ ] Auto-rebuild (trigger `pnpm build`)
- [ ] Auto-restart Discord
- [ ] GitHub authentication (higher rate limits)
- [ ] Delta updates (only changed files)
- [ ] Rollback to previous version
- [ ] Update changelog display in UI

## 💪 Powered By

- **GitHub REST API v3**
- **Vencord Plugin System**
- **Pure JavaScript - Zero Dependencies**

---

**Built with 💜 by DDT Team**
