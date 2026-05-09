#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 23: Daily Quran vocab word mini-card on Home page."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Import QURAN_VOCAB ──────────────────────────────────────────────────
old_import = 'import { DAILY_CHECKLIST_ITEMS, BETTER_MUSLIM_DAILY_STEPS, type DailyChecklistItem } from "@/data/dailyGrowth";'
new_import = (
    'import { DAILY_CHECKLIST_ITEMS, BETTER_MUSLIM_DAILY_STEPS, type DailyChecklistItem } from "@/data/dailyGrowth";\n'
    'import { QURAN_VOCAB } from "@/data/quranVocab";'
)

count = content.count(old_import)
print(f'1. Import: {count}')
if count == 1:
    content = content.replace(old_import, new_import, 1)

# ─── 2. Add daily word computed value inside the component ──────────────────
# Insert after the useTodayKey hook usage. Find a suitable anchor:
old_anchor = '  const { civilTodayKey, hijriDateStr } = useTodayKey();'
new_anchor = (
    '  const { civilTodayKey, hijriDateStr } = useTodayKey();\n'
    '  const dailyVocabWord = React.useMemo(() => {\n'
    '    const dayNum = Math.floor(Date.now() / 86400000);\n'
    '    const id = (dayNum % QURAN_VOCAB.length) + 1;\n'
    '    return QURAN_VOCAB.find((w) => w.id === id) ?? QURAN_VOCAB[0];\n'
    '  }, []);'
)

count2 = content.count(old_anchor)
print(f'2. Anchor: {count2}')
if count2 == 1:
    content = content.replace(old_anchor, new_anchor, 1)

# ─── 3. Add mini-card before content library card ──────────────────────────
old_library = '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}\n      <Card className="p-4">'
new_library = (
    '      {/* \u2500\u2500 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 vocab \u2500\u2500 */}\n'
    '      {dailyVocabWord && (\n'
    '        <button\n'
    '          type="button"\n'
    '          onClick={() => navigate("/quran-vocab")}\n'
    '          className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] p-4"\n'
    '          style={{\n'
    '            background: "color-mix(in srgb, var(--accent) 6%, var(--card))",\n'
    '            borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",\n'
    '          }}\n'
    '          aria-label="\u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 \u0627\u0646\u062a\u0642\u0644 \u0625\u0644\u0649 \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646"\n'
    '        >\n'
    '          <div className="flex items-start justify-between gap-3">\n'
    '            <div className="flex-1 min-w-0">\n'
    '              <div className="text-[10px] font-semibold opacity-45 mb-1.5 tracking-wide uppercase">\u2605 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645</div>\n'
    '              <div\n'
    '                className="text-2xl font-bold mb-1 leading-tight"\n'
    '                style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--accent)" }}\n'
    '                lang="ar"\n'
    '              >\n'
    '                {dailyVocabWord.arabic}\n'
    '              </div>\n'
    '              <div className="text-sm font-medium opacity-75">{dailyVocabWord.meaning}</div>\n'
    '              {dailyVocabWord.root && (\n'
    '                <div className="text-[11px] opacity-40 mt-0.5" lang="ar">\u062c\u0630\u0631: {dailyVocabWord.root}</div>\n'
    '              )}\n'
    '            </div>\n'
    '            <div className="text-[10px] opacity-30 self-center">\u276e</div>\n'
    '          </div>\n'
    '        </button>\n'
    '      )}\n\n'
    '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}\n'
    '      <Card className="p-4">'
)

count3 = content.count(old_library)
print(f'3. Library card: {count3}')
if count3 == 1:
    content = content.replace(old_library, new_library, 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
