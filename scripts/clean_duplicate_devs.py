import os
import re

userplugins_dir = r"E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main\src\userplugins"

cleaned_count = 0
for root, _, files in os.walk(userplugins_dir):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()

            # Clean duplicate Devs, Devs in imports
            new_content = re.sub(r'import\s+\{\s*Devs\s*,\s*Devs\s*\}', 'import { Devs }', content)
            new_content = re.sub(r',\s*Devs\b(?=.*from\s+[\'"]@utils/constants[\'"])', '', new_content)

            if new_content != content:
                with open(path, "w", encoding="utf-8") as file:
                    file.write(new_content)
                cleaned_count += 1

print(f"Cleaned duplicate imports in {cleaned_count} files.")
