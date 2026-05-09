"""
Fix inline rgba(255,255,255,...) styles for light theme compatibility.
Replaces background, borderColor, and SVG stroke attributes.
"""
import re
import os

files_to_fix = [
    "src/pages/Insights.tsx",
    "src/pages/Home.tsx",
    "src/pages/Leaderboard.tsx",
    "src/pages/AsmaAlHusna.tsx",
    "src/pages/Duas.tsx",
    "src/pages/PrayerTimes.tsx",
    "src/pages/Mushaf.tsx",
    "src/pages/QuranPlans.tsx",
    "src/pages/QuranVocab.tsx",
    "src/pages/HadithMemo.tsx",
    "src/pages/Companions.tsx",
    "src/pages/ProphetStories.tsx",
    "src/pages/NearbyMosques.tsx",
    "src/pages/PrayerGuide.tsx",
    "src/components/dhikr/DhikrList.tsx",
    "src/components/layout/PrayerCountdown.tsx",
    "src/components/video/YouTubeCoursePlayer.tsx",
]

CARD = "var(--card)"
CARD2 = "var(--card-2)"
STROKE = "var(--stroke)"
MUTED = "var(--muted)"
MUTED2 = "var(--muted-2)"

# Maps: (context_key, alpha_string) -> replacement
# We only replace low-opacity whites that are invisible in light mode

replacements = [
    # SVG stroke attributes
    ('stroke="rgba(255,255,255,0.04)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.05)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.06)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.07)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.08)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.10)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.1)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.12)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.14)"', f'stroke="{STROKE}"'),
    ('stroke="rgba(255,255,255,0.15)"', f'stroke="{STROKE}"'),

    # SVG fill attributes (very low opacity whites)
    ('fill="rgba(255,255,255,0.03)"', f'fill="{CARD}"'),
    ('fill="rgba(255,255,255,0.04)"', f'fill="{CARD}"'),
    ('fill="rgba(255,255,255,0.05)"', f'fill="{CARD}"'),
    ('fill="rgba(255,255,255,0.06)"', f'fill="{CARD}"'),

    # Inline style background: "rgba(255,255,255,X)"
    ('background: "rgba(255,255,255,0.03)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.04)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.045)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.05)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.055)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.06)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.07)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.08)"', f'background: "{CARD}"'),
    ('background: "rgba(255,255,255,0.1)"', f'background: "{CARD2}"'),
    ('background: "rgba(255,255,255,0.10)"', f'background: "{CARD2}"'),
    ('background: "rgba(255,255,255,0.12)"', f'background: "{CARD2}"'),

    # backgroundColor: "rgba(255,255,255,X)"
    ('backgroundColor: "rgba(255,255,255,0.03)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.04)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.045)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.05)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.06)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.07)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.08)"', f'backgroundColor: "{CARD}"'),
    ('backgroundColor: "rgba(255,255,255,0.1)"', f'backgroundColor: "{CARD2}"'),
    ('backgroundColor: "rgba(255,255,255,0.10)"', f'backgroundColor: "{CARD2}"'),
    ('backgroundColor: "rgba(255,255,255,0.12)"', f'backgroundColor: "{CARD2}"'),

    # borderColor: "rgba(255,255,255,X)"
    ('borderColor: "rgba(255,255,255,0.06)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.07)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.08)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.1)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.10)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.12)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.15)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.18)"', f'borderColor: "{STROKE}"'),
    ('borderColor: "rgba(255,255,255,0.2)"', f'borderColor: "{STROKE}"'),

    # outlineColor / outline: "X solid rgba(...)"
    ('outline: d.key === today ? "2px solid rgba(255,255,255,0.5)" : "none"',
     'outline: d.key === today ? "2px solid var(--stroke)" : "none"'),

    # border: "1px solid rgba(255,255,255,X)"
    ('border: "1px solid rgba(255,255,255,0.1)"', f'border: "1px solid {STROKE}"'),
    ('border: "1px solid rgba(255,255,255,0.10)"', f'border: "1px solid {STROKE}"'),
    ('border: "1px solid rgba(255,255,255,0.12)"', f'border: "1px solid {STROKE}"'),
    ('border: "1px solid rgba(255,255,255,0.15)"', f'border: "1px solid {STROKE}"'),

    # borderTop/borderBottom
    ('borderTop: "1px solid rgba(255,255,255,0.08)"', f'borderTop: "1px solid {STROKE}"'),
    ('borderBottom: "1px solid rgba(255,255,255,0.08)"', f'borderBottom: "1px solid {STROKE}"'),
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        print(f"SKIP (not found): {filepath}")
        continue
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        remaining = len(re.findall(r"rgba\(255,\s*255,\s*255,\s*0\.\d+\)", content))
        print(f"Fixed: {os.path.basename(filepath)}, remaining rgba: {remaining}")
    else:
        print(f"No change: {os.path.basename(filepath)}")
