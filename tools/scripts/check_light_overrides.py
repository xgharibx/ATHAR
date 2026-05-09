"""Check if specific .light overrides exist in globals.css."""
with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

tests = [
    '.light .floating-nav',
    '.light .ctx-menu',
    '.light .btn-count',
    '.light .dhikr-page-stars',
    '.light .mushaf-sleep-chip',
    '.light .mushaf-juz-overlay',
    '.light [data-noor-tip]',
    '.light .ptr-indicator',
    '.light .ayah-tooltip',
    '.light .quran-note-sheet',
    '.light .quran-fs-header',
    '.light .quran-juz-btn',
]
for t in tests:
    found = t in content
    status = "FOUND" if found else "MISSING"
    print(f"{t}: {status}")
