# DDT-Asar Performance Boost

This folder contains the pre-built DDT-Asar file used by the installer for optional performance enhancement.

## What is DDT-Asar?

DDT-Asar is a custom-branded fork of OpenAsar that provides:
- **2-4x faster Discord startup**
- **Custom DDT-branded splash screen**
- **99% smaller file size** (58 KB vs 9 MB original)
- **No tracking or telemetry**
- **Full compatibility with DDT Client injection**

## How it works

When you run `install.py` and choose to install DDT-Asar (optional):
1. The installer detects if DDT is already injected into Discord
2. If injected, it safely replaces Discord's `_app.asar` (not the injector stub)
3. Creates automatic backup (`_app.asar.backup`)
4. Your DDT plugins continue working perfectly

## File Info

- **File**: `app.asar`
- **Size**: ~58 KB
- **Version**: Based on OpenAsar (DDT-branded)
- **Source**: https://github.com/asrarkhann116-ops/DDT-Custom-Client

## Building from Source

If you want to build DDT-Asar yourself:

```bash
# Clone the OpenAsar-nightly repo (DDT fork)
git clone https://github.com/asrarkhann116-ops/OpenAsar-nightly.git

# Build
cd OpenAsar-nightly
.\build.bat

# The output will be: app.asar (~58 KB)
```

## License

Based on OpenAsar - MIT License
DDT Modifications © 2024

---

**Note**: This is completely optional. DDT Client works perfectly without it. DDT-Asar only provides a performance boost and custom branding.
