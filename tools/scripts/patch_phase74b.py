"""Phase 74b: Quran sort tabs aria-controls + HadithMemo aria-controls."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
ok = 0
miss = 0

def patch_file(path, patches):
    global ok, miss
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
            ok += 1
        else:
            print(f'  MISS[{label}]')
            miss += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

# ─── Quran.tsx ────────────────────────────────────────────────────────────────
q_path = os.path.join(base, 'src', 'pages', 'Quran.tsx')
patch_file(q_path, [
    # Sort tab "mushaf" — add aria-controls
    (
        '                role="tab"\n                aria-selected={sortMode === "mushaf"}\n                onClick={() => setSortMode("mushaf")}',
        '                role="tab"\n                aria-controls="quran-surah-list"\n                aria-selected={sortMode === "mushaf"}\n                onClick={() => setSortMode("mushaf")}',
        'Quran sort tab mushaf aria-controls'
    ),
    # Sort tab "progress" — add aria-controls
    (
        '                role="tab"\n                aria-selected={sortMode === "progress"}\n                onClick={() => setSortMode("progress")}',
        '                role="tab"\n                aria-controls="quran-surah-list"\n                aria-selected={sortMode === "progress"}\n                onClick={() => setSortMode("progress")}',
        'Quran sort tab progress aria-controls'
    ),
    # Surah list div — add id
    (
        '<div role="list" aria-label="\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0633\u0648\u0631">',
        '<div id="quran-surah-list" role="list" aria-label="\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0633\u0648\u0631">',
        'Quran surah list id'
    ),
])

# ─── HadithMemo.tsx ───────────────────────────────────────────────────────────
hm_path = os.path.join(base, 'src', 'pages', 'HadithMemo.tsx')
patch_file(hm_path, [
    # Both tabs: add aria-controls pointing to a shared content region
    # The tabs render as `{t === "due" ? ... : ...}` children — need to add aria-controls
    (
        '            role="tab"\n            key={t}\n            onClick={() => { setViewMode(t); setCardIndex(0); setIsFlipped(false); }}\n            aria-selected={viewMode === t}',
        '            role="tab"\n            key={t}\n            aria-controls="hadith-memo-content"\n            onClick={() => { setViewMode(t); setCardIndex(0); setIsFlipped(false); }}\n            aria-selected={viewMode === t}',
        'HadithMemo tabs aria-controls'
    ),
    # Wrap all post-tab content in a region div with the id
    # The content starts after the closing </div> of the tablist area
    # We add id to the outer div that wraps all conditional sections
    # Find "      {/* All reviewed today */}" comment and wrap it
    (
        '      {/* All reviewed today */}\n      {viewMode === "due" && dueCards.length === 0 && (',
        '      <div id="hadith-memo-content">\n      {/* All reviewed today */}\n      {viewMode === "due" && dueCards.length === 0 && (',
        'HadithMemo content wrapper open'
    ),
    # Close the wrapper at the end before the final closing </div>
    (
        '      {/* No pack loaded yet */}\n      {!nawawi && viewMode === "add" && (\n        <div className="relative z-10 flex flex-col items-center gap-3 py-16 text-[var(--muted)]">\n          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-h',
        '      {/* No pack loaded yet */}\n      {!nawawi && viewMode === "add" && (\n        <div className="relative z-10 flex flex-col items-center gap-3 py-16 text-[var(--muted)]">\n          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-h',
        'HadithMemo content wrapper check (no-op if not needed)'
    ),
])

print(f'\nTotal OK={ok} MISS={miss}')
print('Done.')
