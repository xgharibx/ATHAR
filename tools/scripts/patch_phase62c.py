"""Phase 62c — aria-hidden on icons in Quran, CustomAdhkar, HadithMemo, AppShell,
   Sources, Library, PrayerGuide, PrayerWidget, NearbyMosques, Mushaf, LibraryItem,
   AsmaAlHusna, ProphetStories, NotFound, Duas, QuranRadioFab, SeerahTimeline,
   WuduGuide, DailyWisdomCard, DailyCarousel, PrayerCountdown, Category."""
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

# ── Quran.tsx ─────────────────────────────────────────────────────────────────
print('=== Quran.tsx ===')
ok1, f1 = patch('src/pages/Quran.tsx', [
    ('<Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-35 pointer-events-none" />',
     '<Search size={16} aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-35 pointer-events-none" />',
     'Search input icon'),
    ('<BookOpen size={16} style={{ color: "var(--accent)" }} />',
     '<BookOpen size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />',
     'BookOpen size 16'),
    ('<Shuffle size={14} />\n            </button>',
     '<Shuffle size={14} aria-hidden="true" />\n            </button>',
     'Shuffle size 14'),
    ('<Bookmark size={13} />\n                <span className="tabular-nums">',
     '<Bookmark size={13} aria-hidden="true" />\n                <span className="tabular-nums">',
     'Bookmark size 13'),
    ('{bookmarkedSurahs.has(s.id) && <Bookmark size={10} className="shrink-0 opacity-70" style={{ color: "var(--accent)" }} />}',
     '{bookmarkedSurahs.has(s.id) && <Bookmark size={10} aria-hidden="true" className="shrink-0 opacity-70" style={{ color: "var(--accent)" }} />}',
     'Bookmark size 10 conditional'),
])

# ── CustomAdhkar.tsx ──────────────────────────────────────────────────────────
print('\n=== CustomAdhkar.tsx ===')
ok2, f2 = patch('src/pages/CustomAdhkar.tsx', [
    ('<Plus size={14} /> إضافة ذكر',
     '<Plus size={14} aria-hidden="true" /> إضافة ذكر',
     'Plus add dhikr'),
    ('{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}',
     '{expanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}',
     'ChevronUp/Down expand'),
    ('<BookOpen size={13} />\n            فتح',
     '<BookOpen size={13} aria-hidden="true" />\n            فتح',
     'BookOpen open'),
    ('<ArrowRight size={18} />\n        </button>',
     '<ArrowRight size={18} aria-hidden="true" />\n        </button>',
     'ArrowRight back'),
    ('<Plus size={16} />\n          إنشاء حزمة جديدة',
     '<Plus size={16} aria-hidden="true" />\n          إنشاء حزمة جديدة',
     'Plus new pack'),
])

# ── HadithMemo.tsx ────────────────────────────────────────────────────────────
print('\n=== HadithMemo.tsx ===')
ok3, f3 = patch('src/pages/HadithMemo.tsx', [
    ('<BrainCircuit size={19} style={{ color: accentColor }} />',
     '<BrainCircuit size={19} aria-hidden="true" style={{ color: accentColor }} />',
     'BrainCircuit size 19'),
    ('<CheckCircle size={48} style={{ color: accentColor }} />',
     '<CheckCircle size={48} aria-hidden="true" style={{ color: accentColor }} />',
     'CheckCircle empty state'),
    ('<ChevronRight size={20} className="text-[var(--muted)]" />\n            </button>',
     '<ChevronRight size={20} aria-hidden="true" className="text-[var(--muted)]" />\n            </button>',
     'ChevronRight prev'),
    ('<Copy size={14} />\n              </button>',
     '<Copy size={14} aria-hidden="true" />\n              </button>',
     'Copy size 14'),
    ('<ChevronLeft size={20} className="text-[var(--muted)]" />\n            </button>',
     '<ChevronLeft size={20} aria-hidden="true" className="text-[var(--muted)]" />\n            </button>',
     'ChevronLeft next'),
])

