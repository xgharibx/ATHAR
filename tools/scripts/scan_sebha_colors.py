"""Scan Sebha.tsx for inline color values"""
import re

with open("src/pages/Sebha.tsx", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines with hex colors or rgba in Sebha.tsx ===")
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if re.search(r"#[0-9a-fA-F]{3,8}|rgba\(", stripped):
        print(f"L{i}: {stripped[:100]}")
