"""Scan multiple page files for inline color values"""
import re
import os

pages = [
    "src/pages/Qibla.tsx",
    "src/pages/NearbyMosques.tsx",
    "src/pages/Ruqyah.tsx",
    "src/pages/WuduGuide.tsx",
    "src/pages/SeerahTimeline.tsx",
    "src/pages/LibraryItem.tsx",
    "src/pages/Sources.tsx",
    "src/pages/CustomAdhkar.tsx",
]

for fp in pages:
    if not os.path.exists(fp):
        continue
    with open(fp, encoding="utf-8") as f:
        lines = f.readlines()
    hits = []
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if re.search(r"#[0-9a-fA-F]{3,8}", stripped) or re.search(r"rgba\(\s*(?!0,\s*0,\s*0)", stripped):
            hits.append(f"  L{i}: {stripped[:95]}")
    if hits:
        print(f"\n=== {fp} ({len(hits)} hits) ===")
        for h in hits:
            print(h)
    else:
        print(f"{fp}: CLEAN")
