"""Phase 77: aria-atomic="true" on aria-live regions + role="list" fixes"""
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

# ── 1. OfflineBanner ─────────────────────────────────────────────────────────
patch(
    'src/components/ui/OfflineBanner.tsx',
    'aria-live="polite"',
    'aria-live="polite" aria-atomic="true"',
    'OfflineBanner aria-atomic',
)

# ── 2. DailyCarousel ──────────────────────────────────────────────────────────
patch(
    'src/components/ui/DailyCarousel.tsx',
    'aria-live="polite"',
    'aria-live="polite" aria-atomic="true"',
    'DailyCarousel aria-atomic',
)

# ── 3. usePullToRefresh ───────────────────────────────────────────────────────
patch(
    'src/hooks/usePullToRefresh.tsx',
    'aria-live="polite"',
    'aria-live="polite" aria-atomic="true"',
    'PullToRefresh aria-atomic',
)

# ── 4. HadithBookView loading ─────────────────────────────────────────────────
patch(
    'src/pages/HadithBookView.tsx',
    'role="status" aria-live="polite" aria-label="\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0643\u062a\u0627\u0628"',
    'role="status" aria-live="polite" aria-atomic="true" aria-label="\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0643\u062a\u0627\u0628"',
    'HadithBookView loading aria-atomic',
)

# ── 5. HadithReader ───────────────────────────────────────────────────────────
patch(
    'src/pages/HadithReader.tsx',
    'role="status" aria-live="polite">',
    'role="status" aria-live="polite" aria-atomic="true">',
    'HadithReader aria-atomic',
)

# ── 6. NearbyMosques ─────────────────────────────────────────────────────────
# First occurrence (loading)
path = os.path.join(WORKSPACE, 'src', 'pages', 'NearbyMosques.tsx')
with open(path, encoding='utf-8') as f:
    content = f.read()
old_val = 'role="status" aria-live="polite">'
new_val = 'role="status" aria-live="polite" aria-atomic="true">'
count = content.count(old_val)
if count >= 2:
    # Replace both occurrences
    content = content.replace(old_val, new_val)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK    NearbyMosques aria-atomic x{count}')
else:
    print(f'MISS  NearbyMosques (found {count})')

# ── 7. PrayerWidget ───────────────────────────────────────────────────────────
patch(
    'src/components/layout/PrayerWidget.tsx',
    'role="status" aria-live="polite">',
    'role="status" aria-live="polite" aria-atomic="true">',
    'PrayerWidget aria-atomic',
)

# ── 8. PrayerTimes loading states ─────────────────────────────────────────────
path = os.path.join(WORKSPACE, 'src', 'pages', 'PrayerTimes.tsx')
with open(path, encoding='utf-8') as f:
    content = f.read()
old_val = 'role="status" aria-live="polite">'
new_val = 'role="status" aria-live="polite" aria-atomic="true">'
count = content.count(old_val)
if count >= 1:
    content = content.replace(old_val, new_val)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK    PrayerTimes aria-atomic x{count}')
else:
    print(f'MISS  PrayerTimes (found {count})')

# Second PrayerTimes pattern (different format)
patch(
    'src/pages/PrayerTimes.tsx',
    'aria-live="polite">',
    'aria-live="polite" aria-atomic="true">',
    'PrayerTimes aria-live standalone',
)

# ── 9. Search ─────────────────────────────────────────────────────────────────
patch(
    'src/pages/Search.tsx',
    'role="status" aria-live="polite"',
    'role="status" aria-live="polite" aria-atomic="true"',
    'Search aria-atomic',
)

# ── 10. Mushaf juz overlay ────────────────────────────────────────────────────
patch(
    'src/pages/Mushaf.tsx',
    'aria-live="polite">{juzOverlay}',
    'aria-live="polite" aria-atomic="true">{juzOverlay}',
    'Mushaf juz overlay aria-atomic',
)

# ── 11. ProphetStories ul → role=list ─────────────────────────────────────────
patch(
    'src/pages/ProphetStories.tsx',
    '<ul className="space-y-1.5">',
    '<ul role="list" className="space-y-1.5">',
    'ProphetStories ul role=list',
)

print('\nDone.')
