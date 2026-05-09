#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 49: Add 'unread' sort tab to Quran.tsx — shortest unread surahs first."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Update sortMode type
OLD_TYPE = '  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress" | "recent">("mushaf");'
NEW_TYPE = '  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress" | "recent" | "unread">("mushaf");'
c1 = content.count(OLD_TYPE)
print(f'1. Type: {c1}')
if c1 == 1:
    content = content.replace(OLD_TYPE, NEW_TYPE, 1)

# 2. Add unread handling in sortedFiltered useMemo
# The current else branch handles "progress" mode. Let's add unread before the else.
OLD_SORT = (
    '    } else {\n'
    '      base = [...filtered].sort((a, b) => {\n'
    '        const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));\n'
    '        const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));\n'
    '        return pB - pA;\n'
    '      });\n'
    '    }'
)
NEW_SORT = (
    '    } else if (sortMode === "unread") {\n'
    '      base = [...filtered]\n'
    '        .filter((s) => (readingHistory[String(s.id)] ?? 0) === 0)\n'
    '        .sort((a, b) => a.ayahs.length - b.ayahs.length);\n'
    '    } else {\n'
    '      base = [...filtered].sort((a, b) => {\n'
    '        const pA = Math.min(100, Math.round(((readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length)) * 100));\n'
    '        const pB = Math.min(100, Math.round(((readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length)) * 100));\n'
    '        return pB - pA;\n'
    '      });\n'
    '    }'
)
c2 = content.count(OLD_SORT)
print(f'2. Sort: {c2}')
if c2 == 1:
    content = content.replace(OLD_SORT, NEW_SORT, 1)

# 3. Add unread tab button after the recent tab button section
OLD_TAB = (
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
    '              )}'
)
NEW_TAB = (
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
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "unread"}\n'
    '                onClick={() => setSortMode("unread")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "unread" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\n'
    '              </button>'
)
c3 = content.count(OLD_TAB)
print(f'3. Tab: {c3}')
if c3 == 1:
    content = content.replace(OLD_TAB, NEW_TAB, 1)

# 4. Hide juz headers in unread mode (similar to recent mode)
OLD_JUZ_HEADER = 'const showJuzHeader = sortMode === "mushaf" && !filterJuz && !query && (idx === 0 || currJuz !== prevJuz);'
NEW_JUZ_HEADER = 'const showJuzHeader = (sortMode === "mushaf") && !filterJuz && !query && (idx === 0 || currJuz !== prevJuz);'
c4 = content.count(OLD_JUZ_HEADER)
print(f'4. Juz header (no change needed): {c4}')

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
