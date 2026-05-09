"""Phase 61a — aria-hidden on VideoLibrary.tsx icons."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(BASE, 'src/pages/VideoLibrary.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Each tuple: (old, new, label)
# For patterns that appear exactly once or same aria-hidden needed on all
PATCHES = [
    # Zap section header inline with span
    ('<Zap size={9} />',
     '<Zap size={9} aria-hidden="true" />',
     'Zap size 9'),

    ('<Zap size={14} style={{ color: "var(--accent)" }} />',
     '<Zap size={14} aria-hidden="true" style={{ color: "var(--accent)" }} />',
     'Zap size 14'),

    # BookOpen inline in fragment
    ('<><BookOpen size={9} /><span>موضوع</span></>',
     '<><BookOpen size={9} aria-hidden="true" /><span>موضوع</span></>',
     'BookOpen size 9'),

    # GraduationCap patterns
    ('<><GraduationCap size={9} /><span>',
     '<><GraduationCap size={9} aria-hidden="true" /><span>',
     'GraduationCap size 9 fragment'),

    ('<GraduationCap size={16} style={{ color: channel.accent }} />',
     '<GraduationCap size={16} aria-hidden="true" style={{ color: channel.accent }} />',
     'GraduationCap size 16 channel.accent'),

    ('<GraduationCap size={16} style={{ color: channel?.accent }} />',
     '<GraduationCap size={16} aria-hidden="true" style={{ color: channel?.accent }} />',
     'GraduationCap size 16 channel?.accent'),

    ('<GraduationCap size={12} />',
     '<GraduationCap size={12} aria-hidden="true" />',
     'GraduationCap size 12'),

    ('<GraduationCap size={10} />',
     '<GraduationCap size={10} aria-hidden="true" />',
     'GraduationCap size 10'),

    # Play icons (decorative)
    ('<Play size={20} className="opacity-30" />',
     '<Play size={20} aria-hidden="true" className="opacity-30" />',
     'Play size 20 opacity-30'),

    ('<Play size={14} fill="black" color="black" />',
     '<Play size={14} aria-hidden="true" fill="black" color="black" />',
     'Play size 14 active indicator'),

    ('<Play size={13} className="text-white" style={{ marginLeft: 2 }} />',
     '<Play size={13} aria-hidden="true" className="text-white" style={{ marginLeft: 2 }} />',
     'Play size 13 thumbnail'),

    ('<Play size={22} className="text-white" style={{ marginLeft: 3 }} />',
     '<Play size={22} aria-hidden="true" className="text-white" style={{ marginLeft: 3 }} />',
     'Play size 22 feature card'),

    ('<Play size={15} />\n              <span>{lastWatched ? "أكمل الدرس" : "ابدأ الدورة"}</span>',
     '<Play size={15} aria-hidden="true" />\n              <span>{lastWatched ? "أكمل الدرس" : "ابدأ الدورة"}</span>',
     'Play size 15 start course button'),

    # Bookmark indicators
    ('<Bookmark size={11} className="fill-[var(--accent)] text-[var(--accent)]" />\n          </div>',
     '<Bookmark size={11} aria-hidden="true" className="fill-[var(--accent)] text-[var(--accent)]" />\n          </div>',
     'Bookmark size 11 indicator (first)'),

    ('<Bookmark size={11} className="fill-[var(--accent)] text-[var(--accent)]" />\n        </div>',
     '<Bookmark size={11} aria-hidden="true" className="fill-[var(--accent)] text-[var(--accent)]" />\n        </div>',
     'Bookmark size 11 indicator (second)'),

    ('<Bookmark size={14} className="fill-[var(--accent)] text-[var(--accent)]" />',
     '<Bookmark size={14} aria-hidden="true" className="fill-[var(--accent)] text-[var(--accent)]" />',
     'Bookmark size 14 section'),

    # Star
    ('<Star size={13} className="fill-[var(--accent)]" />',
     '<Star size={13} aria-hidden="true" className="fill-[var(--accent)]" />',
     'Star size 13'),

    # Search input prefix
    ('<Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />',
     '<Search size={14} aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />',
     'Search size 14 input prefix'),

    # Sparkles button inline with span
    ('<Sparkles size={12} />\n                  <span>أكمل من حيث توقفت</span>',
     '<Sparkles size={12} aria-hidden="true" />\n                  <span>أكمل من حيث توقفت</span>',
     'Sparkles size 12'),

    # ArrowRight in buttons with text spans
    ('<ArrowRight size={14} />\n            <span>المكتبة</span>',
     '<ArrowRight size={14} aria-hidden="true" />\n            <span>المكتبة</span>',
     'ArrowRight size 14 (1)'),

    ('<ArrowRight size={16} />\n          <span>المكتبة</span>',
     '<ArrowRight size={16} aria-hidden="true" />\n          <span>المكتبة</span>',
     'ArrowRight size 16'),

    ('<ArrowRight size={14} /><span>المكتبة</span>',
     '<ArrowRight size={14} aria-hidden="true" /><span>المكتبة</span>',
     'ArrowRight size 14 inline (2)'),

    # Clock
    ('<Clock size={11} className="opacity-60" />',
     '<Clock size={11} aria-hidden="true" className="opacity-60" />',
     'Clock size 11'),

    ('<Clock size={10} />',
     '<Clock size={10} aria-hidden="true" />',
     'Clock size 10'),

    # ChevronLeft (breadcrumb separators)
    ('<ChevronLeft size={11} />',
     '<ChevronLeft size={11} aria-hidden="true" />',
     'ChevronLeft size 11 breadcrumb'),

    ('<ChevronLeft size={10} />',
     '<ChevronLeft size={10} aria-hidden="true" />',
     'ChevronLeft size 10 breadcrumb'),
]

ok = 0
fail = 0

for old, new, label in PATCHES:
    if old in content:
        content = content.replace(old, new)
        print(f'OK  [{label}]')
        ok += 1
    else:
        print(f'MISS[{label}]')
        fail += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n{ok} patched, {fail} missed')
