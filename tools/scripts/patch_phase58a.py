"""Phase 58: Icon aria-hidden and QuranPlans aria-pressed fixes."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

patches = [
    # --- NearbyMosques.tsx ---
    (
        "src/pages/NearbyMosques.tsx",
        [
            (
                "          <ArrowRight size={15} />",
                '          <ArrowRight size={15} aria-hidden="true" />',
                "NearbyMosques: ArrowRight aria-hidden"
            ),
            (
                "                        <MapPin size={10} />",
                '                        <MapPin size={10} aria-hidden="true" />',
                "NearbyMosques: MapPin aria-hidden"
            ),
            (
                "                      <Share2 size={14} />",
                '                      <Share2 size={14} aria-hidden="true" />',
                "NearbyMosques: Share2 aria-hidden"
            ),
        ]
    ),
    # --- QuranPlans.tsx ---
    (
        "src/pages/QuranPlans.tsx",
        [
            # Preset button aria-pressed
            (
                '                <button type="button"\n                  key={preset.id}\n                  onClick={() => startPlan(preset.days)}\n                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-right',
                '                <button type="button"\n                  key={preset.id}\n                  onClick={() => startPlan(preset.days)}\n                  aria-pressed={!!isActive}\n                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-right',
                "QuranPlans: preset button aria-pressed"
            ),
            # Target icon in "تغيير الخطة" button
            (
                '            <Target className="w-4 h-4 opacity-60" />\n            تغيير الخطة',
                '            <Target className="w-4 h-4 opacity-60" aria-hidden="true" />\n            تغيير الخطة',
                "QuranPlans: Target icon aria-hidden"
            ),
            # RotateCcw icon in "إعادة" button
            (
                '            <RotateCcw className="w-4 h-4" />\n            إعادة',
                '            <RotateCcw className="w-4 h-4" aria-hidden="true" />\n            إعادة',
                "QuranPlans: RotateCcw icon aria-hidden"
            ),
        ]
    ),
    # --- Category.tsx ---
    (
        "src/pages/Category.tsx",
        [
            (
                "              <Home size={16} />",
                '              <Home size={16} aria-hidden="true" />',
                "Category: Home icon aria-hidden"
            ),
        ]
    ),
]

for rel_path, replacements in patches:
    f = root / rel_path
    src = f.read_text(encoding="utf-8")
    for old, new, label in replacements:
        if old in src:
            src = src.replace(old, new, 1)
            print(f"  patched {label}")
        else:
            print(f"  SKIP: {label} not found")
    f.write_text(src, encoding="utf-8")

print("Phase 58a DONE")
