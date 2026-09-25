# 🎨 DDT Theme Manager

**Choose from 112+ Professional Discord Themes**

---

## ✨ Features

- **112+ Premium Themes** - From minimal to cyberpunk, anime to professional
- **Default DDT Theme** - Custom purple-glow developer theme
- **Custom CSS Support** - Add your own styling
- **Zero Configuration** - Works out of the box
- **Instant Switching** - Change themes on the fly

---

## 🚀 Installation

### Method 1: Automatic (Recommended)
```bash
cd E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main
pnpm build
pnpm inject
```

### Method 2: Manual
1. Build project: `pnpm build`
2. Restart Discord
3. Go to **Settings** → **Vencord** → **Plugins**
4. Enable **DDTThemeManager**
5. Restart Discord again

---

## 🎯 How to Use

### Selecting a Theme

1. Open Discord **Settings**
2. Go to **Vencord** → **Plugins** → **DDTThemeManager**
3. Click **Select Theme** dropdown
4. Choose from 112+ themes:
   - **None (Default DDT)** - Custom purple-glow theme
   - **Tokyo Night** - Popular VSCode theme
   - **Clear Vision v7** - Highly customizable
   - **Cyberpunk 2077** - Futuristic style
   - **Material Discord** - Material design
   - **Nord** - Cool northern vibes
   - **Gruvbox Sharp** - Retro terminal look
   - **Spotify Discord** - Music-focused theme
   - And 100+ more!

### Adding Custom CSS

1. Open plugin settings
2. Scroll to **Custom CSS** field
3. Add your CSS:
```css
/* Example: Change accent color */
:root {
    --ddt-accent-primary: #ff0000 !important;
}

/* Example: Hide server list */
[class*="guilds"] {
    display: none;
}
```

---

## 📋 Available Theme Categories

### 🌙 **Dark Themes**
- Amoled Cord, Dark Matter, Dark Neon, Discord Night, Midnight, Nocturnal

### 🎨 **Colorful Themes**
- Amethyst, Cyan, Purple Onyx, Rosy Night, Wildberry, Spectra

### 💻 **Developer Themes**
- Tokyo Night, Nord, Gruvbox Sharp, Material Discord, Fallout 4 Terminal

### 🌸 **Anime Themes**
- Not Another Anime Theme, New Akame Ga Kill, New BNHA, New Rem Theme

### 🎵 **Music Themes**
- Spotify Discord, Spoti Cord

### 🎮 **Gaming Themes**
- Cyberpunk 2077, GGO Kirito, Opera GX

### ✨ **Minimalist Themes**
- Minimal Cord, Simplify, Sleek Cord, Quiet

### 🔮 **Futuristic Themes**
- Neobrutal, Synthesis, Ultra, Translucence

---

## 🔧 Troubleshooting

### Theme Not Loading?
1. **Restart Discord** after enabling plugin
2. Check console (Ctrl+Shift+I) for errors
3. Try switching to "None (Default DDT)" first
4. Re-select your desired theme

### Theme Looks Broken?
- Some themes require additional CSS imports
- Try enabling **Custom CSS** compatibility
- Some themes may conflict with other plugins

### Can't Find Plugin?
```powershell
# Verify plugin is in build
Select-String -Path ".\dist\renderer.js" -Pattern "DDTThemeManager"
# Should show at least 1 match

# Check settings file
Get-Content "$env:APPDATA\Vencord\settings\settings.json" | ConvertFrom-Json | Select-Object -ExpandProperty plugins | Select-Object -ExpandProperty DDTThemeManager
```

### Manual Enable
```powershell
$settings = Get-Content "$env:APPDATA\Vencord\settings\settings.json" | ConvertFrom-Json
$settings.plugins.DDTThemeManager.enabled = $true
$settings | ConvertTo-Json -Depth 100 | Set-Content "$env:APPDATA\Vencord\settings\settings.json"
```

---

## 🎨 Theme Showcase

### Default DDT Theme
- **Colors:** Purple (#a855f7) with glow effects
- **Style:** Developer-focused, code aesthetics
- **Features:** Custom scrollbars, hover effects, code font

### Tokyo Night
- **Colors:** Blue/Purple VSCode palette
- **Style:** Professional, clean
- **Features:** Syntax highlighting, monospace fonts

### Cyberpunk 2077
- **Colors:** Neon yellow/cyan
- **Style:** Futuristic, glowing
- **Features:** Blade Runner aesthetics

### Clear Vision v7
- **Colors:** Fully customizable
- **Style:** Transparent, modern
- **Features:** Background images, blur effects

---

## 📦 What's Included

```
developerTheme/
├── index.ts              # Main plugin file
├── themes/               # 112 theme CSS files
│   ├── aider.theme.css
│   ├── tokyo-night.theme.css
│   ├── cyberpunk2077.theme.css
│   └── ... (109 more)
└── README.md            # This file
```

---

## 💡 Pro Tips

1. **Try Before You Commit**
   - Switch themes instantly without restarting
   - Find your favorite before customizing

2. **Combine with Custom CSS**
   - Use a base theme + your tweaks
   - Example: Tokyo Night + custom accent color

3. **Backup Your Settings**
   - Export: `%APPDATA%\Vencord\settings\settings.json`
   - Restore if something breaks

4. **Performance**
   - Complex themes may slow Discord slightly
   - Disable if experiencing lag

5. **Theme Updates**
   - Themes load from GitHub (always latest)
   - No need to manually update

---

## 🐛 Known Issues

- **First load may take 2-3 seconds** (fetching from GitHub)
- **Some themes may not fully compatible** with latest Discord updates
- **Custom fonts may require** installation on your system
- **Background images** in themes may not load if URL is dead

---

## 🔄 Changelog

### v1.0.0 (Current)
- ✅ Initial release
- ✅ 112 themes integrated
- ✅ Custom CSS support
- ✅ Browser-compatible (no Node.js dependencies)
- ✅ Default DDT theme included
- ✅ Safe implementation (no crashes)

---

## 📝 Credits

**Themes:**
- Individual theme credits are in each `.theme.css` file
- Collected from BetterDiscord community
- All themes are free and open-source

**DDT Theme Manager:**
- Built for DDT Custom Client
- Based on Vencord plugin architecture

---

## 🆘 Support

**Issues?**
1. Check console logs: `Ctrl+Shift+I` → Console tab
2. Look for `[DDT Theme]` messages
3. Try default theme first
4. Rebuild and restart Discord

**Still broken?**
- Delete `developerTheme` folder
- Run `pnpm build`
- Reinstall plugin

---

## 🎯 Quick Commands

```powershell
# Build
cd E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main
pnpm build

# Restart Discord
taskkill /f /im Discord.exe
Start-Sleep 3
Start "$env:LOCALAPPDATA\Discord\Update.exe" "--processStart Discord.exe"

# Check if plugin loaded
# Open Discord Console (Ctrl+Shift+I)
Vencord.Plugins.plugins.DDTThemeManager
```

---

**Enjoy your custom Discord experience! 🎨✨**

**DDT Custom Client - Where Developers Design Their Tools** 🔥
