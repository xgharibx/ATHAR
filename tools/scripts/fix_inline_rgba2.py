"""
Fix remaining rgba(255,255,255,...) inline styles that were missed due to:
- Single-quote string usage
- Complex conditional expressions
- Leaderboard achievement/streak/calendar states
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

# ---------- Insights.tsx (single-quote patterns + missing ones) ----------
fix_file("src/pages/Insights.tsx", [
    # SVG axis label text
    ('fill="rgba(255,255,255,0.7)"', f'fill="{MUTED}"'),
    # Achievement card incomplete state (object style)
    ('background: done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",',
     f'background: done ? "rgba(52,211,153,0.2)" : "{CARD}",'),
    ('borderColor: done ? "var(--ok)" : "rgba(255,255,255,0.12)",',
     f'borderColor: done ? "var(--ok)" : "{STROKE}",'),
    ('color: done ? "var(--ok)" : "rgba(255,255,255,0.3)",',
     f'color: done ? "var(--ok)" : "{MUTED2}",'),
    # XP ring border
    ('border: "2px solid rgba(255,255,255,0.12)"',
     f'border: "2px solid {STROKE}"'),
    # Single-quote patterns
    ("'rgba(255,255,255,0.04)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.05)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.06)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.07)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.08)'", f'"{CARD}"'),
    ("'rgba(255,255,255,0.1)'", f'"{CARD2}"'),
    ("'rgba(255,255,255,0.12)'", f'"{CARD2}"'),
    # Single-quote border patterns
    ("'1px solid rgba(255,255,255,0.08)'", f'"1px solid {STROKE}"'),
    ("'1px solid rgba(255,255,255,0.1)'", f'"1px solid {STROKE}"'),
    ("'1px solid rgba(255,255,255,0.12)'", f'"1px solid {STROKE}"'),
    # Quran juz legend background (single quotes)
    ("background: 'rgba(255,255,255,0.07)'", f'background: "{CARD}"'),
    ("background: \"rgba(255,255,255,0.07)\"", f'background: "{CARD}"'),
])

# ---------- Leaderboard.tsx ----------
fix_file("src/pages/Leaderboard.tsx", [
    # Achievement card incomplete state
    ('background: done ? `${color}40` : "rgba(255,255,255,0.04)",',
     f'background: done ? `${{color}}40` : "{CARD}",'),
    ('borderColor: done ? color : "rgba(255,255,255,0.1)",',
     f'borderColor: done ? color : "{STROKE}",'),
    ('color: done ? color : "rgba(255,255,255,0.5)",',
     f'color: done ? color : "{MUTED2}",'),
    # Streak cards
    ('background: isCompleted ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",',
     'background: isCompleted ? "rgba(52,211,153,0.15)" : "var(--card)",'),
    ('borderColor: isCompleted ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"',
     'borderColor: isCompleted ? "rgba(52,211,153,0.3)" : "var(--stroke)"'),
    # Calendar day states
    ('background: done ? "rgba(52,211,153,0.15)" : day.isToday ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",',
     'background: done ? "rgba(52,211,153,0.15)" : day.isToday ? "var(--card-2)" : "var(--card)",'),
    ('borderColor: done ? "rgba(52,211,153,0.4)" : day.isToday ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"',
     'borderColor: done ? "rgba(52,211,153,0.4)" : day.isToday ? "var(--stroke)" : "var(--stroke)"'),
    # Dot separator
    ('color: "rgba(255,255,255,0.2)", fontSize: "8px"',
     f'color: "{MUTED2}", fontSize: "8px"'),
])

# ---------- DhikrList.tsx ----------
fix_file("src/components/dhikr/DhikrList.tsx", [
    ('background: v ? identity.accent : "rgba(255,255,255,0.15)"',
     f'background: v ? identity.accent : "{CARD2}"'),
])

# ---------- AsmaAlHusna.tsx (only the tab inactive bg - other rgba are in expanded state) ----------
fix_file("src/pages/AsmaAlHusna.tsx", [
    ('background: tab === t ? "#f59e0b" : "rgba(255,255,255,0.08)"',
     f'background: tab === t ? "#f59e0b" : "{CARD}"'),
])

# ---------- PrayerTimes.tsx (SVG arc past prayers) ----------
fix_file("src/pages/PrayerTimes.tsx", [
    # Past prayer SVG circle fill
    ('fill={p.isPast ? "rgba(255,255,255,0.25)" : "var(--accent)"}',
     f'fill={{p.isPast ? "{CARD2}" : "var(--accent)"}}'),
    # Past prayer ring stroke (in JSX expression)
    ('stroke={p.isPast ? "rgba(255,255,255,0.12)" : "var(--accent)"}',
     f'stroke={{p.isPast ? "{STROKE}" : "var(--accent)"}}'),
    # Prayer name label text (past vs upcoming)
    ('fill={p.isPast ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)"}',
     f'fill={{p.isPast ? "{MUTED2}" : "{MUTED}"}}'),
    # Prayer time label
    ('fill="rgba(255,255,255,0.35)"',
     f'fill="{MUTED2}"'),
    # Past/upcoming mini grid background
    ('backgroundColor: p.isPast ? "rgba(255,255,255,0.03)"',
     f'backgroundColor: p.isPast ? "{CARD}"'),
])

# ---------- Home.tsx (remaining cases) ----------
fix_file("src/pages/Home.tsx", [
    # Anything left with single or double quotes
    ("\"rgba(255,255,255,0.07)\"", f'"{CARD}"'),
    ("\"rgba(255,255,255,0.08)\"", f'"{CARD}"'),
    ("\"rgba(255,255,255,0.10)\"", f'"{CARD2}"'),
])

# ---------- QuranVocab.tsx ----------
fix_file("src/pages/QuranVocab.tsx", [
    ("\"rgba(255,255,255,0.08)\"", f'"{CARD}"'),
])

print("Done!")
