import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/pages/Leaderboard.tsx': [
        # Sync button loader — button has text, spinner is decorative
        (
            '? <Loader2 size={16} className="animate-spin" />\n              : <Send size={16} aria-hidden="true" />',
            '? <Loader2 size={16} aria-hidden="true" className="animate-spin" />\n              : <Send size={16} aria-hidden="true" />',
            'sync button loader'
        ),
        # Reset button loader + Trash2 — button has text, both decorative
        (
            '{resettingScores ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}',
            '{resettingScores ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Trash2 size={16} aria-hidden="true" />}',
            'reset button loader'
        ),
    ],
    'src/pages/Search.tsx': [
        # Hadith loading container
        (
            '          <div className="flex items-center justify-center gap-2 py-8 text-[var(--muted)]">\n'
            '            <Loader2 size={18} className="animate-spin" />\n'
            '            <span className="text-sm font-arabic">جاري تحميل الكتاب…</span>\n'
            '          </div>',
            '          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-8 text-[var(--muted)]">\n'
            '            <Loader2 size={18} aria-hidden="true" className="animate-spin" />\n'
            '            <span className="text-sm font-arabic">جاري تحميل الكتاب…</span>\n'
            '          </div>',
            'hadith loading status'
        ),
    ],
}

for rel, pats in patches.items():
    path = os.path.join(base, rel)
    name = rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in pats:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
        else:
            print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
