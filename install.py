#!/usr/bin/env python3
"""
DDT Custom Discord Client - Automated Installer
Zero dependencies, pure Python installer
"""

import os
import sys
import subprocess
import urllib.request
import shutil
import time
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    print("\n" + "=" * 60)
    print("  DDT CUSTOM DISCORD CLIENT INSTALLER")
    print("=" * 60 + "\n")

def print_status(msg, status="INFO"):
    colors = {
        "OK": Colors.GREEN,
        "WARN": Colors.YELLOW,
        "ERROR": Colors.RED,
        "INFO": Colors.BLUE
    }
    color = colors.get(status, Colors.BLUE)
    print(f"{color}[{status}]{Colors.RESET} {msg}")

def check_command(cmd):
    """Check if a command exists"""
    try:
        subprocess.run([cmd, "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def run_command(cmd, cwd=None, show_output=False):
    """Run a shell command"""
    try:
        if show_output:
            result = subprocess.run(cmd, cwd=cwd, shell=True, check=True)
        else:
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=True
            )
        return True, result
    except subprocess.CalledProcessError as e:
        return False, e

def download_file(url, dest):
    """Download a file with progress"""
    print_status(f"Downloading from {url}", "INFO")
    try:
        urllib.request.urlretrieve(url, dest)
        return True
    except Exception as e:
        print_status(f"Download failed: {e}", "ERROR")
        return False

def check_node():
    """Check and install Node.js"""
    print_status("Checking Node.js installation", "INFO")
    
    if check_command("node"):
        # Check Node.js version
        try:
            result = subprocess.run(
                ["node", "--version"], 
                capture_output=True, 
                text=True
            )
            version = result.stdout.strip()
            
            # Extract major version (e.g., v22.23.1 -> 22)
            major_version = int(version.strip('v').split('.')[0])
            
            if major_version >= 22:
                print_status(f"Node.js {version} detected (OK)", "OK")
                return True
            else:
                print_status(f"Node.js {version} detected (TOO OLD!)", "WARN")
                print_status("DDT requires Node.js v22 or higher", "ERROR")
                print_status("", "INFO")
                print_status("Please update Node.js:", "INFO")
                print_status("Download v22.23.1 (Latest LTS):", "INFO")
                print_status("https://nodejs.org/dist/v22.23.1/node-v22.23.1-x64.msi", "INFO")
                print_status("", "INFO")
                
                response = input("Open download page? (y/n): ").strip().lower()
                if response == 'y':
                    import webbrowser
                    webbrowser.open("https://nodejs.org/dist/v22.23.1/node-v22.23.1-x64.msi")
                
                print_status("After updating, restart terminal and re-run installer", "ERROR")
                return False
                
        except Exception as e:
            print_status(f"Failed to check Node.js version: {e}", "ERROR")
            return False
    
    print_status("Node.js not found", "ERROR")
    print_status("", "INFO")
    print_status("Please install Node.js v22.23.1 (Latest LTS):", "INFO")
    print_status("Download: https://nodejs.org/dist/v22.23.1/node-v22.23.1-x64.msi", "INFO")
    print_status("", "INFO")
    
    response = input("Open download page? (y/n): ").strip().lower()
    if response == 'y':
        import webbrowser
        webbrowser.open("https://nodejs.org/dist/v22.23.1/node-v22.23.1-x64.msi")
    
    print_status("After installation, restart terminal and re-run installer", "ERROR")
    return False

def check_pnpm():
    """Check and install pnpm"""
    print_status("Checking pnpm installation", "INFO")
    
    if check_command("pnpm"):
        # Check version
        result = subprocess.run(
            ["pnpm", "--version"], 
            capture_output=True, 
            text=True
        )
        version = result.stdout.strip()
        print_status(f"pnpm found (version {version})", "OK")
        
        if version != "11.9.0":
            print_status(f"Required version: 11.9.0", "WARN")
            print_status("Reinstalling correct version", "INFO")
            
            # Uninstall old version
            run_command("npm uninstall -g pnpm")
            time.sleep(2)
            
            # Install correct version
            success, _ = run_command("npm install -g pnpm@11.9.0")
            if not success:
                print_status("Failed to install pnpm", "ERROR")
                return False
            
            print_status("pnpm v11.9.0 installed successfully", "OK")
        
        return True
    
    print_status("pnpm not found. Installing automatically", "WARN")
    print_status("Installing pnpm v11.9.0", "INFO")
    
    success, _ = run_command("npm install -g pnpm@11.9.0")
    if not success:
        print_status("Failed to install pnpm", "ERROR")
        return False
    
    print_status("pnpm v11.9.0 installed successfully", "OK")
    return True

def install_dependencies():
    """Install project dependencies (main pnpm)"""
    print_status("Installing dependencies (this may take 2-3 minutes)", "INFO")
    
    success, result = run_command("pnpm install", show_output=True)
    if not success:
        print_status("Failed to install dependencies", "ERROR")
        print_status("Try running: pnpm install manually", "INFO")
        return False
    
    print_status("Dependencies installed", "OK")
    return True

def install_relay_server_deps():
    """Install music-relay-server Node.js dependencies (express, cors, etc.)"""
    print_status("Checking music-relay-server dependencies", "INFO")

    # Locate the relay server directory relative to this script
    script_dir = Path(__file__).parent
    relay_dir = script_dir / "src" / "userplugins" / "musicVisualizer" / "music-relay-server"

    if not relay_dir.exists():
        print_status(f"music-relay-server directory not found at: {relay_dir}", "WARN")
        print_status("Skipping relay server dependency install", "WARN")
        return True  # Non-fatal, continue installer

    relay_package = relay_dir / "package.json"
    if not relay_package.exists():
        print_status("No package.json in music-relay-server, skipping", "WARN")
        return True

    # Check if node_modules already has express (quick sanity check)
    express_check = relay_dir / "node_modules" / "express"
    if express_check.exists():
        print_status("music-relay-server modules already installed", "OK")
        return True

    print_status("Installing music-relay-server dependencies (express, cors...)", "INFO")
    success, result = run_command("npm install", cwd=str(relay_dir), show_output=True)
    if not success:
        print_status("Failed to install relay server dependencies", "ERROR")
        print_status(f"Manual fix: cd {relay_dir} && npm install", "INFO")
        return False

    # Verify express is now present
    if not express_check.exists():
        print_status("npm install ran but express still missing — check npm logs", "ERROR")
        return False

    print_status("music-relay-server dependencies installed (express, cors ready)", "OK")
    return True

def build_project():
    """Build DDT Client"""
    print_status("Building DDT Client (this may take 30-60 seconds)", "INFO")
    
    success, result = run_command("pnpm run build", show_output=True)
    if not success:
        print_status("Build failed", "ERROR")
        return False
    
    print_status("Build completed", "OK")
    return True

def kill_discord_processes():
    """Force kill all Discord processes so app.asar is not locked during inject."""
    print_status("Closing Discord processes (required for injection)...", "INFO")

    # All known Discord-related process names
    discord_procs = [
        "Discord.exe",
        "DiscordPTB.exe",
        "DiscordCanary.exe",
        "Update.exe",       # Squirrel updater — the main culprit for file locks
    ]

    killed_any = False
    for proc in discord_procs:
        result = subprocess.run(
            ["taskkill", "/F", "/IM", proc],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print_status(f"Killed: {proc}", "OK")
            killed_any = True

    if killed_any:
        # Give OS time to release file handles
        time.sleep(2)
        print_status("All Discord processes closed", "OK")
    else:
        print_status("No Discord processes were running", "INFO")

def inject_discord():
    """Inject into Discord"""
    # Kill Discord first — Squirrel Update.exe locks app.asar even after Discord closes
    kill_discord_processes()

    print_status("Injecting into Discord", "INFO")
    print_status("You will be prompted to select your Discord version", "INFO")
    print()
    
    success, result = run_command("pnpm run inject", show_output=True)
    if not success:
        print_status("Injection failed", "ERROR")
        return False
    
    print_status("Injection completed", "OK")
    return True

def install_ddt_asar():
    """Install DDT-Asar performance boost"""
    print()
    print(f"{Colors.BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}  DDT-ASAR PERFORMANCE BOOST{Colors.RESET}")
    print(f"{Colors.BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}")
    print()
    print(f"{Colors.GREEN}✓{Colors.RESET} 2-4x faster Discord startup")
    print(f"{Colors.GREEN}✓{Colors.RESET} Custom DDT-branded splash screen")
    print(f"{Colors.GREEN}✓{Colors.RESET} 99% smaller than original (58 KB vs 9 MB)")
    print(f"{Colors.GREEN}✓{Colors.RESET} No tracking or telemetry")
    print()
    
    response = input(f"{Colors.YELLOW}Install DDT-Asar? (y/n):{Colors.RESET} ").strip().lower()
    
    if response != 'y':
        print_status("Skipping DDT-Asar installation", "INFO")
        return True
    
    print()
    print_status("Installing DDT-Asar...", "INFO")
    
    # Try multiple locations for DDT-Asar
    possible_paths = [
        # 1. Inside DDT repo (recommended for distribution)
        Path(__file__).parent / 'ddt-asar' / 'app.asar',
        # 2. Sibling directory (for development)
        Path(__file__).parent.parent / 'OpenAsar-nightly' / 'app.asar',
        # 3. Parent project directory (legacy)
        Path(__file__).parent.parent.parent.parent / 'OpenAsar-nightly' / 'app.asar',
    ]
    
    ddt_asar_path = None
    for path in possible_paths:
        if path.exists():
            ddt_asar_path = path
            print_status(f"Found DDT-Asar at: {path.parent.name}", "OK")
            break
    
    if not ddt_asar_path:
        print_status("DDT-Asar not found in any location!", "ERROR")
        print_status("Download from: https://github.com/asrarkhann116-ops/DDT-Custom-Client/releases", "INFO")
        print_status("Extract to: ddt-asar/app.asar in DDT directory", "INFO")
        print_status("Continuing without performance boost", "WARN")
        return True  # Non-fatal
    
    # Find Discord installation
    print_status("Searching for Discord installations...", "INFO")
    
    base_paths = [
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Discord',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'DiscordPTB',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'DiscordCanary',
    ]
    
    discord_resources = None
    for base in base_paths:
        if base.exists():
            app_folders = sorted(base.glob('app-*'), key=lambda p: p.name)
            if app_folders:
                latest = app_folders[-1]
                resources = latest / 'resources'
                if (resources / 'app.asar').exists():
                    discord_resources = resources
                    print_status(f"Found Discord: {base.name} ({latest.name})", "OK")
                    break
    
    if not discord_resources:
        print_status("Could not find Discord installation", "ERROR")
        print_status("Install DDT-Asar manually later if needed", "WARN")
        return True  # Non-fatal
    
    # Check if Vencord/DDT is injected (it renames app.asar -> _app.asar)
    original_asar = discord_resources / '_app.asar'
    injector_stub = discord_resources / 'app.asar'
    
    if not original_asar.exists():
        # No injection yet, use regular app.asar
        original_asar = injector_stub
    else:
        print_status("Detected DDT injection - targeting _app.asar", "INFO")
    
    # Backup original
    backup = discord_resources / '_app.asar.backup'
    
    if not backup.exists() and original_asar.exists():
        try:
            print_status("Backing up original Discord asar...", "INFO")
            shutil.copy2(original_asar, backup)
            print_status("Backup created", "OK")
        except Exception as e:
            print_status(f"Backup failed: {e}", "ERROR")
            return True  # Non-fatal, but don't proceed
    
    # Install DDT-Asar
    try:
        shutil.copy2(ddt_asar_path, original_asar)
        size_kb = ddt_asar_path.stat().st_size / 1024
        print_status(f"DDT-Asar installed! ({size_kb:.1f} KB)", "OK")
        print()
        print(f"{Colors.GREEN}{Colors.BOLD}🚀 Performance boost activated! Expect 2-4x faster startup!{Colors.RESET}")
        print()
        return True
    except Exception as e:
        print_status(f"Installation failed: {e}", "ERROR")
        print_status("DDT Client will work without it", "WARN")
        return True  # Non-fatal


def main():
    """Main installation flow"""
    print_banner()
    
    # Check if we're in the right directory
    if not Path("package.json").exists():
        print_status("package.json not found!", "ERROR")
        print_status(f"Current directory: {os.getcwd()}", "ERROR")
        print_status("Please run this script from the DDT Client root directory", "INFO")
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    print_status(f"Working directory: {os.getcwd()}", "INFO")
    print_status("Found package.json", "OK")
    print()
    
    # Step 1: Check Node.js
    print(f"{Colors.BOLD}[1/5] Checking Node.js{Colors.RESET}")
    if not check_node():
        input("\nPress Enter to exit...")
        sys.exit(1)
    print()
    
    # Step 2: Check pnpm
    print(f"{Colors.BOLD}[2/5] Checking pnpm{Colors.RESET}")
    if not check_pnpm():
        input("\nPress Enter to exit...")
        sys.exit(1)
    print()
    
    # Step 3: Install main dependencies
    print(f"{Colors.BOLD}[3/5] Installing dependencies{Colors.RESET}")
    if not install_dependencies():
        input("\nPress Enter to exit...")
        sys.exit(1)
    print()

    # Step 4: Install relay server dependencies (express, cors, etc.)
    print(f"{Colors.BOLD}[4/5] Installing music-relay-server dependencies{Colors.RESET}")
    if not install_relay_server_deps():
        input("\nPress Enter to exit...")
        sys.exit(1)
    print()
    
    # Step 5: Build and inject
    print(f"{Colors.BOLD}[5/5] Building and injecting{Colors.RESET}")
    if not build_project():
        input("\nPress Enter to exit...")
        sys.exit(1)
    print()
    
    # Inject into Discord
    if not inject_discord():
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    # Optional: Install DDT-Asar performance boost
    install_ddt_asar()
    
    # Success
    print("\n" + "=" * 60)
    print("  INSTALLATION COMPLETE!")
    print("=" * 60 + "\n")
    
    print(f"{Colors.GREEN}[SUCCESS]{Colors.RESET} DDT Custom Client is now installed\n")
    
    print("NEXT STEPS:")
    print("1. Close Discord completely (check system tray)")
    print("2. Restart Discord")
    print("3. Open DevTools (Ctrl+Shift+I) to verify\n")
    
    print("VERIFY INSTALLATION:")
    print(f"{Colors.CYAN}Console:{Colors.RESET}")
    print("  • Look for DDT ASCII art logo on startup")
    print("  • Check for [DDT] prefix in logs")
    print("  • Type: Vencord (should show DDT build info)")
    print()
    print(f"{Colors.CYAN}Settings:{Colors.RESET}")
    print("  • User Settings -> DDT Plugins")
    print("  • User Settings -> DDT Updater")
    print()
    print(f"{Colors.CYAN}Privacy Check:{Colors.RESET}")
    print("  • Console should show CSP errors for 'sentry-ipc://'")
    print("  • This is GOOD - means Sentry tracking is blocked")
    print("  • Message: 'Sentry successfully disabled' = Privacy working\n")
    
    print("=" * 60)
    print("  Thank you for using DDT!")
    print("=" * 60 + "\n")
    
    input("Press Enter to exit...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}[WARN]{Colors.RESET} Installation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}[ERROR]{Colors.RESET} Unexpected error: {e}")
        input("\nPress Enter to exit...")
        sys.exit(1)
