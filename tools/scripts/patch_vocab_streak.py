#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 32: QuranVocab daily review streak flame badge."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add streak helper functions after saveLearned
old_shuffle = (
    'function shuffle<T>(arr: T[]): T[] {'
)
new_shuffle = (
    'const STREAK_KEY = "noor_vocab_review_dates";\n'
    '\n'
    'function getTodayKey(): string {\n'
    '  const d = new Date();\n'
    '  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;\n'
    '}\n'
    '\n'
    'function loadReviewDates(): Set<string> {\n'
    '  try {\n'
    '    const v = localStorage.getItem(STREAK_KEY);\n'
    '    return v ? new Set(JSON.parse(v) as string[]) : new Set();\n'
    '  } catch { return new Set(); }\n'
    '}\n'
    '\n'
    'function recordTodayReview() {\n'
    '  const dates = loadReviewDates();\n'
    '  dates.add(getTodayKey());\n'
    '  localStorage.setItem(STREAK_KEY, JSON.stringify([...dates]));\n'
    '}\n'
    '\n'
    'function computeVocabStreak(): number {\n'
    '  const dates = loadReviewDates();\n'
    '  let streak = 0;\n'
    '  const today = new Date();\n'
    '  for (let i = 0; i < 366; i++) {\n'
    '    const d = new Date(today);\n'
    '    d.setDate(d.getDate() - i);\n'
    '    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;\n'
    '    if (dates.has(key)) { streak++; } else { break; }\n'
    '  }\n'
    '  return streak;\n'
    '}\n'
    '\n'
    'function shuffle<T>(arr: T[]): T[] {'
)

count = content.count(old_shuffle)
print(f'1. Helper fns: {count}')
if count == 1:
    content = content.replace(old_shuffle, new_shuffle, 1)

# 2. Add vocabStreak state after learned state
old_learned_state = (
    '  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());'
)
new_learned_state = (
    '  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());\n'
    '  const [vocabStreak, setVocabStreak] = React.useState<number>(() => computeVocabStreak());'
)
count2 = content.count(old_learned_state)
print(f'2. Streak state: {count2}')
if count2 == 1:
    content = content.replace(old_learned_state, new_learned_state, 1)

# 3. Record review + refresh streak when card is flipped
old_flip = (
    '      if (e.key === " " || e.key === "Enter") {\n'
    '        e.preventDefault();\n'
    '        setFlipped((f) => !f);'
)
new_flip = (
    '      if (e.key === " " || e.key === "Enter") {\n'
    '        e.preventDefault();\n'
    '        setFlipped((f) => { if (!f) { recordTodayReview(); setVocabStreak(computeVocabStreak()); } return !f; });'
)
count3 = content.count(old_flip)
print(f'3. Flip record: {count3}')
if count3 == 1:
    content = content.replace(old_flip, new_flip, 1)

# 4. Also record on tap/click flip (setFlipped(f=>!f) via button)
# Find the flashcard onClick handler
old_card_click = '                  onClick={() => setFlipped((f) => !f)}'
new_card_click = (
    '                  onClick={() => setFlipped((f) => {'
    ' if (!f) { recordTodayReview(); setVocabStreak(computeVocabStreak()); } return !f; })}'
)
count4 = content.count(old_card_click)
print(f'4. Card click: {count4}')
if count4 >= 1:
    content = content.replace(old_card_click, new_card_click, 1)

# 5. Add flame badge to the header subtitle (after the existing stats line)
old_header = (
    '                <h1 className="text-xl font-semibold" style={{ color: "#0ea5e9" }}>\u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646</h1>\n'
    '                <div className="text-sm opacity-70 mt-1 tabular-nums" aria-live="polite" aria-atomic="true">'
)
new_header = (
    '                <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "#0ea5e9" }}>\n'
    '                  \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646\n'
    '                  {vocabStreak > 0 && (\n'
    '                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--accent)" }} title="\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629">\n'
    '                      \ud83d\udd25{vocabStreak.toLocaleString("ar-EG")}\n'
    '                    </span>\n'
    '                  )}\n'
    '                </h1>\n'
    '                <div className="text-sm opacity-70 mt-1 tabular-nums" aria-live="polite" aria-atomic="true">'
)
count5 = content.count(old_header)
print(f'5. Header badge: {count5}')
if count5 == 1:
    content = content.replace(old_header, new_header, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
