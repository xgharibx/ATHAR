"""Phase 56d: Add aria-hidden to decorative ArrowUpRight icons + role=list/aria-pressed in Favorites."""
import pathlib, re

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

def patch(path, replacements):
    f = root / path
    src = f.read_text(encoding="utf-8")
    for old, new, label in replacements:
        if old in src:
            src = src.replace(old, new, 1)
            print(f"  patched {label}")
        else:
            print(f"  SKIP: {label} pattern not found")
    f.write_text(src, encoding="utf-8")

# ── Favorites.tsx ─────────────────────────────────────────────────────────────
patch("src/pages/Favorites.tsx", [
    # 1. ArrowUpRight in dhikr card button
    (
        '<ArrowUpRight size={18} className="opacity-60 shrink-0 mt-0.5" />',
        '<ArrowUpRight size={18} className="opacity-60 shrink-0 mt-0.5" aria-hidden="true" />',
        "Favorites: dhikr ArrowUpRight aria-hidden"
    ),
    # 2. ArrowUpRight in hadith card button
    (
        '<ArrowUpRight size={14} className="opacity-55 shrink-0 mr-auto" />',
        '<ArrowUpRight size={14} className="opacity-55 shrink-0 mr-auto" aria-hidden="true" />',
        "Favorites: hadith ArrowUpRight aria-hidden"
    ),
    # 3. Book tab buttons — aria-pressed
    (
        '                      <button type="button"\n                        key={bk}\n                        onClick={() => setSelectedBmBookKey(bk)}\n                        className={[\n                          "shrink-0 text-xs px-3 py-1.5 rounded-full border transition font-arabic whitespace-nowrap min-h-[32px]",\n                          selectedBmBookKey === bk\n                            ? "border-transparent"\n                            : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                        ].join(" ")}\n                        style={selectedBmBookKey === bk ? { background: book?.color ?? "var(--accent)", color: contrastText(book?.color ?? "#ffd780") } : {}}',
        '                      <button type="button"\n                        key={bk}\n                        onClick={() => setSelectedBmBookKey(bk)}\n                        aria-pressed={selectedBmBookKey === bk}\n                        className={[\n                          "shrink-0 text-xs px-3 py-1.5 rounded-full border transition font-arabic whitespace-nowrap min-h-[32px]",\n                          selectedBmBookKey === bk\n                            ? "border-transparent"\n                            : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                        ].join(" ")}\n                        style={selectedBmBookKey === bk ? { background: book?.color ?? "var(--accent)", color: contrastText(book?.color ?? "#ffd780") } : {}}',
        "Favorites: book tab buttons aria-pressed"
    ),
    # 4. Dhikr items outer container role=list
    (
        '          <div className="space-y-5">\n            {grouped.map((group) => {',
        '          <div className="space-y-5" role="list" aria-label="الأذكار المفضلة">\n            {grouped.map((group) => {',
        "Favorites: dhikr outer role=list"
    ),
    # 5. Per-group items role=list
    (
        '                  <div className="space-y-2">\n                    {group.items.map((r: FlatDhikr) => (',
        '                  <div className="space-y-2" role="list">\n                    {group.items.map((r: FlatDhikr) => (',
        "Favorites: group items role=list"
    ),
    # 6. Dhikr item card role=listitem
    (
        '                      <div\n                        key={r.key}\n                        className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-start justify-between gap-3 press-effect glass-hover cv-auto"',
        '                      <div\n                        key={r.key}\n                        role="listitem"\n                        className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-start justify-between gap-3 press-effect glass-hover cv-auto"',
        "Favorites: dhikr item role=listitem"
    ),
    # 7. Quran bookmarks outer container role=list
    (
        '            <div className="space-y-5">\n              {quranBmBySurah.map((group) => (',
        '            <div className="space-y-5" role="list" aria-label="آيات القرآن المحفوظة">\n              {quranBmBySurah.map((group) => (',
        "Favorites: quran bm outer role=list"
    ),
    # 8. Quran bookmark items role=list
    (
        '                  <div className="divide-y divide-white/6 rounded-2xl border border-[var(--stroke)] overflow-hidden">\n                    {group.items.map((bm) => (',
        '                  <div className="divide-y divide-white/6 rounded-2xl border border-[var(--stroke)] overflow-hidden" role="list">\n                    {group.items.map((bm) => (',
        "Favorites: quran bm items role=list"
    ),
    # 9. Quran bm item role=listitem
    (
        '                      <div key={`${bm.surahId}:${bm.ayahIndex}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--card)] transition">',
        '                      <div key={`${bm.surahId}:${bm.ayahIndex}`} role="listitem" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--card)] transition">',
        "Favorites: quran bm item role=listitem"
    ),
    # 10. Hadith bookmarks items role=list
    (
        '              <div className="space-y-2">\n                {hadithBmList',
        '              <div className="space-y-2" role="list" aria-label="الأحاديث المحفوظة">\n                {hadithBmList',
        "Favorites: hadith bm items role=list"
    ),
    # 11. Hadith bm item role=listitem
    (
        '                      <div\n                        key={`${h.bookKey}:${h.n}`}\n                        className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-start gap-3"',
        '                      <div\n                        key={`${h.bookKey}:${h.n}`}\n                        role="listitem"\n                        className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-start gap-3"',
        "Favorites: hadith bm item role=listitem"
    ),
])

