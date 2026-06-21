import os
import glob

src_dir = r"c:\Users\user\Downloads\NANTIDIHAPUS\AutomationEDA\frontend\src"

files = glob.glob(os.path.join(src_dir, "**", "*.ts"), recursive=True)
files.extend(glob.glob(os.path.join(src_dir, "**", "*.tsx"), recursive=True))

count = 0
for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "http://localhost:8000" in content:
            new_content = content.replace("http://localhost:8000", "https://yandraa-my-fastapi-backend.hf.space")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

print(f"Total files updated: {count}")
