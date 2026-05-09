"""Phase 60b — HadithReader icons + VideoLibrary search toggle + PrayerTimes nav icons."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PATCHES = [
    # VideoLibrary.tsx — toggle button needs aria-label + icons need aria-hidden
    ('src/pages/VideoLibrary.tsx',
     '''            <button
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setQ("");
              }}
              className={cn(
                "w-11 h-11 rounded-2xl glass border border-[var(--stroke)] flex items-center justify-center shrink-0 press-effect transition-all",
                searchOpen && "bg-accent-20 border-accent-50",
              )}
            >
              {searchOpen ? <X size={17} /> : <Search size={17} />}
            </button>''',
     '''            <button
              type="button"
              aria-label={searchOpen ? "إغلاق البحث" : "بحث"}
              aria-pressed={searchOpen}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setQ("");
              }}
              className={cn(
                "w-11 h-11 rounded-2xl glass border border-[var(--stroke)] flex items-center justify-center shrink-0 press-effect transition-all",
                searchOpen && "bg-accent-20 border-accent-50",
              )}
            >
              {searchOpen ? <X size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            </button>''',
     'VideoLibrary search toggle aria-label + aria-pressed'),

    # HadithReader.tsx — ArrowRight back button icon
    ('src/pages/HadithReader.tsx',
     '              <ArrowRight size={19} className="text-[var(--fg)]" />',
     '              <ArrowRight size={19} aria-hidden="true" className="text-[var(--fg)]" />',
     'HadithReader ArrowRight back'),

    # HadithReader.tsx — BookOpenText header icon beside span text
    ('src/pages/HadithReader.tsx',
     '                <BookOpenText size={15} style={{ color: accentColor }} />',
     '                <BookOpenText size={15} aria-hidden="true" style={{ color: accentColor }} />',
     'HadithReader BookOpenText'),

    # HadithReader.tsx — BrainCircuit in IconButton
    ('src/pages/HadithReader.tsx',
     '              <BrainCircuit size={18} style={{ color: isMemoCard ? accentColor : "var(--muted)" }} />',
     '              <BrainCircuit size={18} aria-hidden="true" style={{ color: isMemoCard ? accentColor : "var(--muted)" }} />',
     'HadithReader BrainCircuit'),

    # HadithReader.tsx — Bookmark in IconButton
    ('src/pages/HadithReader.tsx',
     '              <Bookmark size={18} className={isBookmarked ? "fill-current" : ""} style={{ color: isBookmarked ? accentColor : "var(--muted)" }} />',
     '              <Bookmark size={18} aria-hidden="true" className={isBookmarked ? "fill-current" : ""} style={{ color: isBookmarked ? accentColor : "var(--muted)" }} />',
     'HadithReader Bookmark'),

    # HadithReader.tsx — Copy in IconButton (inline)
    ('src/pages/HadithReader.tsx',
     '<IconButton aria-label="نسخ" onClick={copyText}><Copy size={16} className="text-[var(--muted)]" /></IconButton>',
     '<IconButton aria-label="نسخ" onClick={copyText}><Copy size={16} aria-hidden="true" className="text-[var(--muted)]" /></IconButton>',
     'HadithReader Copy'),

    # HadithReader.tsx — Share2 in IconButton (inline)
    ('src/pages/HadithReader.tsx',
     '<IconButton aria-label="مشاركة" onClick={shareText}><Share2 size={16} className="text-[var(--muted)]" /></IconButton>',
     '<IconButton aria-label="مشاركة" onClick={shareText}><Share2 size={16} aria-hidden="true" className="text-[var(--muted)]" /></IconButton>',
     'HadithReader Share2'),

    # HadithReader.tsx — StickyNote in IconButton
    ('src/pages/HadithReader.tsx',
     '              <StickyNote size={16} className={existingNote ? "fill-current" : ""} style={{ color: existingNote ? accentColor : "var(--muted)" }} />',
     '              <StickyNote size={16} aria-hidden="true" className={existingNote ? "fill-current" : ""} style={{ color: existingNote ? accentColor : "var(--muted)" }} />',
     'HadithReader StickyNote'),

    # HadithReader.tsx — Hash in badge span
    ('src/pages/HadithReader.tsx',
     '                      <Hash size={12} />',
     '                      <Hash size={12} aria-hidden="true" />',
     'HadithReader Hash badge'),

    # HadithReader.tsx — Check in save button
    ('src/pages/HadithReader.tsx',
     '                <Check size={12} /> حفظ',
     '                <Check size={12} aria-hidden="true" /> حفظ',
     'HadithReader Check save'),

    # PrayerTimes.tsx — ChevronRight/Left in month navigation (tracker)
    ('src/pages/PrayerTimes.tsx',
     '''        <button type="button" aria-label="الشهر السابق" onClick={prev} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronRight size={16} /></button>
        <div className="font-semibold text-sm">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" aria-label="الشهر التالي" onClick={next} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronLeft size={16} /></button>''',
     '''        <button type="button" aria-label="الشهر السابق" onClick={prev} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronRight size={16} aria-hidden="true" /></button>
        <div className="font-semibold text-sm">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" aria-label="الشهر التالي" onClick={next} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronLeft size={16} aria-hidden="true" /></button>''',
     'PrayerTimes ChevronR/L tracker'),

    # PrayerTimes.tsx — ChevronRight/Left in month navigation (monthly tracker, second block)
    ('src/pages/PrayerTimes.tsx',
     '''        <button type="button" aria-label="الشهر السابق" onClick={prev} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronRight size={16} /></button>
        <div className="font-semibold text-sm text-center">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" aria-label="الشهر التالي" onClick={next} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronLeft size={16} /></button>''',
     '''        <button type="button" aria-label="الشهر السابق" onClick={prev} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronRight size={16} aria-hidden="true" /></button>
        <div className="font-semibold text-sm text-center">{MONTH_NAMES[viewMonth - 1]} {viewYear}</div>
        <button type="button" aria-label="الشهر التالي" onClick={next} className="p-2 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)]"><ChevronLeft size={16} aria-hidden="true" /></button>''',
     'PrayerTimes ChevronR/L monthly'),

    # PrayerTimes.tsx — Plus in "رفع ملف MP3" button
    ('src/pages/PrayerTimes.tsx',
     '              <Plus size={14} /> رفع ملف MP3',
     '              <Plus size={14} aria-hidden="true" /> رفع ملف MP3',
     'PrayerTimes Plus MP3 upload'),

    # PrayerTimes.tsx — Plus in "إضافة مدينة" button
    ('src/pages/PrayerTimes.tsx',
     '          <Plus size={13} /> إضافة مدينة',
     '          <Plus size={13} aria-hidden="true" /> إضافة مدينة',
     'PrayerTimes Plus add city'),

    # PrayerTimes.tsx — RefreshCw in "تحديث المواقيت" button
    ('src/pages/PrayerTimes.tsx',
     '            <RefreshCw size={15} className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />\n            تحديث المواقيت',
     '            <RefreshCw size={15} aria-hidden="true" className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />\n            تحديث المواقيت',
     'PrayerTimes RefreshCw retry'),

    # PrayerTimes.tsx — Compass in aria-labeled button
    ('src/pages/PrayerTimes.tsx',
     '          <Button variant="secondary" size="sm" aria-label="القبلة" onClick={() => navigate("/qibla")}>\n            <Compass size={15} />\n          </Button>',
     '          <Button variant="secondary" size="sm" aria-label="القبلة" onClick={() => navigate("/qibla")}>\n            <Compass size={15} aria-hidden="true" />\n          </Button>',
     'PrayerTimes Compass'),

    # PrayerTimes.tsx — MapPin in aria-labeled button
    ('src/pages/PrayerTimes.tsx',
     '          <Button variant="secondary" size="sm" aria-label="مساجد" onClick={() => navigate("/mosques")}>\n            <MapPin size={15} />\n          </Button>',
     '          <Button variant="secondary" size="sm" aria-label="مساجد" onClick={() => navigate("/mosques")}>\n            <MapPin size={15} aria-hidden="true" />\n          </Button>',
     'PrayerTimes MapPin'),

    # PrayerTimes.tsx — RefreshCw in aria-labeled button
    ('src/pages/PrayerTimes.tsx',
     '          <Button variant="secondary" size="sm" aria-label="تحديث" onClick={() => void refreshPrayerTimes()} disabled={manualRefreshing || prayerTimes.isFetching}>\n            <RefreshCw size={15} className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />\n          </Button>',
     '          <Button variant="secondary" size="sm" aria-label="تحديث" onClick={() => void refreshPrayerTimes()} disabled={manualRefreshing || prayerTimes.isFetching}>\n            <RefreshCw size={15} aria-hidden="true" className={manualRefreshing || prayerTimes.isFetching ? "animate-spin" : ""} />\n          </Button>',
     'PrayerTimes RefreshCw update'),

    # PrayerTimes.tsx — ArrowRight in aria-labeled back button
    ('src/pages/PrayerTimes.tsx',
     '          <Button variant="outline" size="sm" aria-label="رجوع" onClick={() => navigate(-1)}>\n            <ArrowRight size={15} />\n          </Button>',
     '          <Button variant="outline" size="sm" aria-label="رجوع" onClick={() => navigate(-1)}>\n            <ArrowRight size={15} aria-hidden="true" />\n          </Button>',
     'PrayerTimes ArrowRight back'),

    # PrayerTimes.tsx — TimerReset inline with text
    ('src/pages/PrayerTimes.tsx',
     '              <TimerReset size={12} /> يتم عرض آخر نسخة محفوظة بدون اتصال.',
     '              <TimerReset size={12} aria-hidden="true" /> يتم عرض آخر نسخة محفوظة بدون اتصال.',
     'PrayerTimes TimerReset'),

    # PrayerTimes.tsx — Check in prayer done indicator
    ('src/pages/PrayerTimes.tsx',
     '                    {prayed && <Check size={16} strokeWidth={3} />}',
     '                    {prayed && <Check size={16} aria-hidden="true" strokeWidth={3} />}',
     'PrayerTimes Check prayer done'),
]

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
            print(f'OK  [{label}]')
            ok += 1
        else:
            print(f'MISS[{label}] — old string not found')
            fail += 1
    except Exception as e:
        print(f'ERR [{label}]: {e}')
        fail += 1

print(f'\n{ok} patched, {fail} missed')
