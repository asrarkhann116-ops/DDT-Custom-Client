import os
import json

base_dir = r'E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main'

# Create stub files for missing internal Vencord APIs
stubs = {
    "src/components/Notice.tsx": "export const Notice = (props: any) => null;",
    "src/api/AudioPlayer.ts": "export const playAudio = () => {};\nexport const createAudioPlayer = () => {};\nexport const defaultAudioNames = {};\nexport interface AudioPlayerInterface {}",
    "src/api/HeaderBar.ts": "export const HeaderBarButton = (props: any) => null;\nexport const ChannelToolbarButton = (props: any) => null;",
    "src/api/SurfaceClasses.ts": "export const SurfaceId = {};\nexport interface SurfaceProvidedProps {}",
    "src/api/UserArea.ts": "export const UserAreaButton = (props: any) => null;\nexport interface UserAreaRenderProps {}",
    "src/userplugins/_core/concatenatedModules.ts": "export const iconsModule = {};",
    "src/userplugins/_kamidereCompat/branding.ts": "export const BRAND_NAME = 'DDT';\nexport const BRAND_ICON_DATA_URL = '';",
    "src/userplugins/_kamidereCompat/runtimeActivity.ts": "export const runtimeActivity = {};",
    "src/userplugins/_legalWarnings.ts": "export const MessageLoggerLegalWarning = (props: any) => null;",
}

for path, content in stubs.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

# We also need to add @song-spotlight path mapping to tsconfig
tsconfig_path = os.path.join(base_dir, "tsconfig.json")
with open(tsconfig_path, "r", encoding="utf-8") as f:
    ts_content = f.read()

try:
    ts_data = json.loads(ts_content)
    ts_data["compilerOptions"]["paths"]["@song-spotlight/*"] = ["./src/userplugins/songSpotlight.desktop/*"]
    ts_data["compilerOptions"]["paths"]["@userplugins/*"] = ["./src/userplugins/*"]
    
    with open(tsconfig_path, "w", encoding="utf-8") as f:
        json.dump(ts_data, f, indent=4)
except Exception as e:
    # If JSON parsing fails (due to comments in tsconfig), we can regex replace
    print("JSON parsing failed, trying manual replace")
    if '"@userplugins/*": ["./src/userplugins/*"],' in ts_content:
        new_ts = ts_content.replace(
            '"@userplugins/*": ["./src/userplugins/*"],',
            '"@userplugins/*": ["./src/userplugins/*"],\n            "@song-spotlight/*": ["./src/userplugins/songSpotlight.desktop/*"],'
        )
        with open(tsconfig_path, "w", encoding="utf-8") as f:
            f.write(new_ts)

print("Stubs created and tsconfig updated.")
