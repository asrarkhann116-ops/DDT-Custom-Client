#!/usr/bin/env python3
"""
DDT Smart Deploy Script
Automatically finds the latest Discord app version folder and deploys dist/ to it.
Usage: python deploy.py
"""

import os
import sys
import shutil
from pathlib import Path

DISCORD_BASE = Path(os.environ.get("LOCALAPPDATA", "")) / "Discord"
SCRIPT_DIR = Path(__file__).parent
DIST_DIR = SCRIPT_DIR / "dist"


def find_latest_discord_version(base: Path):
    """Find the highest app-1.0.XXXX folder in Discord install dir."""
    candidates = [
        d for d in base.iterdir()
        if d.is_dir() and d.name.startswith("app-1.0.")
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda p: int(p.name.split(".")[-1]))
    return candidates[-1]


def ensure_resources_structure(version_dir: Path) -> Path:
    dist_dest = version_dir / "resources" / "app" / "dist"
    dist_dest.mkdir(parents=True, exist_ok=True)
    return dist_dest


def patch_if_needed(version_dir: Path):
    """
    If this Discord version is NOT patched yet (fresh update),
    copy app.asar from a previously patched version so Discord loads our client.
    """
    resources = version_dir / "resources"
    app_asar = resources / "app.asar"
    patched_marker = resources / "app"

    if patched_marker.exists():
        return  # Already patched

    base = version_dir.parent
    siblings = sorted(
        [d for d in base.iterdir() if d.is_dir() and d.name.startswith("app-1.0.")],
        key=lambda p: int(p.name.split(".")[-1]),
        reverse=True
    )

    src_asar = None
    for sibling in siblings:
        candidate = sibling / "resources" / "_app.asar"
        if candidate.exists():
            src_asar = candidate
            print(f"[INFO] Found vanilla app.asar in {sibling.name}")
            break

    if src_asar is None:
        print("[WARN] Could not find a vanilla app.asar from any previous version.")
        print("[WARN] Run `pnpm run inject` manually once to patch Discord.")
        return

    shutil.copy2(src_asar, app_asar)
    print(f"[OK]   Copied vanilla app.asar to {resources}")


def main():
    print("=" * 55)
    print("  DDT Smart Deploy")
    print("=" * 55)

    if not DIST_DIR.exists():
        print(f"[ERROR] dist/ folder not found at {DIST_DIR}")
        print("[ERROR] Run `pnpm run build` first.")
        sys.exit(1)

    if not DISCORD_BASE.exists():
        print(f"[ERROR] Discord install not found at {DISCORD_BASE}")
        sys.exit(1)

    latest = find_latest_discord_version(DISCORD_BASE)
    if latest is None:
        print(f"[ERROR] No Discord app-1.0.XXXX folder found in {DISCORD_BASE}")
        sys.exit(1)

    print(f"[INFO] Latest Discord version: {latest.name}")

    patch_if_needed(latest)

    dist_dest = ensure_resources_structure(latest)

    print(f"[INFO] Deploying dist/ -> {dist_dest}")
    for item in DIST_DIR.iterdir():
        dest = dist_dest / item.name
        if item.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    print(f"[OK]   Deploy complete -> {latest.name}")
    print()
    print("  Restart Discord to apply changes.")
    print("=" * 55)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[WARN] Cancelled.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
