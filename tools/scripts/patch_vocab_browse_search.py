#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add search input to QuranVocab browse mode."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add Search icon to imports
old_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard } from "lucide-react";'
new_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard, Search, X as XIcon } from "lucide-react";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print('Import updated')
else:
    print('Import not found')

# 2. Add browseQuery state after browseMode state
old_state = '  const [browseMode, setBrowseMode] = React.useState(false);'
new_state = '  const [browseMode, setBrowseMode] = React.useState(false);\n  const [browseQuery, setBrowseQuery] = React.useState("");'
if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print('browseQuery state added')
else:
    print('browseMode state not found')

# 3. Add filtered browse list memo
old_deck_usememo = '  const dailyWordId = React.useMemo(() => getDailyWordId(), []);'
new_deck_usememo = (
    '  const dailyWordId = React.useMemo(() => getDailyWordId(), []);\n'
    '\n'
    '  const browseList = React.useMemo(() => {\n'
    '    if (!browseQuery.trim()) return QURAN_VOCAB;\n'
    '    const q = browseQuery.trim().toLowerCase();\n'
    '    return QURAN_VOCAB.filter(\n'
    '      (w) => w.arabic.includes(browseQuery.trim()) || w.meaning.toLowerCase().includes(q)\n'
    '    );\n'
    '  }, [browseQuery]);\n'
)
if old_deck_usememo in content:
    content = content.replace(old_deck_usememo, new_deck_usememo, 1)
    print('browseList memo added')
else:
    print('dailyWordId memo not found')

# 4. Replace the browse list rendering to use browseList and add search input
old_browse_list = '      {/* Browse list mode */}\n      {browseMode && (\n        <div className="px-4 pt-4 pb-32 space-y-2">\n          {QURAN_VOCAB.map((word) => ('
new_browse_list = (
    '      {/* Browse list mode */}\n'
    '      {browseMode && (\n'
    '        <div className="px-4 pt-4 pb-32">\n'
    '          {/* Search input */}\n'
    '          <div className="relative mb-3">\n'
    '            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />\n'
    '            <input\n'
    '              type="search"\n'
    '              value={browseQuery}\n'
    '              onChange={(e) => setBrowseQuery(e.target.value)}\n'
    '              placeholder="\u0627\u0628\u062d\u062b \u0639\u0646 \u0643\u0644\u0645\u0629\u2026"\n'
    '              dir="rtl"\n'
    '              className="w-full rounded-2xl px-4 py-2.5 pr-9 text-sm"\n'
    '              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)", outline: "none" }}\n'
    '              aria-label="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"\n'
    '            />\n'
    '            {browseQuery && (\n'
    '              <button type="button" onClick={() => setBrowseQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80" aria-label="\u0645\u0633\u062d \u0627\u0644\u0628\u062d\u062b">\n'
    '                <XIcon size={12} />\n'
    '              </button>\n'
    '            )}\n'
    '          </div>\n'
    '          {browseList.length === 0 && (\n'
    '            <div className="text-center py-8 text-sm opacity-50">\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c</div>\n'
    '          )}\n'
    '          <div className="space-y-2">\n'
    '          {browseList.map((word) => ('
)
if old_browse_list in content:
    content = content.replace(old_browse_list, new_browse_list, 1)
    print('Browse search added')
else:
    print('Browse list start not found')
    idx = content.find('Browse list mode')
    print(f'Found browse list mode at {idx}')

# 5. Close the new <div className="space-y-2"> wrapper
old_browse_end = '          )}\n        </div>\n      )}\n      {/* Flashcard */'
new_browse_end = '          )}\n          </div>\n        </div>\n      )}\n      {/* Flashcard */'
if old_browse_end in content:
    content = content.replace(old_browse_end, new_browse_end, 1)
    print('Browse end wrapper closed')
else:
    print('Browse end not found')
    idx = content.find('Flashcard')
    print(f'Flashcard section at {idx}')
    print(repr(content[max(0,idx-100):idx+30]))

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
