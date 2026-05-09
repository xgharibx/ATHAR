"""Phase 58b: Library.tsx icon aria-hidden + CollectionCard aria-pressed."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Library.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # CollectionCard aria-pressed
    (
        '    <button type="button"\n      onClick={onClick}\n      className={cn(\n        "min-w-[220px] text-right rounded-3xl border p-4 transition press-effect",',
        '    <button type="button"\n      onClick={onClick}\n      aria-pressed={active}\n      className={cn(\n        "min-w-[220px] text-right rounded-3xl border p-4 transition press-effect",',
        "Library: CollectionCard aria-pressed"
    ),
    # Sparkles icon in featured card
    (
        '<Sparkles size={15} className="text-[var(--accent)]" />',
        '<Sparkles size={15} className="text-[var(--accent)]" aria-hidden="true" />',
        "Library: Sparkles aria-hidden"
    ),
    # ArrowRight in Ruqyah card
    (
        '<ArrowRight size={14} className="opacity-35 shrink-0 rotate-180" />',
        '<ArrowRight size={14} className="opacity-35 shrink-0 rotate-180" aria-hidden="true" />',
        "Library: ArrowRight (Ruqyah card) aria-hidden"
    ),
    # Library icon in hadith book cards
    (
        '<Library size={16} style={{ color: book.color }} />',
        '<Library size={16} style={{ color: book.color }} aria-hidden="true" />',
        "Library: Library icon aria-hidden"
    ),
    # Search icon in search input
    (
        '<Search size={17} className="opacity-60" />',
        '<Search size={17} className="opacity-60" aria-hidden="true" />',
        "Library: Search icon aria-hidden"
    ),
    # Users icon in Companions card
    (
        '<Users size={22} style={{ color: "#f59e0b" }} />',
        '<Users size={22} style={{ color: "#f59e0b" }} aria-hidden="true" />',
        "Library: Users icon aria-hidden"
    ),
    # ArrowRight in Companions card
    (
        '<ArrowRight size={16} className="text-[var(--muted)] rotate-180 shrink-0" />',
        '<ArrowRight size={16} className="text-[var(--muted)] rotate-180 shrink-0" aria-hidden="true" />',
        "Library: ArrowRight (Companions/Seerah card) aria-hidden"
    ),
]

for old, new, label in replacements:
    count = src.count(old)
    if count == 1:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    elif count == 0:
        print(f"  SKIP: {label} not found")
    else:
        # Replace all occurrences
        src = src.replace(old, new)
        print(f"  patched {label} ({count} occurrences)")

f.write_text(src, encoding="utf-8")
print("Phase 58b DONE")
