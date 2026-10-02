# 🔄 DDT Account Switcher

**Fast, secure account switching for Discord using access tokens.**

---

## ✨ Features

- ✅ **One-Click Switching** - Instantly switch between accounts
- ✅ **Token Validation** - Validates tokens before saving
- ✅ **Encrypted Storage** - XOR encryption for token security
- ✅ **Modern UI** - Clean, intuitive interface
- ✅ **Avatar Display** - Shows account avatars
- ✅ **Nickname Support** - Add custom names to accounts
- ✅ **Hotkey Support** - Quick access via `Ctrl+Alt+S`
- ✅ **Console API** - Programmatic account management

---

## 🚀 Quick Start

### Open the Switcher

**Method 1: Keyboard Shortcut**
```
Ctrl + Alt + S
```

**Method 2: Console**
```javascript
AccountSwitcher.open()
```

### Add an Account

1. Press `Ctrl+Alt+S` or run `AccountSwitcher.open()`
2. Click **"+ Add Account"**
3. Paste your Discord token
4. (Optional) Add a nickname
5. Click **"Add Account"**

### Switch Accounts

1. Open the switcher
2. Click **"Switch"** on any account
3. Discord will reload with the new account

---

## 🎯 How to Get Your Discord Token

### Method 1: DevTools (Chrome/Discord Desktop)

1. Open Discord in browser or desktop app
2. Press `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (Mac)
3. Go to **Console** tab
4. Paste this code:
```javascript
(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()
```
5. Copy the token (without quotes)

### Method 2: Network Tab

1. Open Discord
2. Press `Ctrl+Shift+I` → **Network** tab
3. Filter by "api"
4. Click any Discord API request
5. Go to **Headers** → **Request Headers**
6. Find `authorization` field - that's your token

---

## 💻 Console API

```javascript
// Open switcher UI
AccountSwitcher.open()

// Add account programmatically
await AccountSwitcher.addAccount("YOUR_TOKEN_HERE", "Work Account")

// List all accounts
AccountSwitcher.listAccounts()

// Switch to account by ID
AccountSwitcher.switchTo("USER_ID")

// Show help
AccountSwitcher.help()
```

---

## 🔒 Security

### How Tokens Are Stored

- ✅ **XOR Encrypted** - Tokens are encrypted before storage
- ✅ **Local Storage Only** - Never leaves your machine
- ✅ **No Server Communication** - All operations are local

### Token Safety

⚠️ **NEVER share your Discord token with anyone!**
- Tokens provide **full account access**
- Can be used to send messages, join servers, etc.
- If compromised, **change your password immediately**

### Best Practices

1. **Use at your own risk** - Unofficial Discord feature
2. **Enable 2FA** on all accounts
3. **Don't use on shared computers**
4. **Regenerate tokens periodically** (change password)

---

## 🎨 UI Preview

### Main Switcher
```
┌─────────────────────────────────────────┐
│  DDT Account Switcher             [X]   │
├─────────────────────────────────────────┤
│  Saved Accounts (3)                     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👤 asrarkahnn#0 (Current)         │ │
│  │                        [Delete]    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👤 Work Account                   │ │
│  │ alt123#0           [Switch][Delete]│ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👤 Gaming Alt                     │ │
│  │ gamer#0            [Switch][Delete]│ │
│  └───────────────────────────────────┘ │
│                                         │
│  [+ Add Account]                        │
│                                         │
│  💡 Tip: Use Ctrl+Alt+S to quick open   │
└─────────────────────────────────────────┘
```

### Add Account Form
```
┌─────────────────────────────────────────┐
│  DDT Account Switcher             [X]   │
├─────────────────────────────────────────┤
│  Add New Account                        │
│                                         │
│  Enter your Discord access token to     │
│  add an account. Your token is          │
│  encrypted before storage.              │
│                                         │
│  Access Token                           │
│  [_________________________________]    │
│                                         │
│  Nickname (Optional)                    │
│  [_________________________________]    │
│                                         │
│  [Cancel]           [Add Account]       │
│                                         │
│  🔒 Your tokens are encrypted using     │
│  XOR encryption before storage.         │
└─────────────────────────────────────────┘
```

---

## ⚙️ Settings

### Hotkey Configuration

Default: `Ctrl+Alt+S`

To change, edit the plugin code:
```typescript
// In handleHotkey function
if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "s")
```

---

## 🐛 Troubleshooting

### "Invalid token" Error

**Causes:**
- Token expired (change password to get new token)
- Token format incorrect (should start with `mfa.` or `MT`)
- Network issue (can't reach Discord API)

**Fix:**
1. Get a fresh token using the guide above
2. Make sure you copied the full token
3. Try again

### Account Not Switching

**Causes:**
- Discord didn't reload properly
- Token was revoked

**Fix:**
1. Manually restart Discord
2. Check if token is still valid
3. Re-add the account with a fresh token

### "Failed to load accounts" Error

**Causes:**
- localStorage access issue
- Corrupted storage data

**Fix:**
```javascript
// Clear account storage
localStorage.removeItem("ddt_accounts")
// Restart Discord and re-add accounts
```

### Missing Avatars

**Causes:**
- Discord CDN slow to load
- Network issue

**Fix:**
- Wait a few seconds and reopen switcher
- Avatars load automatically when visible

---

## 🔧 Advanced Usage

### Bulk Import Accounts

```javascript
const tokens = [
    { token: "TOKEN_1", nickname: "Main" },
    { token: "TOKEN_2", nickname: "Alt 1" },
    { token: "TOKEN_3", nickname: "Alt 2" }
];

for (const acc of tokens) {
    await AccountSwitcher.addAccount(acc.token, acc.nickname);
}

console.log("✅ All accounts imported!");
```

### Export Accounts (Backup)

```javascript
const accounts = AccountSwitcher.listAccounts();
console.log(JSON.stringify(accounts, null, 2));
// Save this output somewhere safe (without tokens)
```

### Quick Switch by Name

```javascript
// Find account by username
const accounts = AccountSwitcher.listAccounts();
const target = accounts.find(a => a.username === "asrarkahnn");
if (target) AccountSwitcher.switchTo(target.id);
```

---

## ❓ FAQ

### Q: Is this against Discord ToS?
**A:** Using self-bots and token-based access is technically against Discord's Terms of Service. Use at your own risk.

### Q: Can my account get banned?
**A:** Possible but unlikely if used carefully. Don't spam or abuse automation features.

### Q: Do tokens expire?
**A:** Yes, tokens expire when you change your password or log out from all devices.

### Q: Can I use this on mobile?
**A:** No, this is a desktop Discord plugin only.

### Q: How many accounts can I add?
**A:** No limit, but performance may degrade with 50+ accounts.

### Q: Does this work with 2FA accounts?
**A:** Yes, tokens work regardless of 2FA status.

---

## 📝 Changelog

### v1.0.0 (2024-09-19)
- ✨ Initial release
- ✅ Token validation
- ✅ Encrypted storage
- ✅ Modern UI
- ✅ Hotkey support (Ctrl+Alt+S)
- ✅ Avatar display
- ✅ Nickname system
- ✅ Console API

---

## 🤝 Credits

**Created by:** DDT Team  
**Version:** 1.0.0  
**License:** GPL-3.0  

Part of **DDT Custom Client** - The ultimate Discord experience.

---

## ⚠️ Disclaimer

This plugin is provided "as is" without warranty of any kind. Use at your own risk. The developers are not responsible for:
- Account bans or suspensions
- Data loss
- Security breaches
- Any damages resulting from use

**Always keep your tokens secure and never share them!**

---

**Made with 💀 by DDT Team**
