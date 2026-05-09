"""Phase 56e: Add role=list/listitem to Favorites dua, story, companion lists."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Favorites.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Dua list container
    (
        '            <div className="space-y-3">\n              {duaFavItems.map((dua) => (\n                <div\n                  key={dua.id}\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] flex items-start gap-3 cv-auto"',
        '            <div className="space-y-3" role="list" aria-label="الأدعية المفضلة">\n              {duaFavItems.map((dua) => (\n                <div\n                  key={dua.id}\n                  role="listitem"\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] flex items-start gap-3 cv-auto"',
        "Favorites: dua list role=list+listitem"
    ),
    # 2. Story list container
    (
        '            <div className="space-y-3" dir="rtl">\n              {storyFavItems.map((story) => (\n                <div\n                  key={story.id}\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] cv-auto"',
        '            <div className="space-y-3" dir="rtl" role="list" aria-label="القصص المحفوظة">\n              {storyFavItems.map((story) => (\n                <div\n                  key={story.id}\n                  role="listitem"\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] cv-auto"',
        "Favorites: story list role=list+listitem"
    ),
    # 3. Companions list container
    (
        '            <div className="space-y-3" dir="rtl">\n              {companionFavItems.map((companion) => (\n                <div\n                  key={companion.id}\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] flex items-start gap-3 cv-auto"',
        '            <div className="space-y-3" dir="rtl" role="list" aria-label="الصحابة المحفوظون">\n              {companionFavItems.map((companion) => (\n                <div\n                  key={companion.id}\n                  role="listitem"\n                  className="glass rounded-2xl p-4 border border-[var(--stroke)] flex items-start gap-3 cv-auto"',
        "Favorites: companions list role=list+listitem"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"  SKIP: {label} not found")

f.write_text(src, encoding="utf-8")
print("Phase 56e DONE")
