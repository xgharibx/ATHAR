"""Phase 69: Fix mushaf-sleep-chip role+keyboard, add aria-hidden to mushaf-overlay divs."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/Mushaf.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Fix sleep chip: add role, tabIndex, onKeyDown
    (
        '<div className="mushaf-sleep-chip" onClick={() => activateSleepTimer(0)} aria-label="\u0625\u0644\u063a\u0627\u0621 \u0645\u0624\u0642\u062a \u0627\u0644\u0646\u0648\u0645">',
        '<div className="mushaf-sleep-chip" role="button" tabIndex={0} onClick={() => activateSleepTimer(0)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateSleepTimer(0); } }} aria-label="\u0625\u0644\u063a\u0627\u0621 \u0645\u0624\u0642\u062a \u0627\u0644\u0646\u0648\u0645">',
        'mushaf-sleep-chip role+keyboard'
    ),
    # Add aria-hidden to all mushaf-overlay divs (click-outside backdrop, not interactive for SR)
    (
        '<div className="mushaf-overlay" onClick={() => setShowReciterSheet(false)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowReciterSheet(false)} />',
        'overlay ReciterSheet aria-hidden'
    ),
    (
        '<div className="mushaf-overlay" onClick={() => setShowJump(false)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowJump(false)} />',
        'overlay Jump aria-hidden'
    ),
    (
        '<div className="mushaf-overlay" onClick={() => setNoteSheetOpen(false)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setNoteSheetOpen(false)} />',
        'overlay Note aria-hidden'
    ),
    (
        '<div className="mushaf-overlay" onClick={() => setTafsirItem(null)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setTafsirItem(null)} />',
        'overlay Tafsir aria-hidden'
    ),
    (
        '<div className="mushaf-overlay" onClick={() => setShowSettings(false)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowSettings(false)} />',
        'overlay Settings aria-hidden'
    ),
    (
        '<div className="mushaf-overlay" onClick={() => setShowMoreSheet(false)} />',
        '<div className="mushaf-overlay" aria-hidden="true" onClick={() => setShowMoreSheet(false)} />',
        'overlay MoreSheet aria-hidden'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