# ── AppShell.tsx ──────────────────────────────────────────────────────────────
print('\n=== AppShell.tsx ===')
ok4, f4 = patch('src/components/layout/AppShell.tsx', [
    ('<ChevronLeft size={14} className="opacity-30 shrink-0" />',
     '<ChevronLeft size={14} aria-hidden="true" className="opacity-30 shrink-0" />',
     'ChevronLeft nav'),
    ('{prefs.theme === \'light\' ? <Moon size={16} className="opacity-60" /> : <Sun size={16} className="opacity-60" />}',
     '{prefs.theme === \'light\' ? <Moon size={16} aria-hidden="true" className="opacity-60" /> : <Sun size={16} aria-hidden="true" className="opacity-60" />}',
     'Moon/Sun with opacity'),
    ('<Menu size={18} />\n                    </IconButton>',
     '<Menu size={18} aria-hidden="true" />\n                    </IconButton>',
     'Menu size 18'),
    ('<Search size={18} />\n              </IconButton>',
     '<Search size={18} aria-hidden="true" />\n              </IconButton>',
     'Search size 18'),
    ("{prefs.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}\n              </IconButton>",
     "{prefs.theme === 'light' ? <Moon size={16} aria-hidden=\"true\" /> : <Sun size={16} aria-hidden=\"true\" />}\n              </IconButton>",
     'Moon/Sun no opacity'),
])

# ── Sources.tsx ───────────────────────────────────────────────────────────────
print('\n=== Sources.tsx ===')
ok5, f5 = patch('src/pages/Sources.tsx', [
    ('<Upload size={16} />\n              استيراد حزمة',
     '<Upload size={16} aria-hidden="true" />\n              استيراد حزمة',
     'Upload size 16'),
    ('<ExternalLink size={16} />\n            islambook.com',
     '<ExternalLink size={16} aria-hidden="true" />\n            islambook.com',
     'ExternalLink islambook'),
    ('<Plus size={18} className="text-[var(--accent)]" />',
     '<Plus size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Plus section header'),
    ('<Plus size={16} />\n          حفظ الذكر',
     '<Plus size={16} aria-hidden="true" />\n          حفظ الذكر',
     'Plus save dhikr'),
])

# ── Library.tsx ───────────────────────────────────────────────────────────────
print('\n=== Library.tsx ===')
ok6, f6 = patch('src/pages/Library.tsx', [
    ('<Heart size={15} className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />\n            </IconButton>',
     '<Heart size={15} aria-hidden="true" className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />\n            </IconButton>',
     'Heart size 15'),
    ('<BookOpenText size={19} className="text-[var(--accent)]" />',
     '<BookOpenText size={19} aria-hidden="true" className="text-[var(--accent)]" />',
     'BookOpenText size 19'),
    ('<Search size={40} className="text-[var(--muted)] opacity-20" />',
     '<Search size={40} aria-hidden="true" className="text-[var(--muted)] opacity-20" />',
     'Search empty state'),
    ('<Clock size={22} style={{ color: "#8b5cf6" }} />',
     '<Clock size={22} aria-hidden="true" style={{ color: "#8b5cf6" }} />',
     'Clock size 22'),
    ('<ExternalLink size={16} className="text-[var(--accent)] shrink-0 mt-1" />',
     '<ExternalLink size={16} aria-hidden="true" className="text-[var(--accent)] shrink-0 mt-1" />',
     'ExternalLink source'),
])

# ── PrayerGuide.tsx ───────────────────────────────────────────────────────────
print('\n=== PrayerGuide.tsx ===')
ok7, f7 = patch('src/pages/PrayerGuide.tsx', [
    ('<ArrowRight size={18} />\n              </button>',
     '<ArrowRight size={18} aria-hidden="true" />\n              </button>',
     'ArrowRight back'),
    ('<ChevronUp size={16} style={{ color: isOpen ? "color-mix(in srgb, var(--on-accent) 55%, transparent)" : "var(--accent)" }} />',
     '<ChevronUp size={16} aria-hidden="true" style={{ color: isOpen ? "color-mix(in srgb, var(--on-accent) 55%, transparent)" : "var(--accent)" }} />',
     'ChevronUp expand'),
    ('<ChevronDown size={16} style={{ color: "var(--accent)" }} />',
     '<ChevronDown size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />',
     'ChevronDown collapse'),
    ('<Copy size={14} />\n                    </button>',
     '<Copy size={14} aria-hidden="true" />\n                    </button>',
     'Copy size 14'),
])

