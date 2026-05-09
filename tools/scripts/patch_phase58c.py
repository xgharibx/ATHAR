"""Phase 58c: Decorative icon aria-hidden on multiple pages, Home CheckCircle2."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

patches = [
    # --- ProphetStories.tsx ---
    (
        "src/pages/ProphetStories.tsx",
        [
            (
                "                <ArrowRight size={18} />",
                '                <ArrowRight size={18} aria-hidden="true" />',
                "ProphetStories: ArrowRight aria-hidden"
            ),
            (
                "<Share2 size={13} />\n              مشاركة",
                '<Share2 size={13} aria-hidden="true" />\n              مشاركة',
                "ProphetStories: Share2 aria-hidden"
            ),
            (
                "{bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}\n              {bookmarked ? \"محفوظة\" : \"حفظ\"}",
                '{bookmarked ? <BookmarkCheck size={13} aria-hidden="true" /> : <Bookmark size={13} aria-hidden="true" />}\n              {bookmarked ? "محفوظة" : "حفظ"}',
                "ProphetStories: Bookmark/BookmarkCheck aria-hidden"
            ),
        ]
    ),
    # --- Companions.tsx ---
    (
        "src/pages/Companions.tsx",
        [
            (
                "              <Bookmark size={16} />",
                '              <Bookmark size={16} aria-hidden="true" />',
                "Companions: Bookmark (filter button) aria-hidden"
            ),
            (
                '<Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />',
                '<Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" aria-hidden="true" />',
                "Companions: Search icon aria-hidden"
            ),
            (
                "                      <Share2 size={13} />\n                      مشاركة",
                '                      <Share2 size={13} aria-hidden="true" />\n                      مشاركة',
                "Companions: Share2 aria-hidden"
            ),
            (
                '                      {bookmarks.has(companion.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}\n                      {bookmarks.has(companion.id) ? "محفوظ" : "حفظ"}',
                '                      {bookmarks.has(companion.id) ? <BookmarkCheck size={13} aria-hidden="true" /> : <Bookmark size={13} aria-hidden="true" />}\n                      {bookmarks.has(companion.id) ? "محفوظ" : "حفظ"}',
                "Companions: Bookmark/BookmarkCheck aria-hidden"
            ),
        ]
    ),
    # --- Duas.tsx ---
    (
        "src/pages/Duas.tsx",
        [
            (
                "                <ArrowRight size={18} />",
                '                <ArrowRight size={18} aria-hidden="true" />',
                "Duas: ArrowRight aria-hidden"
            ),
            (
                '<Search size={15} style={{ color: "#059669" }} />',
                '<Search size={15} style={{ color: "#059669" }} aria-hidden="true" />',
                "Duas: Search icon aria-hidden"
            ),
            (
                "                    <Share2 size={14} />",
                '                    <Share2 size={14} aria-hidden="true" />',
                "Duas: Share2 aria-hidden"
            ),
        ]
    ),
    # --- AsmaAlHusna.tsx ---
    (
        "src/pages/AsmaAlHusna.tsx",
        [
            (
                "                <ArrowRight size={18} />",
                '                <ArrowRight size={18} aria-hidden="true" />',
                "AsmaAlHusna: ArrowRight aria-hidden"
            ),
            (
                '<Search size={15} style={{ color: "#f59e0b" }} />',
                '<Search size={15} style={{ color: "#f59e0b" }} aria-hidden="true" />',
                "AsmaAlHusna: Search icon aria-hidden"
            ),
            (
                "                  <Share2 size={13} />",
                '                  <Share2 size={13} aria-hidden="true" />',
                "AsmaAlHusna: Share2 aria-hidden"
            ),
        ]
    ),
    # --- Home.tsx CheckCircle2 icons ---
    (
        "src/pages/Home.tsx",
        [
            (
                "{q.done && <CheckCircle2 size={10} />}",
                '{q.done && <CheckCircle2 size={10} aria-hidden="true" />}',
                "Home: Quest CheckCircle2 aria-hidden"
            ),
            (
                '{isDone ? <CheckCircle2 size={15} className="text-[var(--ok)]" /> : CHECKLIST_CATEGORY_ICON[item.category]}',
                '{isDone ? <CheckCircle2 size={15} className="text-[var(--ok)]" aria-hidden="true" /> : CHECKLIST_CATEGORY_ICON[item.category]}',
                "Home: Checklist CheckCircle2 aria-hidden"
            ),
        ]
    ),
]

for rel_path, replacements in patches:
    f = root / rel_path
    src = f.read_text(encoding="utf-8")
    for old, new, label in replacements:
        count = src.count(old)
        if count == 1:
            src = src.replace(old, new, 1)
            print(f"  patched {label}")
        elif count == 0:
            print(f"  SKIP: {label} not found")
        else:
            src = src.replace(old, new)
            print(f"  patched {label} ({count} occurrences)")
    f.write_text(src, encoding="utf-8")

print("Phase 58c DONE")
