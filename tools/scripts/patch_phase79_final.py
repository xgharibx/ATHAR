"""Phase 79 FINAL: Add role=dialog+aria-modal+aria-label+Escape to Mushaf sheets + DhikrList toolbar"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mushaf_path = os.path.join(WORKSPACE, 'src', 'pages', 'Mushaf.tsx')

with open(mushaf_path, encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
changes = 0

# Map: (0-based line index, old_text, new_text, label)
# Lines are 0-indexed; the line content includes the newline
PATCHES = [
    # ── 1. Reciter picker sheet (line 1522 = index 1521) ─────────────────────
    (
        1521,
        '          <div className="mushaf-jump-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">',
        '          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u062e\u062a\u0631 \u0627\u0644\u0642\u0627\u0631\u0626" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowReciterSheet(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">',
        'Reciter sheet',
    ),
    # ── 2. Page jump sheet (line 1586 = index 1585) ───────────────────────────
    (
        1585,
        '          <div className="mushaf-jump-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">',
        '          <div className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowJump(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">',
        'Jump sheet',
    ),
    # ── 3. Reflection (tadabbur) note sheet (line 1602 = index 1601) ─────────
    (
        1601,
        '          <div className="mushaf-note-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">',
        '          <div className="mushaf-note-sheet" role="dialog" aria-modal="true" aria-label="\u062a\u062f\u0628\u0651\u0631" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setNoteSheetOpen(false); } }} onClick={(e) => e.stopPropagation()} dir="rtl">',
        'Tadabbur sheet',
    ),
]

for (idx, old_stripped, new_stripped, label) in PATCHES:
    # The actual line in the file has a newline at the end
    old_line = old_stripped + '\n'
    new_line = new_stripped + '\n'
    if lines[idx].rstrip() == old_stripped:
        lines[idx] = new_line
        changes += 1
        print(f'OK    {label} (line {idx+1})')
    else:
        actual = lines[idx].rstrip()
        print(f'MISS  {label} (line {idx+1})')
        print(f'  expected: {old_stripped[:100]}')
        print(f'  actual:   {actual[:100]}')

# ── 4. Tafsir sheet: multi-line, find by context ─────────────────────────────
# Line 1692 = index 1691: '          <div'
# Line 1693 = index 1692: '            className="mushaf-note-sheet"'
# Line 1694 = index 1693: '            style={{ maxHeight: "78vh"...'
# We insert role/label after the className line
found_tafsir = False
for i in range(len(lines)):
    if (lines[i].rstrip() == '          <div' and 
        i+1 < len(lines) and 'mushaf-note-sheet' in lines[i+1] and
        i+2 < len(lines) and 'maxHeight: "78vh"' in lines[i+2]):
        # Insert role/aria after className line
        existing = lines[i+1].rstrip()
        if 'role="dialog"' not in existing:
            lines[i+1] = existing + '\n'  # keep as is  
            # We add the role attributes as extra attributes on the same className line
            lines[i+1] = lines[i+1].replace(
                'className="mushaf-note-sheet"',
                'className="mushaf-note-sheet"\n            role="dialog" aria-modal="true" aria-label="\u062a\u0641\u0633\u064a\u0631"'
            )
            # Add onKeyDown before onClick
            lines[i+2] = lines[i+2].rstrip() + '\n'  # keep style line
            # Find onClick in the subsequent lines
            for j in range(i+2, min(i+6, len(lines))):
                if 'onClick={(e) => e.stopPropagation()}' in lines[j]:
                    lines[j] = lines[j].replace(
                        'onClick={(e) => e.stopPropagation()}',
                        'onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setTafsirItem(null); } }}\n            onClick={(e) => e.stopPropagation()}'
                    )
                    break
            changes += 1
            found_tafsir = True
            print(f'OK    Tafsir sheet (line {i+2})')
        else:
            print(f'SKIP  Tafsir sheet (already has role)')
            found_tafsir = True
        break
if not found_tafsir:
    print('MISS  Tafsir sheet (pattern not found)')

# ── 5. Settings sheet (line 1842 = index 1841) ───────────────────────────────
# Has style={{ maxHeight: "80vh"... }} and title "إعدادات القراءة"
# Two sheets have the same "style={{ maxHeight: "80vh"..." pattern, differentiate by title
for i in range(len(lines)):
    if (i+1 < len(lines) and
        'mushaf-jump-sheet" style={{ maxHeight: "80vh"' in lines[i] and
        'role="dialog"' not in lines[i]):
        # Check title in next ~5 lines
        title_window = ''.join(lines[i:min(i+6, len(lines))])
        if '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629' in title_window:  # إعدادات القراءة
            lines[i] = lines[i].replace(
                'className="mushaf-jump-sheet" style=',
                'className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowSettings(false); } }} style='
            )
            changes += 1
            print(f'OK    Settings sheet (line {i+1})')
        elif '\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629' in title_window:  # الإجراءات السريعة
            lines[i] = lines[i].replace(
                'className="mushaf-jump-sheet" style=',
                'className="mushaf-jump-sheet" role="dialog" aria-modal="true" aria-label="\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowMoreSheet(false); } }} style='
            )
            changes += 1
            print(f'OK    More-actions sheet (line {i+1})')

print(f'\nTotal changes: {changes}')
with open(mushaf_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('File written.')

# ── 6. DhikrList: add role=toolbar to more-panel ─────────────────────────────
dhikr_path = os.path.join(WORKSPACE, 'src', 'components', 'dhikr', 'DhikrList.tsx')
with open(dhikr_path, encoding='utf-8') as f:
    dc = f.read()
old_panel = 'id="dhikr-more-panel" className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">'
new_panel = 'id="dhikr-more-panel" role="toolbar" aria-label="\u062e\u064a\u0627\u0631\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629" className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">'
if old_panel in dc:
    with open(dhikr_path, 'w', encoding='utf-8') as f:
        f.write(dc.replace(old_panel, new_panel, 1))
    print('OK    DhikrList more-panel: role=toolbar')
else:
    print('MISS  DhikrList more-panel')
