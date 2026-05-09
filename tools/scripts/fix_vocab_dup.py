#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix phase 51 duplicates in QuranVocab.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Remove duplicate state line added by my patch
OLD_STATE = '  const [vocabStreak, setVocabStreak] = React.useState(() => loadVocabStreak());\n'
c1 = content.count(OLD_STATE)
print(f'1. Duplicate state: {c1}')
if c1 == 1:
    content = content.replace(OLD_STATE, '', 1)
else:
    print('  WARN: not found or multiple occurrences')

# 2. Remove the new functions block — find and remove between markers
# The new functions start with "const VOCAB_STREAK_KEY" and end before "function loadLearned"
import re
pattern = r'const VOCAB_STREAK_KEY = "noor_vocab_streak";.*?(?=function loadLearned)'
m = re.search(pattern, content, re.DOTALL)
if m:
    print(f'2. Found block at {m.start()}-{m.end()}, removing...')
    content = content[:m.start()] + content[m.end():]
else:
    print('2. Block not found (may already be clean)')

# 3. Fix handleLearn to use existing mechanism (recordTodayReview + computeVocabStreak)
OLD_HANDLE = 'toast.success("\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a"); const s = updateVocabStreak(); setVocabStreak(s);'
NEW_HANDLE = 'toast.success("\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a"); recordTodayReview(); setVocabStreak(computeVocabStreak());'
c3 = content.count(OLD_HANDLE)
print(f'3. handleLearn fix: {c3}')
if c3 == 1:
    content = content.replace(OLD_HANDLE, NEW_HANDLE, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
