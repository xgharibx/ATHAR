"""Phase 56b v2: Add aria-pressed to quranPageSize/quranTheme/quranScrollMode buttons in Settings."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

f = root / "src/pages/Settings.tsx"
src = f.read_text(encoding="utf-8")

# 1. quranPageSize buttons
old1 = '                    <button type="button"\n                      key={n}\n                      onClick={() => setPrefs({ quranPageSize: n })}\n                      className={[\n                        "px-4 py-3 rounded-xl border text-sm transition min-h-[44px]",\n                        prefs.quranPageSize === n\n                          ? "bg-accent-15 border-accent-35"\n                          : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                      ].join(" ")}\n                    >'
new1 = '                    <button type="button"\n                      key={n}\n                      onClick={() => setPrefs({ quranPageSize: n })}\n                      aria-pressed={prefs.quranPageSize === n}\n                      className={[\n                        "px-4 py-3 rounded-xl border text-sm transition min-h-[44px]",\n                        prefs.quranPageSize === n\n                          ? "bg-accent-15 border-accent-35"\n                          : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                      ].join(" ")}\n                    >'

if old1 in src:
    src = src.replace(old1, new1, 1)
    print("  patched quranPageSize buttons aria-pressed")
else:
    print("SKIP1: quranPageSize pattern not found")

# 2. quranTheme buttons
old2 = '                  <button type="button"\n                    key={t}\n                    onClick={() => setPrefs({ quranTheme: t })}\n                    className={[\n                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",\n                      prefs.quranTheme === t\n                        ? "bg-accent-15 border-accent-35"\n                        : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                    ].join(" ")}\n                  >'
new2 = '                  <button type="button"\n                    key={t}\n                    onClick={() => setPrefs({ quranTheme: t })}\n                    aria-pressed={prefs.quranTheme === t}\n                    className={[\n                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",\n                      prefs.quranTheme === t\n                        ? "bg-accent-15 border-accent-35"\n                        : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                    ].join(" ")}\n                  >'

if old2 in src:
    src = src.replace(old2, new2, 1)
    print("  patched quranTheme buttons aria-pressed")
else:
    print("SKIP2: quranTheme pattern not found")

# 3. quranScrollMode buttons
old3 = '                  <button type="button"\n                    key={m}\n                    onClick={() => setPrefs({ quranScrollMode: m })}\n                    className={[\n                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",\n                      prefs.quranScrollMode === m\n                        ? "bg-accent-15 border-accent-35"\n                        : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                    ].join(" ")}\n                  >'
new3 = '                  <button type="button"\n                    key={m}\n                    onClick={() => setPrefs({ quranScrollMode: m })}\n                    aria-pressed={prefs.quranScrollMode === m}\n                    className={[\n                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",\n                      prefs.quranScrollMode === m\n                        ? "bg-accent-15 border-accent-35"\n                        : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"\n                    ].join(" ")}\n                  >'

if old3 in src:
    src = src.replace(old3, new3, 1)
    print("  patched quranScrollMode buttons aria-pressed")
else:
    print("SKIP3: quranScrollMode pattern not found")

f.write_text(src, encoding="utf-8")
print("PATCHED Settings.tsx")
