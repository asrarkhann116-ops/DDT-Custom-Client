import os
import re

userplugins_dir = r'E:\asrar\projects\DDT_Production_Vencord_Like_Client\Vencord-main\Vencord-main\src\userplugins'

fixed_count = 0
for root, _, files in os.walk(userplugins_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            # Replace EquicordDevs, IllegalcordDevs, DDTDevs with Devs
            new_content = re.sub(r'\b(EquicordDevs|IllegalcordDevs|DDTDevs)\b', 'Devs', new_content)

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                fixed_count += 1

print(f"Fixed Devs references in {fixed_count} files.")
