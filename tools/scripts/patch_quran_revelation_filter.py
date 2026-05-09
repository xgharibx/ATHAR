#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 24: Add Meccan/Medinan filter to Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Add filterRevelation state after filterJuz ──────────────────────────
old_state = '  const [filterJuz, setFilterJuz] = React.useState<number | null>(() => parseJuzParam(searchParams.get("juz")));'
new_state = (
    '  const [filterJuz, setFilterJuz] = React.useState<number | null>(() => parseJuzParam(searchParams.get("juz")));\n'
    '  const [filterRevelation, setFilterRevelation] = React.useState<"meccan" | "medinan" | null>(null);'
)

count = content.count(old_state)
print(f'1. State: {count}')
if count == 1:
    content = content.replace(old_state, new_state, 1)

# ─── 2. Add revelation filter to sortedFiltered memo ───────────────────────
old_filter = (
    '    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);\n'
    '    return base;\n'
    '  }, [filtered, sortMode, readingHistory, filterJuz]);'
)
new_filter = (
    '    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);\n'
    '    if (filterRevelation === "meccan") base = base.filter((s) => SURAH_REVELATION[s.id] !== "medinan");\n'
    '    if (filterRevelation === "medinan") base = base.filter((s) => SURAH_REVELATION[s.id] === "medinan");\n'
    '    return base;\n'
    '  }, [filtered, sortMode, readingHistory, filterJuz, filterRevelation]);'
)

count2 = content.count(old_filter)
print(f'2. Filter memo: {count2}')
if count2 == 1:
    content = content.replace(old_filter, new_filter, 1)

# ─── 3. Add toggle buttons after the tab group (before random surah btn) ────
old_tabs_end = (
    '            {/* Random surah */}\n'
    '            <button type="button"\n'
    '              onClick={() => { if (!data || data.length === 0) return; navigate(`/mushaf?surah=${data[Math.floor(Math.random() * data.length)]!.id}`); }}'
)
new_tabs_end = (
    '            {/* Revelation filter */}\n'
    '            <div className="flex rounded-xl overflow-hidden border border-[var(--stroke)] text-[10px] shrink-0">\n'
    '              <button type="button"\n'
    '                onClick={() => setFilterRevelation(filterRevelation === "meccan" ? null : "meccan")}\n'
    '                aria-pressed={filterRevelation === "meccan"}\n'
    '                className="px-2.5 py-1.5 transition"\n'
    '                style={{ background: filterRevelation === "meccan" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--card)", color: filterRevelation === "meccan" ? "var(--accent)" : undefined, fontWeight: filterRevelation === "meccan" ? 600 : undefined }}\n'
    '              >\n'
    '                \u0645\u0643\u064a\u0629\n'
    '              </button>\n'
    '              <div className="w-px bg-[var(--stroke)]" />\n'
    '              <button type="button"\n'
    '                onClick={() => setFilterRevelation(filterRevelation === "medinan" ? null : "medinan")}\n'
    '                aria-pressed={filterRevelation === "medinan"}\n'
    '                className="px-2.5 py-1.5 transition"\n'
    '                style={{ background: filterRevelation === "medinan" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--card)", color: filterRevelation === "medinan" ? "var(--accent)" : undefined, fontWeight: filterRevelation === "medinan" ? 600 : undefined }}\n'
    '              >\n'
    '                \u0645\u062f\u0646\u064a\u0629\n'
    '              </button>\n'
    '            </div>\n\n'
    '            {/* Random surah */}\n'
    '            <button type="button"\n'
    '              onClick={() => { if (!data || data.length === 0) return; navigate(`/mushaf?surah=${data[Math.floor(Math.random() * data.length)]!.id}`); }}'
)

count3 = content.count(old_tabs_end)
print(f'3. Tabs end: {count3}')
if count3 == 1:
    content = content.replace(old_tabs_end, new_tabs_end, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
