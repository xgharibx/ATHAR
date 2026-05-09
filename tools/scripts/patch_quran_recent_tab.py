#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 40: Quran.tsx — 'Recently Read' sort tab."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Update sort mode type
old_type = '"mushaf" | "progress">("mushaf")'
new_type = '"mushaf" | "progress" | "recent">("mushaf")'
count = content.count(old_type)
print(f'1. Type: {count}')
if count == 1:
    content = content.replace(old_type, new_type, 1)

# 2. Update sortedFiltered to handle "recent"
old_sort = (
    '  const sortedFiltered = React.useMemo(() => {\n'
    '    let base = sortMode === "mushaf" ? filtered : [...filtered].sort((a, b) => {\n'
    '      const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));\n'
    '      const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));\n'
    '      return pB - pA;\n'
    '    });\n'
    '    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);\n'
    '    if (filterRevelation === "meccan") base = base.filter((s) => SURAH_REVELATION[s.id] !== "medinan");\n'
    '    if (filterRevelation === "medinan") base = base.filter((s) => SURAH_REVELATION[s.id] === "medinan");\n'
    '    return base;\n'
    '  }, [filtered, sortMode, readingHistory, filterJuz, filterRevelation]);'
)
new_sort = (
    '  const sortedFiltered = React.useMemo(() => {\n'
    '    let base: typeof filtered;\n'
    '    if (sortMode === "mushaf") {\n'
    '      base = filtered;\n'
    '    } else if (sortMode === "recent") {\n'
    '      const order = new Map<number, number>(recentSurahs.map((id, i) => [id, i]));\n'
    '      base = [...filtered].sort((a, b) => {\n'
    '        const ra = order.has(a.id) ? order.get(a.id)! : 9999;\n'
    '        const rb = order.has(b.id) ? order.get(b.id)! : 9999;\n'
    '        if (ra !== rb) return ra - rb;\n'
    '        return a.id - b.id;\n'
    '      });\n'
    '    } else {\n'
    '      base = [...filtered].sort((a, b) => {\n'
    '        const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));\n'
    '        const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));\n'
    '        return pB - pA;\n'
    '      });\n'
    '    }\n'
    '    if (filterJuz !== null) base = base.filter((s) => getSurahJuz(s.id) === filterJuz);\n'
    '    if (filterRevelation === "meccan") base = base.filter((s) => SURAH_REVELATION[s.id] !== "medinan");\n'
    '    if (filterRevelation === "medinan") base = base.filter((s) => SURAH_REVELATION[s.id] === "medinan");\n'
    '    return base;\n'
    '  }, [filtered, sortMode, readingHistory, recentSurahs, filterJuz, filterRevelation]);'
)
count = content.count(old_sort)
print(f'2. Sort memo: {count}')
if count == 1:
    content = content.replace(old_sort, new_sort, 1)

# 3. Add tab button after "التقدم" button
old_tabs = (
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "progress"}\n'
    '                onClick={() => setSortMode("progress")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "progress" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u0627\u0644\u062a\u0642\u062f\u0645\n'
    '              </button>\n'
    '            </div>'
)
new_tabs = (
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "progress"}\n'
    '                onClick={() => setSortMode("progress")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "progress" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u0627\u0644\u062a\u0642\u062f\u0645\n'
    '              </button>\n'
    '              {recentSurahs.length > 0 && (\n'
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "recent"}\n'
    '                onClick={() => setSortMode("recent")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "recent" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u0627\u0644\u0623\u062e\u064a\u0631\u0629\n'
    '              </button>\n'
    '              )}\n'
    '            </div>'
)
count = content.count(old_tabs)
print(f'3. Tabs: {count}')
if count == 1:
    content = content.replace(old_tabs, new_tabs, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