# ── PrayerWidget.tsx ──────────────────────────────────────────────────────────
print('\n=== PrayerWidget.tsx ===')
ok8, f8 = patch('src/components/layout/PrayerWidget.tsx', [
    ('<Clock size={16} className="text-[var(--accent)]" />',
     '<Clock size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'Clock size 16'),
    ('<Sunrise size={12} className="text-[#ffd27d]" />',
     '<Sunrise size={12} aria-hidden="true" className="text-[#ffd27d]" />',
     'Sunrise size 12'),
    ('<CloudSun size={12} className="text-[#ffd27d]" />',
     '<CloudSun size={12} aria-hidden="true" className="text-[#ffd27d]" />',
     'CloudSun size 12'),
    ('<ArrowLeft size={16} />\n      </Button>',
     '<ArrowLeft size={16} aria-hidden="true" />\n      </Button>',
     'ArrowLeft size 16'),
])

# ── NearbyMosques.tsx ─────────────────────────────────────────────────────────
print('\n=== NearbyMosques.tsx ===')
ok9, f9 = patch('src/pages/NearbyMosques.tsx', [
    ('<RefreshCw size={14} /> إعادة المحاولة',
     '<RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة',
     'RefreshCw retry (both occurrences)'),
    ('<RefreshCw size={14} /> بحث مجدداً',
     '<RefreshCw size={14} aria-hidden="true" /> بحث مجدداً',
     'RefreshCw search again'),
])

# ── Mushaf.tsx ────────────────────────────────────────────────────────────────
print('\n=== Mushaf.tsx ===')
ok10, f10 = patch('src/pages/Mushaf.tsx', [
    ('icon: <Search size={16} />, active: showSearch,',
     'icon: <Search size={16} aria-hidden="true" />, active: showSearch,',
     'Search icon prop'),
    ('icon: <Languages size={16} />, active: showTranslation,',
     'icon: <Languages size={16} aria-hidden="true" />, active: showTranslation,',
     'Languages icon prop'),
    ('icon: memorizationMode ? <EyeOff size={16} /> : <Eye size={16} />, active: memorizationMode,',
     'icon: memorizationMode ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />, active: memorizationMode,',
     'EyeOff/Eye icon prop'),
])

# ── LibraryItem.tsx ───────────────────────────────────────────────────────────
print('\n=== LibraryItem.tsx ===')
ok11, f11 = patch('src/pages/LibraryItem.tsx', [
    ('<BookOpenText size={18} style={{ color: entry.collectionAccent }} />',
     '<BookOpenText size={18} aria-hidden="true" style={{ color: entry.collectionAccent }} />',
     'BookOpenText size 18'),
    ('<Heart size={15} className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />\n            </IconButton>',
     '<Heart size={15} aria-hidden="true" className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />\n            </IconButton>',
     'Heart size 15'),
    ('<ExternalLink size={15} />\n            تحقق في الدرر',
     '<ExternalLink size={15} aria-hidden="true" />\n            تحقق في الدرر',
     'ExternalLink size 15'),
])

# ── AsmaAlHusna.tsx ───────────────────────────────────────────────────────────
print('\n=== AsmaAlHusna.tsx ===')
ok12, f12 = patch('src/pages/AsmaAlHusna.tsx', [
    ('<Star size={10} className="fill-current" style={{ color: isExpanded ? "var(--on-accent)" : "var(--accent)" }} />',
     '<Star size={10} aria-hidden="true" className="fill-current" style={{ color: isExpanded ? "var(--on-accent)" : "var(--accent)" }} />',
     'Star size 10'),
    ('<Brain size={14} />\n                </button>',
     '<Brain size={14} aria-hidden="true" />\n                </button>',
     'Brain size 14'),
    ('<Heart size={14} fill={isFav ? "#ef4444" : "none"} />\n                </button>',
     '<Heart size={14} aria-hidden="true" fill={isFav ? "#ef4444" : "none"} />\n                </button>',
     'Heart size 14'),
])

# ── ProphetStories.tsx ────────────────────────────────────────────────────────
print('\n=== ProphetStories.tsx ===')
ok13, f13 = patch('src/pages/ProphetStories.tsx', [
    ('{open ? (\n            <ChevronUp size={18} style={{ color: "var(--accent)" }} />\n          ) : (\n            <ChevronDown size={18} style={{ color: "var(--accent)" }} />\n          )}',
     '{open ? (\n            <ChevronUp size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />\n          ) : (\n            <ChevronDown size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />\n          )}',
     'ChevronUp/Down open'),
    ('<Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />\n              <input',
     '<Search size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />\n              <input',
     'Search input icon'),
])

# ── NotFound.tsx ──────────────────────────────────────────────────────────────
print('\n=== NotFound.tsx ===')
ok14, f14 = patch('src/pages/NotFound.tsx', [
    ('<House size={16} />\n                الع',
     '<House size={16} aria-hidden="true" />\n                الع',
     'House home'),
    ('<Search size={16} />\n              البحث في الأذكار',
     '<Search size={16} aria-hidden="true" />\n              البحث في الأذكار',
     'Search size 16'),
    ('<ArrowRight size={16} />\n              الصفحة السابقة',
     '<ArrowRight size={16} aria-hidden="true" />\n              الصفحة السابقة',
     'ArrowRight back'),
])

# ── Duas.tsx ──────────────────────────────────────────────────────────────────
print('\n=== Duas.tsx ===')
ok15, f15 = patch('src/pages/Duas.tsx', [
    ('{copied === dua.id ? <Check size={15} /> : <Copy size={15} />}',
     '{copied === dua.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}',
     'Check/Copy dua'),
    ('<Heart size={14} fill={isFav ? "#ef4444" : "none"} />\n                  </button>',
     '<Heart size={14} aria-hidden="true" fill={isFav ? "#ef4444" : "none"} />\n                  </button>',
     'Heart dua fav'),
])

# ── QuranRadioFab.tsx ─────────────────────────────────────────────────────────
print('\n=== QuranRadioFab.tsx ===')
ok16, f16 = patch('src/components/layout/QuranRadioFab.tsx', [
    ('<Radio size={22} style={radio.playing ? { color: "var(--ok)" } : undefined} />',
     '<Radio size={22} aria-hidden="true" style={radio.playing ? { color: "var(--ok)" } : undefined} />',
     'Radio FAB size 22'),
    ('<Radio size={16} style={{ color: "var(--accent)" }} />',
     '<Radio size={16} aria-hidden="true" style={{ color: "var(--accent)" }} />',
     'Radio size 16'),
])

# ── SeerahTimeline.tsx ────────────────────────────────────────────────────────
print('\n=== SeerahTimeline.tsx ===')
ok17, f17 = patch('src/pages/SeerahTimeline.tsx', [
    ('<Clock size={19} className="text-[var(--accent)]" />',
     '<Clock size={19} aria-hidden="true" className="text-[var(--accent)]" />',
     'Clock size 19'),
    ('<Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />\n            <input',
     '<Search size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />\n            <input',
     'Search input icon'),
])

# ── WuduGuide.tsx ─────────────────────────────────────────────────────────────
print('\n=== WuduGuide.tsx ===')
ok18, f18 = patch('src/pages/WuduGuide.tsx', [
    ('<ArrowRight size={18} />\n              </button>',
     '<ArrowRight size={18} aria-hidden="true" />\n              </button>',
     'ArrowRight back'),
    ('<Circle size={22} style={{ color: "var(--accent)", opacity: 0.5 }} />',
     '<Circle size={22} aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.5 }} />',
     'Circle step'),
])

# ── DailyWisdomCard.tsx ───────────────────────────────────────────────────────
print('\n=== DailyWisdomCard.tsx ===')
ok19, f19 = patch('src/components/ui/DailyWisdomCard.tsx', [
    ('<Copy size={14} />\n            </IconButton>',
     '<Copy size={14} aria-hidden="true" />\n            </IconButton>',
     'Copy size 14'),
])

# ── DailyCarousel.tsx ─────────────────────────────────────────────────────────
print('\n=== DailyCarousel.tsx ===')
ok20, f20 = patch('src/components/ui/DailyCarousel.tsx', [
    ('<BookOpen size={12} />\n                    اقرأ في سياقها',
     '<BookOpen size={12} aria-hidden="true" />\n                    اقرأ في سياقها',
     'BookOpen size 12'),
])

# ── PrayerCountdown.tsx ───────────────────────────────────────────────────────
print('\n=== PrayerCountdown.tsx ===')
ok21, f21 = patch('src/components/layout/PrayerCountdown.tsx', [
    ('<Bell size={14} className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"} />',
     '<Bell size={14} aria-hidden="true" className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"} />',
     'Bell size 14'),
])

# ── Category.tsx ──────────────────────────────────────────────────────────────
print('\n=== Category.tsx ===')
ok22, f22 = patch('src/pages/Category.tsx', [
    ('<AlertTriangle size={18} />\n            القسم غير موجود',
     '<AlertTriangle size={18} aria-hidden="true" />\n            القسم غير موجود',
     'AlertTriangle'),
])

total_ok = ok1+ok2+ok3+ok4+ok5+ok6+ok7+ok8+ok9+ok10+ok11+ok12+ok13+ok14+ok15+ok16+ok17+ok18+ok19+ok20+ok21+ok22
total_fail = f1+f2+f3+f4+f5+f6+f7+f8+f9+f10+f11+f12+f13+f14+f15+f16+f17+f18+f19+f20+f21+f22
print(f'\nTotal: {total_ok} patched, {total_fail} missed')
