"""
Phase 15: Fix white text/overlay colors on var(--accent) backgrounds.
All accent colors (gold, amber, rose, sky blue, emerald…) are bright/saturated,
so dark text (--on-accent: #07080b) gives far better contrast than white.
"""

import re

DARK_FULL = "var(--on-accent)"
DARK_90   = "rgba(7,8,11,0.9)"
DARK_80   = "rgba(7,8,11,0.8)"
DARK_70   = "rgba(7,8,11,0.7)"
DARK_60   = "rgba(7,8,11,0.6)"
DARK_50   = "rgba(7,8,11,0.5)"
DARK_40   = "rgba(7,8,11,0.4)"
DARK_30   = "rgba(7,8,11,0.3)"
DARK_20   = "rgba(7,8,11,0.2)"
DARK_15   = "rgba(7,8,11,0.15)"
DARK_12   = "rgba(7,8,11,0.12)"

changes = {
    # ── AsmaAlHusna.tsx ──────────────────────────────────────────────────────
    "src/pages/AsmaAlHusna.tsx": [
        # Active tab color (background: tab active = #f59e0b)
        ('color: tab === t ? "#fff" : "var(--fg)"',
         'color: tab === t ? "var(--on-accent)" : "var(--fg)"'),
        # Expanded card container text color
        ('color: isExpanded ? "#fff" : "var(--fg)"',
         'color: isExpanded ? "var(--on-accent)" : "var(--fg)"'),
        # Index number opacity variant
        ('style={{ color: isExpanded ? "rgba(255,255,255,0.8)" : "var(--fg)" }}',
         'style={{ color: isExpanded ? "rgba(7,8,11,0.55)" : "var(--fg)" }}'),
        # Action-row share/brain button icon opacity variant (0.6)
        ('style={{ color: isExpanded ? "rgba(255,255,255,0.6)" : "var(--fg)", opacity: 0.5 }}',
         'style={{ color: isExpanded ? "rgba(7,8,11,0.5)" : "var(--fg)", opacity: 0.5 }}'),
        # Brain button
        ('style={{ color: isMem ? (isExpanded ? "#fff" : "var(--accent)") : (isExpanded ? "rgba(255,255,255,0.5)" : "var(--fg)"), opacity: isMem ? 1 : 0.4 }}',
         'style={{ color: isMem ? (isExpanded ? "var(--on-accent)" : "var(--accent)") : (isExpanded ? "rgba(7,8,11,0.4)" : "var(--fg)"), opacity: isMem ? 1 : 0.4 }}'),
        # Heart button
        ('style={{ color: isFav ? "#ef4444" : (isExpanded ? "rgba(255,255,255,0.5)" : "var(--fg)"), opacity: isFav ? 1 : 0.4 }}',
         'style={{ color: isFav ? "#ef4444" : (isExpanded ? "rgba(7,8,11,0.4)" : "var(--fg)"), opacity: isFav ? 1 : 0.4 }}'),
    ],

    # ── Duas.tsx ─────────────────────────────────────────────────────────────
    # L198: badge on var(--accent)
    "src/pages/Duas.tsx": [
        ('style={{ background: "var(--accent)", color: "#fff", opacity: 0.85 }}',
         'style={{ background: "var(--accent)", color: "var(--on-accent)", opacity: 0.85 }}'),
    ],

    # ── Favorites.tsx ─────────────────────────────────────────────────────────
    "src/pages/Favorites.tsx": [
        ('style={{ background: "var(--accent)", color: "#fff" }}',
         'style={{ background: "var(--accent)", color: "var(--on-accent)" }}'),
    ],

    # ── ProphetStories.tsx ────────────────────────────────────────────────────
    "src/pages/ProphetStories.tsx": [
        ('style={{ background: "var(--accent)", color: "#fff" }}',
         'style={{ background: "var(--accent)", color: "var(--on-accent)" }}'),
    ],

    # ── QuranVocab.tsx ───────────────────────────────────────────────────────
    "src/pages/QuranVocab.tsx": [
        # Flashcard flipped state (text)
        ('color: flipped ? "#fff" : "var(--fg)"',
         'color: flipped ? "var(--on-accent)" : "var(--fg)"'),
        # Divider line inside flipped card
        ('style={{ background: "#fff" }}',
         'style={{ background: "rgba(7,8,11,0.25)" }}'),
        # Navigation buttons with accent bg
        ('style={{ background: "var(--accent)", color: "#fff" }}',
         'style={{ background: "var(--accent)", color: "var(--on-accent)" }}'),
    ],

    # ── WuduGuide.tsx ─────────────────────────────────────────────────────────
    "src/pages/WuduGuide.tsx": [
        ('style={{ background: "var(--accent)", color: "#fff" }}',
         'style={{ background: "var(--accent)", color: "var(--on-accent)" }}'),
    ],

    # ── PrayerGuide.tsx ───────────────────────────────────────────────────────
    "src/pages/PrayerGuide.tsx": [
        # Container: closed=fg, open=on-accent
        ('color: isOpen ? "#fff" : "var(--fg)"',
         'color: isOpen ? "var(--on-accent)" : "var(--fg)"'),
        # Step-ID badge — BUG: both were "#fff"; closed state bg is also accent
        ('background: isOpen ? "rgba(255,255,255,0.3)" : "var(--accent)",\n                        color: isOpen ? "#fff" : "#fff"',
         'background: isOpen ? "rgba(7,8,11,0.12)" : "var(--accent)",\n                        color: "var(--on-accent)"'),
        # Chevron-up inside open state
        ('style={{ color: isOpen ? "rgba(255,255,255,0.8)" : "var(--accent)" }}',
         'style={{ color: isOpen ? "rgba(7,8,11,0.55)" : "var(--accent)" }}'),
        # h-px divider line inside expanded content
        ('style={{ background: "rgba(255,255,255,0.25)" }}',
         'style={{ background: "rgba(7,8,11,0.18)" }}'),
        # Arabic text inside expanded content
        ('style={{ fontFamily: "var(--font-arabic, inherit)", color: "rgba(255,255,255,0.95)" }}',
         'style={{ fontFamily: "var(--font-arabic, inherit)", color: "rgba(7,8,11,0.88)" }}'),
        # Description text inside expanded content
        ('style={{ color: "rgba(255,255,255,0.88)" }}',
         'style={{ color: "rgba(7,8,11,0.75)" }}'),
        # Copy and Share buttons inside expanded content
        ('style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}',
         'style={{ background: "rgba(7,8,11,0.1)", color: "var(--on-accent)" }}'),
    ],
}


def fix_file(filepath, replacements):
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"  NOT FOUND: {filepath}")
        return

    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"  WARN: pattern not found in {filepath}:\n    {old[:80]}")

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Fixed: {filepath}")
    else:
        print(f"  No changes: {filepath}")


for filepath, replacements in changes.items():
    fix_file(filepath, replacements)

print("\nDone.")
