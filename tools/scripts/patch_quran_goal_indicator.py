#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add daily goal indicator to Quran.tsx stats row."""

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

old = '            {(quranDailyAyahs[todayISO] ?? 0) > 0 && <span style={{ color: "var(--accent)", opacity: 1 }}>اليوم: {(quranDailyAyahs[todayISO] ?? 0).toLocaleString("ar-EG")} آية</span>}'
new = '''\
            {(quranDailyAyahs[todayISO] ?? 0) > 0 && <span style={{ color: "var(--accent)", opacity: 1 }}>اليوم: {(quranDailyAyahs[todayISO] ?? 0).toLocaleString("ar-EG")} آية</span>}
            {prefs.quranDailyGoal > 0 && (() => {
              const todayAyahs = quranDailyAyahs[todayISO] ?? 0;
              const goal = prefs.quranDailyGoal;
              const met = todayAyahs >= goal;
              return (
                <span style={{ color: met ? "var(--ok)" : undefined, opacity: met ? 1 : 0.7 }}>
                  {met ? "هدف \u2713" : `هدف: ${todayAyahs.toLocaleString("ar-EG")}/${goal.toLocaleString("ar-EG")}`}
                </span>
              );
            })()}'''

count = content.count(old)
if count == 1:
    content = content.replace(old, new, 1)
    print('Goal indicator added')
else:
    print(f'Pattern found {count} times')
    idx = content.find('\u0627\u0644\u064a\u0648\u0645: {(quranDailyAyahs[todayISO]')
    print(f'Partial match at index {idx}')

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print('Saved')
