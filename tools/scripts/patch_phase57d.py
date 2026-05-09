"""Phase 57d: Add aria-pressed to Settings daily goal presets and reciter buttons."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Settings.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Daily goal preset buttons
    (
        '                <button type="button"\n                  key={p.value}\n                  onClick={() => setPrefs({ quranDailyGoal: p.value })}\n                  className={[\n                    "px-3 py-2 rounded-xl border text-xs transition min-h-[36px]",\n                    (prefs.quranDailyGoal ?? 10) === p.value\n                      ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 font-semibold"\n                      : "bg-white/6 border-white/10 hover:bg-white/10"\n                  ].join(" ")}',
        '                <button type="button"\n                  key={p.value}\n                  onClick={() => setPrefs({ quranDailyGoal: p.value })}\n                  aria-pressed={(prefs.quranDailyGoal ?? 10) === p.value}\n                  className={[\n                    "px-3 py-2 rounded-xl border text-xs transition min-h-[36px]",\n                    (prefs.quranDailyGoal ?? 10) === p.value\n                      ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 font-semibold"\n                      : "bg-white/6 border-white/10 hover:bg-white/10"\n                  ].join(" ")}',
        "Settings: daily goal preset buttons aria-pressed"
    ),
    # 2. Reciter selection buttons
    (
        '              <button type="button"\n                key={r.id}\n                onClick={() => setPrefs({ quranReciter: r.id })}\n                className={[\n                  "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px] text-right",\n                  (prefs.quranReciter ?? "Alafasy_128kbps") === r.id\n                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"\n                    : "bg-white/6 border-white/10 hover:bg-white/8"\n                ].join(" ")}',
        '              <button type="button"\n                key={r.id}\n                onClick={() => setPrefs({ quranReciter: r.id })}\n                aria-pressed={(prefs.quranReciter ?? "Alafasy_128kbps") === r.id}\n                className={[\n                  "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px] text-right",\n                  (prefs.quranReciter ?? "Alafasy_128kbps") === r.id\n                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"\n                    : "bg-white/6 border-white/10 hover:bg-white/8"\n                ].join(" ")}',
        "Settings: reciter selection buttons aria-pressed"
    ),
    # 3. Reciter button mic emoji aria-hidden
    (
        '                <span className="text-base shrink-0">🎙</span>',
        '                <span className="text-base shrink-0" aria-hidden="true">🎙</span>',
        "Settings: reciter mic emoji aria-hidden"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"  SKIP: {label} not found")

f.write_text(src, encoding="utf-8")
print("Phase 57d DONE")
