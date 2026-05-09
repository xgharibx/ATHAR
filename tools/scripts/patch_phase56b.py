"""Phase 56b: Add aria-pressed to quranPageSize/quranTheme/quranScrollMode buttons in Settings."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

f = root / "src/pages/Settings.tsx"
src = f.read_text(encoding="utf-8")

# 1. quranPageSize buttons
old1 = '''                  {[8, 12, 16].map((n) => (
                    <button type="button"
                      key={n}
                      onClick={() => setPrefs({ quranPageSize: n })}
                      className={[
                        "px-4 py-3 rounded-xl border text-sm transition min-h-[44px]",
                        prefs.quranPageSize === n
                          ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                          : "bg-white/6 border-white/10 hover:bg-white/10"
                      ].join(" ")}
                    >
                      {n.toLocaleString("ar-EG")}
                    </button>
                  ))}'''

new1 = '''                  {[8, 12, 16].map((n) => (
                    <button type="button"
                      key={n}
                      onClick={() => setPrefs({ quranPageSize: n })}
                      aria-pressed={prefs.quranPageSize === n}
                      className={[
                        "px-4 py-3 rounded-xl border text-sm transition min-h-[44px]",
                        prefs.quranPageSize === n
                          ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                          : "bg-white/6 border-white/10 hover:bg-white/10"
                      ].join(" ")}
                    >
                      {n.toLocaleString("ar-EG")}
                    </button>
                  ))}'''

if old1 in src:
    src = src.replace(old1, new1, 1)
    print("  patched quranPageSize buttons aria-pressed")
else:
    print("SKIP1: quranPageSize pattern not found")

# 2. quranTheme buttons
old2 = '''                  {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",
                      prefs.quranTheme === t
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >'''

new2 = '''                  {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    aria-pressed={prefs.quranTheme === t}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",
                      prefs.quranTheme === t
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >'''

if old2 in src:
    src = src.replace(old2, new2, 1)
    print("  patched quranTheme buttons aria-pressed")
else:
    print("SKIP2: quranTheme pattern not found")

# 3. quranScrollMode buttons
old3 = '''                {(["page", "scroll"] as const).map((m) => (
                  <button type="button"
                    key={m}
                    onClick={() => setPrefs({ quranScrollMode: m })}
                    className={[
                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",
                      prefs.quranScrollMode === m
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >'''

new3 = '''                {(["page", "scroll"] as const).map((m) => (
                  <button type="button"
                    key={m}
                    onClick={() => setPrefs({ quranScrollMode: m })}
                    aria-pressed={prefs.quranScrollMode === m}
                    className={[
                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",
                      prefs.quranScrollMode === m
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >'''

if old3 in src:
    src = src.replace(old3, new3, 1)
    print("  patched quranScrollMode buttons aria-pressed")
else:
    print("SKIP3: quranScrollMode pattern not found")

f.write_text(src, encoding="utf-8")
print("PATCHED Settings.tsx")
