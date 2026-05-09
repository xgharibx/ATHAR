"""Phase 55b: HadithBooks - lang=en on English titles + role=list on mainBooks."""
import pathlib, sys

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# ── HadithBooks.tsx ───────────────────────────────────────────────────────────
f = root / "src/pages/HadithBooks.tsx"
src = f.read_text(encoding="utf-8")

# 1. Add lang="en" to ArbainiCard titleEn (line ~79)
old1 = '        <p className="text-[10px] text-[var(--muted)] mb-3">{book.titleEn}</p>'
new1 = '        <p className="text-[10px] text-[var(--muted)] mb-3" lang="en">{book.titleEn}</p>'

if old1 not in src:
    print("SKIP1: ArbainiCard titleEn not found")
else:
    src = src.replace(old1, new1, 1)
    print("  patched ArbainiCard titleEn lang=en")

# 2. Add lang="en" to BookCard titleEn (line ~135)
old2 = '            <p className="text-[10px] text-[var(--muted)] mb-2">{book.titleEn}</p>'
new2 = '            <p className="text-[10px] text-[var(--muted)] mb-2" lang="en">{book.titleEn}</p>'

if old2 not in src:
    print("SKIP2: BookCard titleEn not found")
else:
    src = src.replace(old2, new2, 1)
    print("  patched BookCard titleEn lang=en")

# 3. Add role="list" to mainBooks container + role="listitem" wrappers
old3 = '''          {/* Main books */}
          <div className="px-4 space-y-3 mb-4">
            <p className="text-xs text-[var(--muted)] font-arabic px-1">الكتب الكبرى</p>
            {mainBooks.map((book) => (
              <BookCard key={book.key} book={book} />
            ))}
          </div>'''

new3 = '''          {/* Main books */}
          <div className="px-4 space-y-3 mb-4">
            <p className="text-xs text-[var(--muted)] font-arabic px-1">الكتب الكبرى</p>
            <div role="list" aria-label="الكتب الكبرى">
              {mainBooks.map((book) => (
                <div key={book.key} role="listitem">
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          </div>'''

if old3 not in src:
    print("SKIP3: mainBooks map not found")
else:
    src = src.replace(old3, new3, 1)
    print("  patched mainBooks role=list + role=listitem")

f.write_text(src, encoding="utf-8")
print("PATCHED HadithBooks.tsx")
