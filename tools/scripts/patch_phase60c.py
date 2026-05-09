"""Phase 60c — aria-hidden on Mushaf.tsx icons (non-X icons)."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(BASE, 'src/pages/Mushaf.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

PATCHES = [
    # ArrowRight in back button
    ('          <ArrowRight size={18} />',
     '          <ArrowRight size={18} aria-hidden="true" />',
     'ArrowRight back button'),

    # ZoomOut inline in toolbar (font scale -)
    ('aria-label="تصغير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}><ZoomOut size={13} /></button>',
     'aria-label="تصغير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}><ZoomOut size={13} aria-hidden="true" /></button>',
     'ZoomOut toolbar'),

    # ZoomIn inline in toolbar (font scale +)
    ('aria-label="تكبير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}><ZoomIn size={13} /></button>',
     'aria-label="تكبير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}><ZoomIn size={13} aria-hidden="true" /></button>',
     'ZoomIn toolbar'),

    # Settings button icon
    ('          aria-label="إعدادات"\n          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}\n        >\n          <Settings size={16} />',
     '          aria-label="إعدادات"\n          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}\n        >\n          <Settings size={16} aria-hidden="true" />',
     'Settings icon'),

    # MoreVertical button icon (toolbar)
    ('          aria-label="المزيد"\n          onClick={(e) => { e.stopPropagation(); setShowMoreSheet((v) => !v); }}\n        >\n          <MoreVertical size={17} />',
     '          aria-label="المزيد"\n          onClick={(e) => { e.stopPropagation(); setShowMoreSheet((v) => !v); }}\n        >\n          <MoreVertical size={17} aria-hidden="true" />',
     'MoreVertical toolbar'),

    # Search icon in search bar (decorative before input)
    ('          <Search size={14} className="shrink-0 opacity-50" />',
     '          <Search size={14} aria-hidden="true" className="shrink-0 opacity-50" />',
     'Search bar icon'),

    # Timer in sleep chip (has aria-label on parent)
    ('          <Timer size={11} />',
     '          <Timer size={11} aria-hidden="true" />',
     'Timer sleep chip'),

    # ChevronLeft in next-page button
    ('              aria-keyshortcuts="ArrowLeft"\n            >\n              <ChevronLeft size={15} />',
     '              aria-keyshortcuts="ArrowLeft"\n            >\n              <ChevronLeft size={15} aria-hidden="true" />',
     'ChevronLeft next page'),

    # ChevronRight in prev-page button
    ('              aria-keyshortcuts="ArrowRight"\n            >\n              <span>السابقة</span>\n              <ChevronRight size={15} />',
     '              aria-keyshortcuts="ArrowRight"\n            >\n              <span>السابقة</span>\n              <ChevronRight size={15} aria-hidden="true" />',
     'ChevronRight prev page'),

    # Copy in action bar (has aria-label "نسخ الآية")
    ('          <button type="button" className="mushaf-action-btn" onClick={doCopy} aria-label="نسخ الآية">\n            <Copy size={18} />',
     '          <button type="button" className="mushaf-action-btn" onClick={doCopy} aria-label="نسخ الآية">\n            <Copy size={18} aria-hidden="true" />',
     'Copy action bar'),

    # Bookmark in action bar (has aria-label "علامة")
    ('            aria-label="علامة"\n          >\n            <Bookmark size={18} fill={isSelBookmarked ? "currentColor" : "none"} />',
     '            aria-label="علامة"\n          >\n            <Bookmark size={18} aria-hidden="true" fill={isSelBookmarked ? "currentColor" : "none"} />',
     'Bookmark action bar'),

    # VolumeX/Volume2 in play button (conditional)
    ('            {playingKey === selKey ? <VolumeX size={18} /> : <Volume2 size={18} />}',
     '            {playingKey === selKey ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}',
     'VolumeX/Volume2 action bar'),

    # Pencil in note button (has aria-label "تدبّر")
    ('            aria-label="تدبّر"\n          >\n            <Pencil size={18} />',
     '            aria-label="تدبّر"\n          >\n            <Pencil size={18} aria-hidden="true" />',
     'Pencil note button'),

    # Pause/Play in audio player
    ('            {playingKey ? <Pause size={15} /> : <Play size={15} />}',
     '            {playingKey ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}',
     'Pause/Play audio player'),

    # Mic2 in reciter button (has text label)
    ('            aria-label="اختيار القارئ"\n          >\n            <Mic2 size={12} style={{ opacity: 0.6, flexShrink: 0 }} />',
     '            aria-label="اختيار القارئ"\n          >\n            <Mic2 size={12} aria-hidden="true" style={{ opacity: 0.6, flexShrink: 0 }} />',
     'Mic2 reciter selector'),

    # ChevronDown in reciter selector
    ('            <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} />',
     '            <ChevronDown size={12} aria-hidden="true" style={{ opacity: 0.5, flexShrink: 0 }} />',
     'ChevronDown reciter selector'),

    # CheckCircle2 in download button (conditional)
    ('                      {dlState === "done"\n                        ? <CheckCircle2 size={11} />',
     '                      {dlState === "done"\n                        ? <CheckCircle2 size={11} aria-hidden="true" />',
     'CheckCircle2 download done'),

    # Download in download button (conditional)
    ('                          : <Download size={11} />}',
     '                          : <Download size={11} aria-hidden="true" />}',
     'Download icon per-reciter'),

    # Mic2 in reciter chip (has text label)
    ('      <Mic2 size={14} />\n      {r.label}',
     '      <Mic2 size={14} aria-hidden="true" />\n      {r.label}',
     'Mic2 reciter chip'),

    # Copy in tafsir header (has aria-label "نسخ")
    ('                  aria-label="نسخ"\n                  onClick={() => {\n                    const ayahTxt',
     '                  aria-label="نسخ"\n                  onClick={() => {\n                    const ayahTxt',
     # This one is on the button tag not the icon; let me target the icon instead
     'Copy tafsir header SKIP'),
]

# Fix the Copy tafsir header patch - target the icon
PATCHES[-1] = (
    '                  aria-label="نسخ"\n                  onClick={() => {\n                    const ayahTxt = `${tafsirItem.text} ﴿${tafsirItem.displayAyah}﴾`;\n                    const tafseerTxt = inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ?? "";\n                    const src = inlineTafseerSource === "muyassar" ? "التفسير الميسر" : "تفسير الجلالين";\n                    navigator.clipboard.writeText(`${ayahTxt}\\n\\n${src}:\\n${tafseerTxt}`).then(() => toast.success("تم النسخ ✓")).catch(() => {});\n                  }}\n                >\n                  <Copy size={15} />',
    '                  aria-label="نسخ"\n                  onClick={() => {\n                    const ayahTxt = `${tafsirItem.text} ﴿${tafsirItem.displayAyah}﴾`;\n                    const tafseerTxt = inlineTafseerData[tafsirItem.surahId]?.[tafsirItem.originalAyah] ?? "";\n                    const src = inlineTafseerSource === "muyassar" ? "التفسير الميسر" : "تفسير الجلالين";\n                    navigator.clipboard.writeText(`${ayahTxt}\\n\\n${src}:\\n${tafseerTxt}`).then(() => toast.success("تم النسخ ✓")).catch(() => {});\n                  }}\n                >\n                  <Copy size={15} aria-hidden="true" />',
    'Copy tafsir header icon'
)

# Settings sheet ZoomOut/ZoomIn buttons
PATCHES += [
    ('aria-label="تصغير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(-0.1)}><ZoomOut size={14} /></button>',
     'aria-label="تصغير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(-0.1)}><ZoomOut size={14} aria-hidden="true" /></button>',
     'ZoomOut settings sheet'),

    ('aria-label="تكبير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(0.1)}><ZoomIn size={14} /></button>',
     'aria-label="تكبير الخط" className="mushaf-btn-secondary" onClick={() => bumpFont(0.1)}><ZoomIn size={14} aria-hidden="true" /></button>',
     'ZoomIn settings sheet'),

    # Info icon with toggle button (inline with text)
    ('              <button type="button"\n                onClick={() => setShowSurahInfo((v) => !v)}\n                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"\n              >\n                <Info size={13} />',
     '              <button type="button"\n                onClick={() => setShowSurahInfo((v) => !v)}\n                className="flex items-center gap-1.5 text-xs opacity-55 hover:opacity-90 transition mb-2"\n              >\n                <Info size={13} aria-hidden="true" />',
     'Info surah info button'),

    # Download in page audio button (with text)
    ('              >\n                <Download size={14} />\n                {cacheProgress',
     '              >\n                <Download size={14} aria-hidden="true" />\n                {cacheProgress',
     'Download page audio'),

    # Download in tajweed data button (with text)
    ('              >\n                <Download size={14} />\n                {tajweedDownloadProgress',
     '              >\n                <Download size={14} aria-hidden="true" />\n                {tajweedDownloadProgress',
     'Download tajweed'),

    # Timer in sleep timer section label
    ('                <Timer size={12} />\n                مؤقت النوم',
     '                <Timer size={12} aria-hidden="true" />\n                مؤقت النوم',
     'Timer sleep label'),

    # Radio in section label
    ('                <span className="text-xs opacity-50 flex items-center gap-1"><Radio size={12} />راديو القرآن</span>',
     '                <span className="text-xs opacity-50 flex items-center gap-1"><Radio size={12} aria-hidden="true" />راديو القرآن</span>',
     'Radio label'),

    # SlidersHorizontal in section label
    ('                <span className="text-xs opacity-50 flex items-center gap-1"><SlidersHorizontal size={12} />المعادل الصوتي</span>',
     '                <span className="text-xs opacity-50 flex items-center gap-1"><SlidersHorizontal size={12} aria-hidden="true" />المعادل الصوتي</span>',
     'SlidersHorizontal label'),

    # MoreVertical in jump button (span wraps it)
    ('              <span className="opacity-55"><MoreVertical size={16} /></span>',
     '              <span className="opacity-55"><MoreVertical size={16} aria-hidden="true" /></span>',
     'MoreVertical jump button'),
]

ok = 0
fail = 0

for old, new, label in PATCHES:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'OK  [{label}]')
        ok += 1
    else:
        print(f'MISS[{label}]')
        fail += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n{ok} patched, {fail} missed')
