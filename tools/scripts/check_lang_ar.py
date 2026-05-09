"""Check lang='ar' usage across TSX files"""
import re
import os

total_lang = 0
total_files = 0
for root, dirs, files in os.walk("src"):
    for f in files:
        if f.endswith(".tsx"):
            fp = os.path.join(root, f)
            with open(fp, encoding="utf-8") as fh:
                content = fh.read()
            count = len(re.findall(r"lang=[\"']ar[\"']", content))
            if count > 0:
                total_files += 1
                total_lang += count
                print(f"{fp}: {count} lang=ar")

print(f"\nTotal: {total_lang} lang=ar across {total_files} files")
