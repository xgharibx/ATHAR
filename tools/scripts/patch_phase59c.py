"""Phase 59c: Home.tsx, QuranPlans.tsx and remaining page icon aria-hidden."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

patches = [
    # --- Home.tsx ---
    (
        "src/pages/Home.tsx",
        [
            # Sparkles in greeting header
            (
                '<Sparkles size={14} className="text-[var(--accent)]" />',
                '<Sparkles size={14} className="text-[var(--accent)]" aria-hidden="true" />',
                "Home: Sparkles (greeting) aria-hidden"
            ),
        ]
    ),
    # --- QuranPlans.tsx section headers ---
    (
        "src/pages/QuranPlans.tsx",
        [
            # Target in "اختر خطة" header
            (
                '<Target className="w-4 h-4 opacity-60" />\n              اختر خطة',
                '<Target className="w-4 h-4 opacity-60" aria-hidden="true" />\n              اختر خطة',
                "QuranPlans: Target (header) aria-hidden"
            ),
        ]
    ),
    # --- HadithReader.tsx ---
    (
        "src/pages/HadithReader.tsx",
        [
            # Let's check first if there are icons
        ] if False else []
    ),
]

for rel_path, replacements in patches:
    if not replacements:
        continue
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

print("Phase 59c DONE")
