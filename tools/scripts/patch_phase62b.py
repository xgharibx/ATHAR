"""Phase 62b — aria-hidden on icons in HadithBooks, Qibla, QuranVocab, Home,
   YouTubeCoursePlayer, Insights, CommandPalette, Ruqyah, HadithBookView."""
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

# ── HadithBooks.tsx ──────────────────────────────────────────────────────────
print('=== HadithBooks.tsx ===')
ok1, f1 = patch('src/pages/HadithBooks.tsx', [
    ('<BookOpen size={10} />\n              {book.count',
     '<BookOpen size={10} aria-hidden="true" />\n              {book.count',
     'BookOpen count'),
    ('<Bookmark size={10} />\n                {bookmarkCount}',
     '<Bookmark size={10} aria-hidden="true" />\n                {bookmarkCount}',
     'Bookmark count'),
    ('<ArrowRight size={12} className="text-[var(--muted)] rotate-180" />',
     '<ArrowRight size={12} aria-hidden="true" className="text-[var(--muted)] rotate-180" />',
     'ArrowRight rotate-180'),
    ('<Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />',
     '<Search size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />',
     'Search input icon'),
    ('<Search size={36} className="text-[var(--muted)] opacity-30" />',
     '<Search size={36} aria-hidden="true" className="text-[var(--muted)] opacity-30" />',
     'Search empty 30'),
    ('<Search size={36} className="text-[var(--muted)] opacity-20" />',
     '<Search size={36} aria-hidden="true" className="text-[var(--muted)] opacity-20" />',
     'Search empty 20'),
    ('<Copy size={12} />\n                  </button>',
     '<Copy size={12} aria-hidden="true" />\n                  </button>',
     'Copy size 12'),
    ('<Library size={19} className="text-[var(--accent)]" />',
     '<Library size={19} aria-hidden="true" className="text-[var(--accent)]" />',
     'Library size 19'),
    ('<BrainCircuit size={18} style={{ color: "var(--accent)" }} />\n            </IconButton>',
     '<BrainCircuit size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />\n            </IconButton>',
     'BrainCircuit size 18'),
])

