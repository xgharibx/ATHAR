"""Phase 60a — aria-hidden on all X/close icons across pages and components."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PATCHES = [
    # Companions.tsx line ~149
    ('src/pages/Companions.tsx',
     '<X size={13} />',
     '<X size={13} aria-hidden="true" />',
     'Companions X icon'),

    # HadithReader.tsx line ~415
    ('src/pages/HadithReader.tsx',
     '                <X size={14} />\n              </button>',
     '                <X size={14} aria-hidden="true" />\n              </button>',
     'HadithReader X dialog close'),

    # Mushaf.tsx — all 7 X icons
    ('src/pages/Mushaf.tsx',
     '<X size={14} />\n          </button>\n        </div>\n      )}',
     '<X size={14} aria-hidden="true" />\n          </button>\n        </div>\n      )}',
     'Mushaf X in-page-search'),

    ('src/pages/Mushaf.tsx',
     '            aria-label="إغلاق"\n          >\n            <X size={18} />',
     '            aria-label="إغلاق"\n          >\n            <X size={18} aria-hidden="true" />',
     'Mushaf X sheet close 1462'),

    ('src/pages/Mushaf.tsx',
     '            aria-label="إخفاء"\n          >\n            <X size={14} />',
     '            aria-label="إخفاء"\n          >\n            <X size={14} aria-hidden="true" />',
     'Mushaf X hide 1513'),

    ('src/pages/Mushaf.tsx',
     '                aria-label="إغلاق"\n              >\n                <X size={16} />',
     '                aria-label="إغلاق"\n              >\n                <X size={16} aria-hidden="true" />',
     'Mushaf X close 1613'),

    ('src/pages/Mushaf.tsx',
     'onClick={() => setTafsirItem(null)} aria-label="إغلاق">\n                  <X size={15} />',
     'onClick={() => setTafsirItem(null)} aria-label="إغلاق">\n                  <X size={15} aria-hidden="true" />',
     'Mushaf X tafsir 1755'),

    ('src/pages/Mushaf.tsx',
     'aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowSettings(false)}><X size={16} /></button>',
     'aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowSettings(false)}><X size={16} aria-hidden="true" /></button>',
     'Mushaf X settings 1846'),

    ('src/pages/Mushaf.tsx',
     'aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowMoreSheet(false)}><X size={16} /></button>',
     'aria-label="إغلاق" className="mushaf-icon-close" onClick={() => setShowMoreSheet(false)}><X size={16} aria-hidden="true" /></button>',
     'Mushaf X more sheet 2179'),

    # PrayerTimes.tsx line ~233 (city card X) and ~293 (dialog X)
    ('src/pages/PrayerTimes.tsx',
     '          <X size={13} />\n        </button>',
     '          <X size={13} aria-hidden="true" />\n        </button>',
     'PrayerTimes X city remove'),

    ('src/pages/PrayerTimes.tsx',
     'aria-label="إغلاق" onClick={onClose} className="opacity-50 hover:opacity-80 transition-opacity p-1"><X size={18} /></button>',
     'aria-label="إغلاق" onClick={onClose} className="opacity-50 hover:opacity-80 transition-opacity p-1"><X size={18} aria-hidden="true" /></button>',
     'PrayerTimes X settings dialog'),

    # ProphetStories.tsx line ~220
    ('src/pages/ProphetStories.tsx',
     '                  <X size={13} />\n                </button>',
     '                  <X size={13} aria-hidden="true" />\n                </button>',
     'ProphetStories X clear search'),

    # Quran.tsx line ~328
    ('src/pages/Quran.tsx',
     '                <X size={14} />\n              </button>',
     '                <X size={14} aria-hidden="true" />\n              </button>',
     'Quran X clear search'),

    # Search.tsx line ~208
    ('src/pages/Search.tsx',
     '            <IconButton aria-label="مسح" onClick={() => setQ("")}>\n              <X size={16} />\n            </IconButton>',
     '            <IconButton aria-label="مسح" onClick={() => setQ("")}>\n              <X size={16} aria-hidden="true" />\n            </IconButton>',
     'Search X clear'),

    # SeerahTimeline.tsx line ~114
    ('src/pages/SeerahTimeline.tsx',
     '              <X size={13} />\n              </button>',
     '              <X size={13} aria-hidden="true" />\n              </button>',
     'SeerahTimeline X clear search'),

    # DhikrList.tsx line ~698
    ('src/components/dhikr/DhikrList.tsx',
     '                  aria-label="إغلاق"\n                >\n                  <X size={16} />',
     '                  aria-label="إغلاق"\n                >\n                  <X size={16} aria-hidden="true" />',
     'DhikrList X close'),

    # AppShell.tsx line ~298
    ('src/components/layout/AppShell.tsx',
     '              aria-label="إغلاق"\n            >\n              <X size={16} className="opacity-60" />',
     '              aria-label="إغلاق"\n            >\n              <X size={16} aria-hidden="true" className="opacity-60" />',
     'AppShell X close'),

    # QuranRadioFab.tsx line ~100
    ('src/components/layout/QuranRadioFab.tsx',
     '            aria-label="إغلاق"\n          >\n            <X size={14} />',
     '            aria-label="إغلاق"\n          >\n            <X size={14} aria-hidden="true" />',
     'QuranRadioFab X close'),
]

import os
BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ok = 0
fail = 0

for rel_path, old, new, label in PATCHES:
    path = os.path.join(BASE, rel_path)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if old in content:
            content = content.replace(old, new, 1)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'OK  [{label}] {rel_path}')
            ok += 1
        else:
            print(f'MISS[{label}] {rel_path} — old string not found')
            fail += 1
    except Exception as e:
        print(f'ERR [{label}] {rel_path}: {e}')
        fail += 1

print(f'\n{ok} patched, {fail} missed')