# ── HadithBookView.tsx ────────────────────────────────────────────────────────
patch("src/pages/HadithBookView.tsx", [
    (
        '<ArrowUpRight size={17} className="opacity-45 transition group-hover:opacity-80" />',
        '<ArrowUpRight size={17} className="opacity-45 transition group-hover:opacity-80" aria-hidden="true" />',
        "HadithBookView: ArrowUpRight aria-hidden"
    ),
])

# ── Mushaf.tsx ────────────────────────────────────────────────────────────────
patch("src/pages/Mushaf.tsx", [
    # تفسير button icon
    (
        '            aria-label="تفسير"\n            onClick={(e) => { e.stopPropagation(); setTafsirItem(selectedItem); setSelectedItem(null); }}\n          >\n            <ArrowUpRight size={18} />',
        '            aria-label="تفسير"\n            onClick={(e) => { e.stopPropagation(); setTafsirItem(selectedItem); setSelectedItem(null); }}\n          >\n            <ArrowUpRight size={18} aria-hidden="true" />',
        "Mushaf: تفسير button ArrowUpRight aria-hidden"
    ),
    # External tafsir links
    (
        '                  className="flex items-center gap-1 text-xs opacity-55 hover:opacity-90 active:opacity-90 transition px-3 py-1.5 rounded-xl border"\n                  style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}\n                  onClick={(e) => e.stopPropagation()}\n                >\n                  <ArrowUpRight size={11} />',
        '                  className="flex items-center gap-1 text-xs opacity-55 hover:opacity-90 active:opacity-90 transition px-3 py-1.5 rounded-xl border"\n                  style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}\n                  onClick={(e) => e.stopPropagation()}\n                >\n                  <ArrowUpRight size={11} aria-hidden="true" />',
        "Mushaf: external tafsir link ArrowUpRight aria-hidden"
    ),
])

# ── Search.tsx ────────────────────────────────────────────────────────────────
f_search = root / "src/pages/Search.tsx"
src_search = f_search.read_text(encoding="utf-8")

# Replace all standalone ArrowUpRight occurrences in Search (no aria-hidden)
# Using regex to add aria-hidden to all ArrowUpRight tags without it
import re

def add_aria_hidden(match):
    tag = match.group(0)
    if 'aria-hidden' in tag:
        return tag
    # Add aria-hidden before the closing />
    return tag.replace('/>', 'aria-hidden="true" />')

# Match <ArrowUpRight ... /> patterns
pattern = r'<ArrowUpRight[^/]*/>'
new_src_search = re.sub(pattern, add_aria_hidden, src_search)

if new_src_search != src_search:
    count = len(re.findall(pattern, src_search))
    print(f"  patched {count} ArrowUpRight icons in Search.tsx with aria-hidden")
    f_search.write_text(new_src_search, encoding="utf-8")
else:
    print("  SKIP: No ArrowUpRight patterns found in Search.tsx")

print("Phase 56d DONE")
