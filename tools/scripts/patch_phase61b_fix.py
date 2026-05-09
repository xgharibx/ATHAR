"""Phase 61b fix — correct missed patches."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def patch(rel_path, patches):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new, label in patches:
        if old in content:
            content = content.replace(old, new)
            print(f'OK  [{label}]')
        else:
            print(f'MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

patch('src/components/dhikr/DhikrList.tsx', [
    ('<List size={16} />\n                </Button>',
     '<List size={16} aria-hidden="true" />\n                </Button>',
     'DhikrList List compact toggle'),
])

patch('src/pages/Sebha.tsx', [
    ('<Sparkles size={15} className="text-[var(--accent)]" />\n                <span className="text-xs font-semibold opacity-60">سبحة ذكية</span>',
     '<Sparkles size={15} aria-hidden="true" className="text-[var(--accent)]" />\n                <span className="text-xs font-semibold opacity-60">سبحة ذكية</span>',
     'Sebha Sparkles header'),
    ('<Pencil size={15} className="text-[var(--accent)]" />\n            <span className="text-sm font-semibold">ذكر مخصص</span>',
     '<Pencil size={15} aria-hidden="true" className="text-[var(--accent)]" />\n            <span className="text-sm font-semibold">ذكر مخصص</span>',
     'Sebha Pencil custom dhikr header'),
])

patch('src/pages/Leaderboard.tsx', [
    ('? <Check size={12} strokeWidth={3} style={{ color: "var(--ok)" }} />\n                  : <span style={{ color: "var(--muted-2)", fontSize: "8px" }}>·</span>}',
     '? <Check size={12} aria-hidden="true" strokeWidth={3} style={{ color: "var(--ok)" }} />\n                  : <span style={{ color: "var(--muted-2)", fontSize: "8px" }}>·</span>}',
     'Leaderboard Check challenge done'),
])
