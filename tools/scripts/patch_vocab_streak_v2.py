#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 51: Vocab practice streak in QuranVocab.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add localStorage keys and streak helpers after LEARNED_KEY
OLD_KEYS = 'const LEARNED_KEY = "noor_vocab_learned";'
NEW_KEYS = (
    'const LEARNED_KEY = "noor_vocab_learned";\n'
    'const VOCAB_STREAK_KEY = "noor_vocab_streak";\n'
    'const VOCAB_LAST_DAY_KEY = "noor_vocab_last_day";\n'
    '\n'
    'function loadVocabStreak(): number {\n'
    '  try { return Number(localStorage.getItem(VOCAB_STREAK_KEY) ?? 0); } catch { return 0; }\n'
    '}\n'
    '\n'
    'function updateVocabStreak(): number {\n'
    '  try {\n'
    '    const today = new Date();\n'
    '    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;\n'
    '    const lastDay = localStorage.getItem(VOCAB_LAST_DAY_KEY) ?? "";\n'
    '    if (lastDay === todayISO) return loadVocabStreak();\n'
    '    const yesterday = new Date(today.getTime() - 86400000);\n'
    '    const yestISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;\n'
    '    const prev = loadVocabStreak();\n'
    '    const newStreak = lastDay === yestISO ? prev + 1 : 1;\n'
    '    localStorage.setItem(VOCAB_STREAK_KEY, String(newStreak));\n'
    '    localStorage.setItem(VOCAB_LAST_DAY_KEY, todayISO);\n'
    '    return newStreak;\n'
    '  } catch { return 0; }\n'
    '}'
)
c1 = content.count(OLD_KEYS)
print(f'1. Keys: {c1}')
if c1 == 1:
    content = content.replace(OLD_KEYS, NEW_KEYS, 1)

# 2. Add vocabStreak state
OLD_STATE = '  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());'
NEW_STATE = (
    '  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());\n'
    '  const [vocabStreak, setVocabStreak] = React.useState(() => loadVocabStreak());'
)
c2 = content.count(OLD_STATE)
print(f'2. State: {c2}')
if c2 == 1:
    content = content.replace(OLD_STATE, NEW_STATE, 1)

# 3. Update handleLearn to update streak when adding
OLD_HANDLE = '    if (next.has(id)) { next.delete(id); } else { next.add(id); toast.success("\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a"); }'
NEW_HANDLE = (
    '    if (next.has(id)) { next.delete(id); } else { next.add(id); toast.success("\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a"); const s = updateVocabStreak(); setVocabStreak(s); }'
)
c3 = content.count(OLD_HANDLE)
print(f'3. handleLearn: {c3}')
if c3 == 1:
    content = content.replace(OLD_HANDLE, NEW_HANDLE, 1)

# 4. Show streak badge after the progress % label
# The stats card area shows "٪ محفوظ" — add streak after it
OLD_PCT = (
    '              <p className="text-[10px] opacity-50">\n'
    '                {Math.round((learned.size / QURAN_VOCAB.length) * 100)}\u066a \u0645\u062d\u0641\u0648\u0638\n'
    '              </p>'
)
NEW_PCT = (
    '              <div className="flex items-center justify-between gap-2">\n'
    '                <p className="text-[10px] opacity-50">\n'
    '                  {Math.round((learned.size / QURAN_VOCAB.length) * 100)}\u066a \u0645\u062d\u0641\u0648\u0638\n'
    '                </p>\n'
    '                {vocabStreak > 0 && (\n'
    '                  <span className="text-[10px] flex items-center gap-0.5 tabular-nums" style={{ color: "#fb923c" }}>\n'
    '                    \ud83d\udd25 {vocabStreak.toLocaleString("ar-EG")} \u064a\u0648\u0645\n'
    '                  </span>\n'
    '                )}\n'
    '              </div>'
)
c4 = content.count(OLD_PCT)
print(f'4. Streak display: {c4}')
if c4 == 1:
    content = content.replace(OLD_PCT, NEW_PCT, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
