"""
Phase 14b: Fix remaining rgba(white) patterns in more files.
"""
import os

CARD = "var(--card)"
CARD2 = "var(--card-2)"
STROKE = "var(--stroke)"
MUTED = "var(--muted)"
MUTED2 = "var(--muted-2)"
FG = "var(--fg)"

def fix_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"SKIP: {filepath}")
        return
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed: {os.path.basename(filepath)}")
    else:
        print(f"No change: {os.path.basename(filepath)}")

# ---------- main.tsx ----------
fix_file("src/main.tsx", [
    ('border: "1px solid rgba(255,255,255,.12)"', f'border: "1px solid {STROKE}"'),
])

# ---------- DhikrCard.tsx (SVG stroke) ----------
fix_file("src/components/dhikr/DhikrCard.tsx", [
    ('stroke="rgba(255,255,255,.12)"', f'stroke="{STROKE}"'),
])

# ---------- sectionIdentity.ts ----------
fix_file("src/lib/sectionIdentity.ts", [
    ('"rgba(255,255,255,.03)"', f'"{CARD}"'),
])

# ---------- Companions.tsx (tab filter backgrounds) ----------
fix_file("src/pages/Companions.tsx", [
    ('"rgba(255,255,255,0.045)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.06)"', f'"{CARD}"'),
])

# ---------- Duas.tsx (tab filter backgrounds) ----------
fix_file("src/pages/Duas.tsx", [
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.12)"', f'"{CARD2}"'),
])

# ---------- SeerahTimeline.tsx (category filter tabs) ----------
fix_file("src/pages/SeerahTimeline.tsx", [
    ('"rgba(255,255,255,0.045)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.06)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
])

# ---------- Search.tsx (result type tag backgrounds) ----------
fix_file("src/pages/Search.tsx", [
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
])

# ---------- Sebha.tsx (SVG ring + progress track) ----------
fix_file("src/pages/Sebha.tsx", [
    ('stroke="rgba(255,255,255,0.12)"', f'stroke="{STROKE}"'),
    ("'rgba(255,255,255,0.06)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.08)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.10)'", f'"{CARD2}"'),
])

# ---------- VideoLibrary.tsx ----------
fix_file("src/pages/VideoLibrary.tsx", [
    # SVG progress ring
    ('stroke="rgba(255,255,255,0.12)"', f'stroke="{STROKE}"'),
    # Inactive playlist item (in ternary, second value)
    ('"rgba(255,255,255,0.06)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.12)"', f'"{STROKE}"'),
    # Video card background
    ('"rgba(255,255,255,0.03)"', f'"{CARD}"'),
])

# ---------- WuduGuide.tsx ----------
fix_file("src/pages/WuduGuide.tsx", [
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.1)"', f'"{CARD2}"'),
    ('"rgba(255,255,255,0.10)"', f'"{CARD2}"'),
])

# ---------- Insights.tsx (remaining ternary cases) ----------
fix_file("src/pages/Insights.tsx", [
    ('"rgba(255,255,255,0.06)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.07)"', f'"{CARD}"'),
])

# ---------- Mushaf.tsx (tafseer toggle when OFF state) ----------
fix_file("src/pages/Mushaf.tsx", [
    ('"rgba(255,255,255,0.03)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.08)"', f'"{STROKE}"'),
])

# ---------- PrayerTimes.tsx (remaining mini grid) ----------
fix_file("src/pages/PrayerTimes.tsx", [
    ('"rgba(255,255,255,0.03)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.05)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.06)"', f'"{CARD}"'),
    ('"rgba(255,255,255,0.08)"', f'"{CARD}"'),
])

# ---------- Qibla.tsx (compass SVG - fix ring strokes and fills) ----------
fix_file("src/pages/Qibla.tsx", [
    ('stroke="rgba(255,255,255,0.08)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.06)"', f'stroke="{STROKE}"'),
    ('fill="rgba(255,255,255,0.03)"', f'fill="{CARD}"'),
    ('stroke="rgba(255,255,255,0.06)"', f'stroke="{STROKE}"'),
    # Tick marks
    ('stroke={major ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}',
     f'stroke={{major ? "{MUTED}" : "{STROKE}"}}'),
    # Compass direction labels
    ('fill="rgba(255,255,255,0.7)"', f'fill="{MUTED}"'),
    ('fill="rgba(255,255,255,0.4)"', f'fill="{MUTED2}"'),
    # Arrow fill
    ('fill="rgba(255,255,255,0.2)"', f'fill="{CARD2}"'),
])

print("Done!")
