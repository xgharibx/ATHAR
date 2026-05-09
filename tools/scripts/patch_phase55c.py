"""Phase 55c: Library role=list + VideoLibrary topic icon aria-hidden."""
import pathlib, sys

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# ── Library.tsx ───────────────────────────────────────────────────────────────
f = root / "src/pages/Library.tsx"
src = f.read_text(encoding="utf-8")

# 1. Add role="list" to HADITH_BOOKS_STATIC grid
old1 = '''      {/* Hadith Books Grid — at top for quick access */}
      <div className="grid grid-cols-2 gap-3">
        {HADITH_BOOKS_STATIC.map((book) => ('''
new1 = '''      {/* Hadith Books Grid — at top for quick access */}
      <div className="grid grid-cols-2 gap-3" role="list" aria-label="كتب الحديث">
        {HADITH_BOOKS_STATIC.map((book) => ('''

if old1 not in src:
    print("SKIP1: HADITH_BOOKS_STATIC grid not found")
else:
    src = src.replace(old1, new1, 1)
    print("  patched HADITH_BOOKS_STATIC grid role=list")

# 2. Add role="list" to entries list container
old2 = '''      <div className="space-y-3">
        {entries.map((entry) => <LibraryEntryCard key={entry.key} entry={entry} />)}'''
new2 = '''      <div className="space-y-3" role="list" aria-label="مواد المكتبة">
        {entries.map((entry) => <LibraryEntryCard key={entry.key} entry={entry} />)}'''

if old2 not in src:
    print("SKIP2: entries list not found")
else:
    src = src.replace(old2, new2, 1)
    print("  patched entries list role=list")

f.write_text(src, encoding="utf-8")
print("PATCHED Library.tsx")

# ── VideoLibrary.tsx ──────────────────────────────────────────────────────────
f2 = root / "src/pages/VideoLibrary.tsx"
src2 = f2.read_text(encoding="utf-8")

# 3. aria-hidden on topic hero icon (text-4xl)
old3 = '            <span className="text-4xl">{topic.icon}</span>'
new3 = '            <span className="text-4xl" aria-hidden="true">{topic.icon}</span>'

if old3 not in src2:
    print("SKIP3: topic icon text-4xl not found")
else:
    src2 = src2.replace(old3, new3, 1)
    print("  patched VideoLibrary topic hero icon aria-hidden")

# 4. aria-hidden on topic empty state icon (text-3xl)
old4 = '            <div className="text-3xl mb-2">{topic.icon}</div>'
new4 = '            <div className="text-3xl mb-2" aria-hidden="true">{topic.icon}</div>'

if old4 not in src2:
    print("SKIP4: topic icon text-3xl not found")
else:
    src2 = src2.replace(old4, new4, 1)
    print("  patched VideoLibrary topic empty icon aria-hidden")

f2.write_text(src2, encoding="utf-8")
print("PATCHED VideoLibrary.tsx")
