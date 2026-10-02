import os
import shutil
import re

# Paths
source_equi = r"E:\asrar\projects\equicordplugins"
source_illegal = r"E:\asrar\projects\illegalcordplugins"
dest_userplugins = r"E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main\src\userplugins"

# Branding replacements
# Using a list of tuples for (pattern, replacement)
replacements = [
    (re.compile(re.escape("Equicord"), re.IGNORECASE), "DDT"),
    (re.compile(re.escape("Illegalcord"), re.IGNORECASE), "DDT"),
    (re.compile(re.escape("Equibop"), re.IGNORECASE), "DDT"),
    (re.compile(re.escape("Nightcord"), re.IGNORECASE), "DDT")
]

def copy_and_rebrand(source_dir):
    try:
        items = os.listdir(source_dir)
    except Exception as e:
        print(f"Error reading {source_dir}: {e}")
        return

    count = 0
    for item in items:
        # skip hidden/system files
        if item.startswith('_') or item.startswith('.'):
            continue
            
        src_path = os.path.join(source_dir, item)
        dest_path = os.path.join(dest_userplugins, item)
        
        # We only want plugin directories
        if not os.path.isdir(src_path):
            continue
            
        # Copy directory tree
        if os.path.exists(dest_path):
            print(f"[{item}] Already exists in userplugins, skipping copy...")
        else:
            shutil.copytree(src_path, dest_path)
            
        # Rebrand files inside
        rebrand_directory(dest_path)
        count += 1
        
    print(f"Successfully migrated and rebranded {count} plugins from {source_dir}")

def rebrand_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            # Only process source code files
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss')):
                file_path = os.path.join(root, file)
                rebrand_file(file_path)

def rebrand_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return # might be binary or weird encoding, skip

    new_content = content
    for pattern, replacement in replacements:
        new_content = pattern.sub(replacement, new_content)

    if new_content != content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
        except Exception as e:
            print(f"Error writing to {filepath}: {e}")

if __name__ == "__main__":
    print("Starting Equicord migration...")
    copy_and_rebrand(source_equi)
    
    print("\nStarting Illegalcord migration...")
    copy_and_rebrand(source_illegal)
    
    print("\nAll operations completed successfully! Welcome to the DDT Empire.")
