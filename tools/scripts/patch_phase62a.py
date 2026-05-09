"""Phase 62a — aria-hidden on Settings, Search, Favorites icons."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def patch(rel_path, patches):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    ok = fail = 0
    for old, new, label in patches:
        if old in content:
            content = content.replace(old, new); ok += 1; print(f'  OK  [{label}]')
        else:
            fail += 1; print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return ok, fail

# ── Settings.tsx ──────────────────────────────────────────────────────────────
print('=== Settings.tsx ===')
ok1, f1 = patch('src/pages/Settings.tsx', [
    ('<Palette size={18} className="text-[var(--accent)]" />',
     '<Palette size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Palette size 18'),
    ('<Type size={15} className="text-[var(--accent)]" />',
     '<Type size={15} aria-hidden="true" className="text-[var(--accent)]" />',
     'Type size 15'),
    ('<RotateCcw size={13} />\n            إعادة ضبط',
     '<RotateCcw size={13} aria-hidden="true" />\n            إعادة ضبط',
     'RotateCcw reset'),
    ('<SlidersHorizontal size={18} className="text-[var(--accent)]" />',
     '<SlidersHorizontal size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'SlidersHorizontal size 18'),
    ('<RotateCw size={12} />\n              مزامنة الآن',
     '<RotateCw size={12} aria-hidden="true" />\n              مزامنة الآن',
     'RotateCw sync'),
    ('{playingPreview === `reminder:${option.id}` ? <Square size={12} /> : <Play size={12} />}',
     '{playingPreview === `reminder:${option.id}` ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}',
     'Square/Play reminder preview'),
    ('{playingPreview === `prayer:${option.id}` ? <Square size={12} /> : <Play size={12} />}',
     '{playingPreview === `prayer:${option.id}` ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}',
     'Square/Play prayer preview'),
    ('<Fingerprint size={18} className="text-[var(--accent)]" />',
     '<Fingerprint size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Fingerprint size 18'),
    ('<Layers size={14} className="text-[var(--accent)]" />',
     '<Layers size={14} aria-hidden="true" className="text-[var(--accent)]" />',
     'Layers size 14'),
    ('<ChevronLeft size={14} className="opacity-35 flex-shrink-0" />',
     '<ChevronLeft size={14} aria-hidden="true" className="opacity-35 flex-shrink-0" />',
     'ChevronLeft size 14'),
    ('<Layers size={18} className="text-[var(--accent)]" />',
     '<Layers size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Layers size 18'),
    ('<ArrowUp size={12} />\n              </button>',
     '<ArrowUp size={12} aria-hidden="true" />\n              </button>',
     'ArrowUp size 12'),
    ('<ArrowDown size={12} />\n              </button>',
     '<ArrowDown size={12} aria-hidden="true" />\n              </button>',
     'ArrowDown size 12'),
])

# ── Search.tsx ────────────────────────────────────────────────────────────────
print('\n=== Search.tsx ===')
ok2, f2 = patch('src/pages/Search.tsx', [
    ('<Search size={18} className="opacity-70" />',
     '<Search size={18} aria-hidden="true" className="opacity-70" />',
     'Search size 18'),
    ('<BookOpen size={13} /> القرآن',
     '<BookOpen size={13} aria-hidden="true" /> القرآن',
     'BookOpen size 13'),
    ('<LibraryBig size={13} /> المكتبة',
     '<LibraryBig size={13} aria-hidden="true" /> المكتبة',
     'LibraryBig size 13'),
    ('<ScrollText size={13} /> الأحاديث',
     '<ScrollText size={13} aria-hidden="true" /> الأحاديث',
     'ScrollText size 13'),
    ('<Search size={32} className="opacity-20" />',
     '<Search size={32} aria-hidden="true" className="opacity-20" />',
     'Search empty state'),
    ('<Copy size={13} />\n                      </button>',
     '<Copy size={13} aria-hidden="true" />\n                      </button>',
     'Copy size 13 (hadith)'),
    ('<BookOpen size={32} className="opacity-20" />',
     '<BookOpen size={32} aria-hidden="true" className="opacity-20" />',
     'BookOpen empty state'),
    ('<BookOpen size={16} className="text-[var(--accent)] shrink-0 opacity-70" />',
     '<BookOpen size={16} aria-hidden="true" className="text-[var(--accent)] shrink-0 opacity-70" />',
     'BookOpen size 16'),
    ('<Copy size={13} />\n                      </button>',
     '<Copy size={13} aria-hidden="true" />\n                      </button>',
     'Copy size 13 (quran)'),
    ('<LibraryBig size={32} className="opacity-20" />',
     '<LibraryBig size={32} aria-hidden="true" className="opacity-20" />',
     'LibraryBig empty state'),
    ('<ScrollText size={32} className="opacity-20" />',
     '<ScrollText size={32} aria-hidden="true" className="opacity-20" />',
     'ScrollText empty state'),
])

# ── Favorites.tsx ─────────────────────────────────────────────────────────────
print('\n=== Favorites.tsx ===')
ok3, f3 = patch('src/pages/Favorites.tsx', [
    ('<Heart size={18} className="text-[var(--accent)]" />',
     '<Heart size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Heart size 18'),
    ('{copiedAll ? <CopyCheck size={15} /> : <Copy size={15} />}',
     '{copiedAll ? <CopyCheck size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}',
     'CopyCheck/Copy size 15'),
    ('<Heart size={14} />\n            ',
     '<Heart size={14} aria-hidden="true" />\n            ',
     'Heart size 14 tab'),
    ('<BookOpen size={14} />\n            ',
     '<BookOpen size={14} aria-hidden="true" />\n            ',
     'BookOpen size 14 tab'),
    ('<ScrollText size={14} />\n            ',
     '<ScrollText size={14} aria-hidden="true" />\n            ',
     'ScrollText size 14 tab'),
    ('<Bookmark size={14} />\n            ',
     '<Bookmark size={14} aria-hidden="true" />\n            ',
     'Bookmark size 14 tab'),
    ('<Star size={14} />\n            ',
     '<Star size={14} aria-hidden="true" />\n            ',
     'Star size 14 tab'),
    ('<Users size={14} />\n            ',
     '<Users size={14} aria-hidden="true" />\n            ',
     'Users size 14 tab'),
    ('{copiedKey === r.key ? <Check size={16} /> : <Copy size={16} />}',
     '{copiedKey === r.key ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}',
     'Check/Copy conditional'),
    ('<BookOpen size={13} className="text-[var(--accent)] shrink-0" />',
     '<BookOpen size={13} aria-hidden="true" className="text-[var(--accent)] shrink-0" />',
     'BookOpen size 13'),
    ('<Copy size={14} />\n                    </Button>',
     '<Copy size={14} aria-hidden="true" />\n                    </Button>',
     'Copy size 14 dua'),
])

total_ok = ok1 + ok2 + ok3
total_fail = f1 + f2 + f3
print(f'\nTotal: {total_ok} patched, {total_fail} missed')
