"""Phase 76: aria-expanded for more-options/add-city/surah-info collapsible buttons."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
ok = 0
miss = 0

def patch(path, patches):
    global ok, miss
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new, 1)
            print(f'  OK  [{label}]')
            ok += 1
        else:
            print(f'  MISS[{label}]')
            miss += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

# --- DhikrList.tsx: more-options button aria-expanded + panel id --------------
patch(os.path.join(base, 'src/components/dhikr/DhikrList.tsx'), [
    # Add aria-expanded + aria-controls to the more-options button
    (
        '              <Button\n                variant={(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) ? "primary" : "secondary"}\n                onClick={() => setMoreOpen((prev) => !prev)}\n                aria-label="\u062e\u064a\u0627\u0631\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629"\n              >',
        '              <Button\n                variant={(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) ? "primary" : "secondary"}\n                onClick={() => setMoreOpen((prev) => !prev)}\n                aria-label="\u062e\u064a\u0627\u0631\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629"\n                aria-expanded={(moreOpen || confirmReset || confirmDone || confirmDeleteCategory)}\n                aria-controls="dhikr-more-panel"\n              >',
        'DhikrList more-options aria-expanded + aria-controls'
    ),
    # Add id to the more-options panel div
    (
        '            {(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) && (\n              <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">',
        '            {(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) && (\n              <div id="dhikr-more-panel" className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">',
        'DhikrList more-options panel id'
    ),
])

# --- PrayerTimes.tsx: add-city button aria-expanded + panel id ----------------
patch(os.path.join(base, 'src/pages/PrayerTimes.tsx'), [
    (
        '        <Button variant="secondary" size="sm" onClick={() => setShowAdd((v) => !v)}>\n          <Plus size={13} aria-hidden="true" /> \u0625\u0636\u0627\u0641\u0629 \u0645\u062f\u064a\u0646\u0629\n        </Button>',
        '        <Button variant="secondary" size="sm" onClick={() => setShowAdd((v) => !v)} aria-expanded={showAdd} aria-controls="pt-add-city-panel">\n          <Plus size={13} aria-hidden="true" /> \u0625\u0636\u0627\u0641\u0629 \u0645\u062f\u064a\u0646\u0629\n        </Button>',
        'PrayerTimes add-city button aria-expanded'
    ),
    (
        '      {showAdd && (\n        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4 space-y-3">',
        '      {showAdd && (\n        <div id="pt-add-city-panel" className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4 space-y-3">',
        'PrayerTimes add-city panel id'
    ),
])

# --- Mushaf.tsx: surah-info button aria-expanded + panel id -------------------
patch(os.path.join(base, 'src/pages/Mushaf.tsx'), [
    (
        '              <button type="button"\n                onClick={() => setShowSurahInfo((v) => !v)}\n                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"\n              >',
        '              <button type="button"\n                onClick={() => setShowSurahInfo((v) => !v)}\n                aria-expanded={showSurahInfo}\n                aria-controls="mushaf-surah-info"\n                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"\n              >',
        'Mushaf surah-info button aria-expanded'
    ),
    (
        '              {showSurahInfo && lastItem && (\n                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--s',
        '              {showSurahInfo && lastItem && (\n                <div id="mushaf-surah-info" className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--s',
        'Mushaf surah-info panel id'
    ),
])

# --- Mushaf.tsx: loop count buttons aria-label --------------------------------
patch(os.path.join(base, 'src/pages/Mushaf.tsx'), [
    (
        '                      onClick={() => setLoopCount(n)}\n                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-acc\n                    >{n === -1 ? "\u221e" : `${n}\xd7`}</button>',
        '                      onClick={() => setLoopCount(n)}\n                      aria-label={n === -1 ? "\u062a\u0643\u0631\u0627\u0631 \u0644\u0627 \u0646\u0647\u0627\u0626\u064a" : `\u062a\u0643\u0631\u0627\u0631 ${n} \u0645\u0631\u0627\u062a`}\n                      aria-pressed={loopCount === n}\n                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-acc\n                    >{n === -1 ? "\u221e" : `${n}\xd7`}</button>',
        'Mushaf loop count buttons aria-label + aria-pressed'
    ),
])

print(f'\nTotal OK={ok} MISS={miss}')
print('Done.')