# ── Qibla.tsx ─────────────────────────────────────────────────────────────────
print('\n=== Qibla.tsx ===')
ok2, f2 = patch('src/pages/Qibla.tsx', [
    ('<Compass size={20} className="text-[var(--accent)]" />',
     '<Compass size={20} aria-hidden="true" className="text-[var(--accent)]" />',
     'Compass header'),
    ('<ArrowRight size={15} />\n          رجوع',
     '<ArrowRight size={15} aria-hidden="true" />\n          رجوع',
     'ArrowRight back'),
    ('<Compass size={15} />\n            تفعيل البوصلة',
     '<Compass size={15} aria-hidden="true" />\n            تفعيل البوصلة',
     'Compass button'),
    ('<MapPin size={16} className="text-[var(--accent)]" />',
     '<MapPin size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'MapPin location'),
    ('<RefreshCw size={14} className="animate-spin" />\n            جارٍ تحديد موقعك...',
     '<RefreshCw size={14} aria-hidden="true" className="animate-spin" />\n            جارٍ تحديد موقعك...',
     'RefreshCw loading'),
    ('<RefreshCw size={14} />\n              إعادة المحاولة',
     '<RefreshCw size={14} aria-hidden="true" />\n              إعادة المحاولة',
     'RefreshCw retry'),
    ('<RefreshCw size={13} />\n              تحديث الموقع',
     '<RefreshCw size={13} aria-hidden="true" />\n              تحديث الموقع',
     'RefreshCw update'),
])

# ── QuranVocab.tsx ────────────────────────────────────────────────────────────
print('\n=== QuranVocab.tsx ===')
ok3, f3 = patch('src/pages/QuranVocab.tsx', [
    ('<BookOpen size={48} style={{ color: "var(--accent)", opacity: 0.5 }} />',
     '<BookOpen size={48} aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.5 }} />',
     'BookOpen empty state'),
    ('<ArrowRight size={18} />\n              </button>',
     '<ArrowRight size={18} aria-hidden="true" />\n              </button>',
     'ArrowRight back'),
    ('<Shuffle size={16} />\n              </button>',
     '<Shuffle size={16} aria-hidden="true" />\n              </button>',
     'Shuffle'),
    ('<RotateCcw size={16} />\n              </button>',
     '<RotateCcw size={16} aria-hidden="true" />\n              </button>',
     'RotateCcw'),
    ('<BookOpen size={16} />\n              </button>',
     '<BookOpen size={16} aria-hidden="true" />\n              </button>',
     'BookOpen review mode'),
    ('<Star size={11} />\n            كلمة اليوم',
     '<Star size={11} aria-hidden="true" />\n            كلمة اليوم',
     'Star word of day'),
    ('<Copy size={14} />\n          </button>',
     '<Copy size={14} aria-hidden="true" />\n          </button>',
     'Copy size 14'),
])

# ── Home.tsx ──────────────────────────────────────────────────────────────────
print('\n=== Home.tsx ===')
ok4, f4 = patch('src/pages/Home.tsx', [
    ('<Radio size={14} className="shrink-0" style={radio.playing ? { filter: "drop-shadow(0 0 4px var(--ok))" } : undefined} />',
     '<Radio size={14} aria-hidden="true" className="shrink-0" style={radio.playing ? { filter: "drop-shadow(0 0 4px var(--ok))" } : undefined} />',
     'Radio size 14'),
    ('<Shuffle size={16} />\n                </button>',
     '<Shuffle size={16} aria-hidden="true" />\n                </button>',
     'Shuffle random dhikr'),
    ('<MoreVertical size={16} />\n                    </button>',
     '<MoreVertical size={16} aria-hidden="true" />\n                    </button>',
     'MoreVertical options'),
    ('<ChevronDown size={14} className={cn("transition-transform duration-200", showItems && "rotate-180")} />',
     '<ChevronDown size={14} aria-hidden="true" className={cn("transition-transform duration-200", showItems && "rotate-180")} />',
     'ChevronDown showItems'),
    ('<RotateCw size={16} />\n                    </IconButton>',
     '<RotateCw size={16} aria-hidden="true" />\n                    </IconButton>',
     'RotateCw reset tasbeeh'),
    ('<ChevronDown size={14} className={cn("transition-transform duration-200", dailyWirdExpanded && "rotate-180")} />',
     '<ChevronDown size={14} aria-hidden="true" className={cn("transition-transform duration-200", dailyWirdExpanded && "rotate-180")} />',
     'ChevronDown dailyWird'),
    ('<Copy size={16} />\n                    نسخ',
     '<Copy size={16} aria-hidden="true" />\n                    نسخ',
     'Copy daily wird'),
])

# ── YouTubeCoursePlayer.tsx ───────────────────────────────────────────────────
print('\n=== YouTubeCoursePlayer.tsx ===')
ok5, f5 = patch('src/components/video/YouTubeCoursePlayer.tsx', [
    ('<SkipForward size={28} className="mx-auto mb-3" style={{ color: accent }} />',
     '<SkipForward size={28} aria-hidden="true" className="mx-auto mb-3" style={{ color: accent }} />',
     'SkipForward size 28'),
    ('<Play size={40} className="mx-auto mb-3 opacity-30" />',
     '<Play size={40} aria-hidden="true" className="mx-auto mb-3 opacity-30" />',
     'Play empty state'),
    ('<ArrowRight size={13} />\n              </button>',
     '<ArrowRight size={13} aria-hidden="true" />\n              </button>',
     'ArrowRight close'),
    ('{bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}',
     '{bookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}',
     'BookmarkCheck/Bookmark'),
    ('<SkipBack size={14} />\n                <span>السابق</span>',
     '<SkipBack size={14} aria-hidden="true" />\n                <span>السابق</span>',
     'SkipBack'),
    ('<SkipForward size={14} />\n                <span>التالي</span>',
     '<SkipForward size={14} aria-hidden="true" />\n                <span>التالي</span>',
     'SkipForward size 14'),
    ('<ExternalLink size={13} />\n                <span>يوتيوب</span>',
     '<ExternalLink size={13} aria-hidden="true" />\n                <span>يوتيوب</span>',
     'ExternalLink'),
])

# ── Insights.tsx ──────────────────────────────────────────────────────────────
print('\n=== Insights.tsx ===')
ok6, f6 = patch('src/pages/Insights.tsx', [
    ('<Sparkles size={14} className="text-[var(--accent)]" />',
     '<Sparkles size={14} aria-hidden="true" className="text-[var(--accent)]" />',
     'Sparkles size 14 (both)'),
    ('<FileDown size={16} className="text-[var(--accent)]" />',
     '<FileDown size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'FileDown size 16'),
    ('<FileDown size={14} />\n              {exporting',
     '<FileDown size={14} aria-hidden="true" />\n              {exporting',
     'FileDown size 14'),
    ('{notifPermission === "granted" ? <Bell size={15} className="text-[var(--ok)]" /> : <BellOff size={15} className="opacity-50" />}',
     '{notifPermission === "granted" ? <Bell size={15} aria-hidden="true" className="text-[var(--ok)]" /> : <BellOff size={15} aria-hidden="true" className="opacity-50" />}',
     'Bell/BellOff status'),
    ('<Bell size={14} />\n              {notifPermission',
     '<Bell size={14} aria-hidden="true" />\n              {notifPermission',
     'Bell size 14'),
])

# ── CommandPalette.tsx ────────────────────────────────────────────────────────
print('\n=== CommandPalette.tsx ===')
ok7, f7 = patch('src/components/layout/CommandPalette.tsx', [
    ('<Search size={18} className="opacity-70" />',
     '<Search size={18} aria-hidden="true" className="opacity-70" />',
     'Search size 18'),
    ('icon={<LibraryBig size={16} />}',
     'icon={<LibraryBig size={16} aria-hidden="true" />}',
     'LibraryBig icon prop'),
    ('theme === "dark" ? <Moon size={16} /> : theme === "light" ? <Sun size={16} /> : <Sparkles size={16} />',
     'theme === "dark" ? <Moon size={16} aria-hidden="true" /> : theme === "light" ? <Sun size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />',
     'Moon/Sun/Sparkles theme'),
    ('icon={<Download size={16} />}',
     'icon={<Download size={16} aria-hidden="true" />}',
     'Download icon prop'),
    ('icon={<BookOpen size={16} />}',
     'icon={<BookOpen size={16} aria-hidden="true" />}',
     'BookOpen icon prop'),
])

# ── Ruqyah.tsx ────────────────────────────────────────────────────────────────
print('\n=== Ruqyah.tsx ===')
ok8, f8 = patch('src/pages/Ruqyah.tsx', [
    ('<Copy size={15} className="opacity-70" />',
     '<Copy size={15} aria-hidden="true" className="opacity-70" />',
     'Copy size 15'),
    ('<Shield size={16} className="text-[var(--accent)] shrink-0 opacity-70" />',
     '<Shield size={16} aria-hidden="true" className="text-[var(--accent)] shrink-0 opacity-70" />',
     'Shield size 16'),
    ('{expanded ? <ChevronUp size={15} className="opacity-50" /> : <ChevronDown size={15} className="opacity-50" />}',
     '{expanded ? <ChevronUp size={15} aria-hidden="true" className="opacity-50" /> : <ChevronDown size={15} aria-hidden="true" className="opacity-50" />}',
     'ChevronUp/Down expand'),
    ('<ArrowRight size={18} />\n          </IconButton>',
     '<ArrowRight size={18} aria-hidden="true" />\n          </IconButton>',
     'ArrowRight back'),
    ('<Shield size={20} className="text-[var(--accent)]" />',
     '<Shield size={20} aria-hidden="true" className="text-[var(--accent)]" />',
     'Shield size 20'),
])

# ── HadithBookView.tsx ────────────────────────────────────────────────────────
print('\n=== HadithBookView.tsx ===')
ok9, f9 = patch('src/pages/HadithBookView.tsx', [
    ('<Copy size={13} />\n            </button>',
     '<Copy size={13} aria-hidden="true" />\n            </button>',
     'Copy size 13'),
    ('<Bookmark size={15} className="fill-current" style={{ color: accentColor }} />',
     '<Bookmark size={15} aria-hidden="true" className="fill-current" style={{ color: accentColor }} />',
     'Bookmark fill-current'),
    ('<ArrowRight size={19} className="text-[var(--fg)]" />',
     '<ArrowRight size={19} aria-hidden="true" className="text-[var(--fg)]" />',
     'ArrowRight size 19'),
    ('<BookOpenText size={16} style={{ color: accentColor }} />',
     '<BookOpenText size={16} aria-hidden="true" style={{ color: accentColor }} />',
     'BookOpenText size 16'),
    ('<WifiOff size={10} />\n                    بلا إنترنت',
     '<WifiOff size={10} aria-hidden="true" />\n                    بلا إنترنت',
     'WifiOff size 10'),
])

total_ok = ok1+ok2+ok3+ok4+ok5+ok6+ok7+ok8+ok9
total_fail = f1+f2+f3+f4+f5+f6+f7+f8+f9
print(f'\nTotal: {total_ok} patched, {total_fail} missed')
