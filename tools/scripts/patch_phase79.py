"""Phase 79v2: Add role=dialog, aria-modal, aria-label, and Escape handlers to Mushaf sheets.
Uses line-based approach to handle multi-line JSX accurately."""
# Strategy: read file, do targeted per-line replacements, write back
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def patch(rel_path, old, new, label):
    path = os.path.join(WORKSPACE, rel_path.replace('/', os.sep))
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f'MISS  {label}')
        return False
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.replace(old, new, 1))
    print(f'OK    {label}')
    return True

mushaf = 'src/pages/Mushaf.tsx'

# ── Reciter picker sheet ──────────────────────────────────────────────────────
patch(
    mushaf,
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u062e\u062a\u0631 \u0627\u0644\u0642\u0627\u0631\u0626" onClick={(e) => e.stopPropagation()} dir="rtl">',
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u062e\u062a\u0631 \u0627\u0644\u0642\u0627\u0631\u0626" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowReciterSheet(false); } }} dir="rtl">',
    'Mushaf reciter sheet: Escape',
)

# ── Page jump sheet ───────────────────────────────────────────────────────────
patch(
    mushaf,
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629" onClick={(e) => e.stopPropagation()} dir="rtl">',
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowJump(false); } }} dir="rtl">',
    'Mushaf page jump sheet: Escape',
)

# ── Reflection (tadabbur) note sheet ─────────────────────────────────────────
patch(
    mushaf,
    '<div className="mushaf-note-sheet" role="dialog" aria-modal="true" aria-label="\u062a\u062f\u0628\u0651\u0631" onClick={(e) => e.stopPropagation()} dir="rtl">',
    '<div className="mushaf-note-sheet" role="dialog" aria-modal="true" aria-label="\u062a\u062f\u0628\u0651\u0631" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setNoteSheetOpen(false); } }} dir="rtl">',
    'Mushaf tadabbur sheet: Escape',
)

# ── Tafsir sheet ──────────────────────────────────────────────────────────────
patch(
    mushaf,
    'className="mushaf-note-sheet"\n            role="dialog" aria-modal="true" aria-label="\u062a\u0641\u0633\u064a\u0631"',
    'className="mushaf-note-sheet"\n            role="dialog" aria-modal="true" aria-label="\u062a\u0641\u0633\u064a\u0631"\n            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setTafsirItem(null); } }}',
    'Mushaf tafsir sheet: Escape',
)

# ── Settings sheet ────────────────────────────────────────────────────────────
patch(
    mushaf,
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">',
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowSettings(false); } }} dir="rtl">',
    'Mushaf settings sheet: Escape',
)

# ── More actions sheet ────────────────────────────────────────────────────────
patch(
    mushaf,
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">',
    '<div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowMoreSheet(false); } }} dir="rtl">',
    'Mushaf more-actions sheet: Escape',
)

# ── DhikrList more-panel: add Escape handler ─────────────────────────────────
dhikr = 'src/components/dhikr/DhikrList.tsx'
# The "more" panel outer wrapper needs an Escape handler
# First, let's check what the panel looks like
path = os.path.join(WORKSPACE, dhikr.replace('/', os.sep))
with open(path, encoding='utf-8') as f:
    content = f.read()
# Find the more-panel div
import re
m = re.search(r'id="dhikr-more-panel"[^>]*>', content)
if m:
    print(f'DhikrList more-panel tag: {m.group(0)[:120]}')
else:
    print('DhikrList more-panel: PATTERN NOT FOUND')

# Also add onKeyDown to the outer container of more options
# Looking for the moreOpen conditional wrapper
# The pattern from Phase 76: <div id="dhikr-more-panel">
# Wrap the entire more-panel in a keydown handler or add to the more-panel div
# Find the id="dhikr-more-panel" element context
lines = content.splitlines()
for i, line in enumerate(lines):
    if 'dhikr-more-panel' in line:
        print(f'Line {i+1}: {line.strip()[:120]}')
        for j in range(max(0,i-3), min(len(lines),i+4)):
            print(f'  {j+1}: {lines[j].rstrip()[:100]}')

print('\nDone.')
