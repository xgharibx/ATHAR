#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 53: Nearly-complete surahs sort tab in Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Expand sortMode type to include "nearly"
OLD_TYPE = '  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress" | "recent" | "unread">("mushaf");'
NEW_TYPE = '  const [sortMode, setSortMode] = React.useState<"mushaf" | "progress" | "recent" | "unread" | "nearly">("mushaf");'
c1 = content.count(OLD_TYPE)
print(f'1. Type: {c1}')
if c1 == 1:
    content = content.replace(OLD_TYPE, NEW_TYPE, 1)

# 2. Add "nearly" branch in sortedFiltered memo (after unread branch)
OLD_UNREAD_BRANCH = (
    '    } else if (sortMode === "unread") {\n'
    '      base = [...filtered]\n'
    '        .filter((s) => (readingHistory[String(s.id)] ?? 0) === 0)\n'
    '        .sort((a, b) => a.ayahs.length - b.ayahs.length);\n'
    '    } else {'
)
NEW_UNREAD_BRANCH = (
    '    } else if (sortMode === "unread") {\n'
    '      base = [...filtered]\n'
    '        .filter((s) => (readingHistory[String(s.id)] ?? 0) === 0)\n'
    '        .sort((a, b) => a.ayahs.length - b.ayahs.length);\n'
    '    } else if (sortMode === "nearly") {\n'
    '      // Surahs that are started but not completed (1% - 99%), sorted by highest % first\n'
    '      base = [...filtered]\n'
    '        .filter((s) => {\n'
    '          const maxRead = readingHistory[String(s.id)] ?? 0;\n'
    '          return maxRead > 0 && maxRead < s.ayahs.length;\n'
    '        })\n'
    '        .sort((a, b) => {\n'
    '          const pA = (readingHistory[String(a.id)] ?? 0) / Math.max(1, a.ayahs.length);\n'
    '          const pB = (readingHistory[String(b.id)] ?? 0) / Math.max(1, b.ayahs.length);\n'
    '          return pB - pA;\n'
    '        });\n'
    '    } else {'
)
c2 = content.count(OLD_UNREAD_BRANCH)
print(f'2. Nearly branch: {c2}')
if c2 == 1:
    content = content.replace(OLD_UNREAD_BRANCH, NEW_UNREAD_BRANCH, 1)

# 3. Add nearly tab button after the unread tab
OLD_UNREAD_BTN = (
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "unread"}\n'
    '                onClick={() => setSortMode("unread")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "unread" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\n'
    '              </button>\n'
    '            </div>'
)
NEW_UNREAD_BTN = (
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "unread"}\n'
    '                onClick={() => setSortMode("unread")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "unread" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\n'
    '              </button>\n'
    '              {sortedFiltered.length > 0 || sortMode === "nearly" ? (\n'
    '              <button type="button"\n'
    '                role="tab"\n'
    '                aria-controls="quran-surah-list"\n'
    '                aria-selected={sortMode === "nearly"}\n'
    '                onClick={() => setSortMode("nearly")}\n'
    '                className={`px-3.5 h-9 transition ${sortMode === "nearly" ? "bg-accent-20 text-[var(--accent)] font-semibold" : "opacity-55 hover:opacity-90"}`}\n'
    '              >\n'
    '                \u062a\u0642\u0631\u064a\u0628\u0627\u064b\n'
    '              </button>\n'
    '              ) : null}\n'
    '            </div>'
)
c3 = content.count(OLD_UNREAD_BTN)
print(f'3. Nearly tab button: {c3}')
if c3 == 1:
    content = content.replace(OLD_UNREAD_BTN, NEW_UNREAD_BTN, 1)

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
