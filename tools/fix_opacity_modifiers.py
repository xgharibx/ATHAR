"""
Phase 5 fix: Replace broken Tailwind opacity modifiers on CSS variables.

Tailwind v3 generates `rgb(var(--accent) / 0.1)` for `bg-[var(--accent)]/10`,
which is INVALID CSS because --accent is a hex value, not R G B triplets.
None of these classes produce any visual effect.

Fix:
1. Append @layer utilities with color-mix() equivalents to globals.css
2. Regex-replace all `[var(--X)]/N` patterns in TSX/TS files → `X-N`
"""

import re
import os
import glob

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar"

# ─── 1. Build the @layer utilities block ─────────────────────────────────────

# Colors and their CSS variable names
COLORS = ["accent", "ok", "danger"]

# All opacity values actually used (union from grep audit + extras)
OPACITIES = [5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80]

def cm(var, pct):
    """color-mix helper"""
    return f"color-mix(in srgb, var(--{var}) {pct}%, transparent)"

lines = []
lines.append("")
lines.append("/* ═══════════════════════════════════════════════════════════════")
lines.append("   Phase 5 — color-mix() opacity utilities for design system colors")
lines.append("   Replaces broken Tailwind opacity modifiers on CSS custom props.")
lines.append("   Usage: bg-accent-15, border-ok-30, text-danger-60, ring-accent-40")
lines.append("   ═══════════════════════════════════════════════════════════════ */")
lines.append("@layer utilities {")

for color in COLORS:
    lines.append(f"  /* {color} backgrounds */")
    for pct in OPACITIES:
        lines.append(f"  .bg-{color}-{pct} {{ background-color: {cm(color, pct)}; }}")
    lines.append("")

for color in COLORS:
    lines.append(f"  /* {color} borders */")
    for pct in OPACITIES:
        lines.append(f"  .border-{color}-{pct} {{ border-color: {cm(color, pct)}; }}")
    lines.append("")

for color in COLORS:
    lines.append(f"  /* {color} text */")
    for pct in OPACITIES:
        lines.append(f"  .text-{color}-{pct} {{ color: {cm(color, pct)}; }}")
    lines.append("")

for color in COLORS:
    lines.append(f"  /* {color} rings */")
    for pct in OPACITIES:
        lines.append(f"  .ring-{color}-{pct} {{ --tw-ring-color: {cm(color, pct)}; }}")
    lines.append("")

lines.append("}")
utilities_block = "\n".join(lines)

# ─── 2. Append to globals.css ─────────────────────────────────────────────────

css_path = os.path.join(ROOT, "src", "styles", "globals.css")
with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

# Only append if not already done
if "Phase 5" not in css_content:
    css_content += utilities_block + "\n"
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print(f"✅ Appended @layer utilities to globals.css ({len(lines)} lines)")
else:
    print("⚠️  globals.css already has Phase 5 block — skipping append")

# ─── 3. Regex-replace in all TSX/TS source files ──────────────────────────────

# Pattern: [var(--X)]/N  →  X-N
# The Tailwind prefix (bg-, border-, text-, ring-, hover:bg-, focus:border-, etc.)
# is already in the text before [var(--...], so we only need to replace the
# [var(--X)]/N part.
PATTERN = re.compile(r'\[var\(--([a-z0-9_-]+)\)\]\/(\d+)')

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = PATTERN.sub(r'\1-\2', content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        count = len(PATTERN.findall(content))
        print(f"  ✅ {os.path.basename(filepath)}: {count} replacement(s)")
        return count
    return 0

tsx_files = glob.glob(os.path.join(ROOT, "src", "**", "*.tsx"), recursive=True)
ts_files = glob.glob(os.path.join(ROOT, "src", "**", "*.ts"), recursive=True)
all_files = tsx_files + ts_files

print(f"\n🔍 Scanning {len(all_files)} source files...")
total = 0
for f in sorted(all_files):
    total += fix_file(f)

print(f"\n✅ Done. {total} total replacements across {len(all_files)} files.")
