with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('mushaf-juz-overlay uses CSS vars', 'color-mix(in srgb, var(--bg) 88%, var(--fg))' in content),
    ('quran-note-sheet border-top fixed', 'border-top: 1px solid var(--stroke)' in content),
    ('floating-nav override added', '.light .floating-nav {' in content),
    ('floating-nav-item override added', '.light .floating-nav-item {' in content),
    ('dhikr-page-stars override added', '.light .dhikr-page-stars {' in content),
    ('dhikr-card-stars override added', '.light .dhikr-card-stars {' in content),
    ('btn-count override added', '.light .btn-count::after {' in content),
    ('mushaf-sleep-chip override added', '.light .mushaf-sleep-chip {' in content),
    ('data-noor-tip override added', '.light [data-noor-tip]::after {' in content),
    ('ptr-indicator override added', '.light .ptr-indicator {' in content),
    ('ptr-spinner override added', '.light .ptr-indicator .ptr-spinner {' in content),
    ('ctx-menu override added', '.light .ctx-menu {' in content),
    ('ctx-menu-item override added', '.light .ctx-menu-item {' in content),
    ('ctx-menu-separator override added', '.light .ctx-menu-separator {' in content),
]
all_ok = True
for name, result in checks:
    status = 'OK' if result else 'FAIL'
    if not result:
        all_ok = False
    print(f'  {status}: {name}')

print()
print('All OK!' if all_ok else 'SOME FAILURES!')
