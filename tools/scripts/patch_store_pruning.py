#!/usr/bin/env python3
"""Add 90-day pruning to quranDailyAyahs in recordQuranRead."""

with open('src/store/noorStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''          const todayCount = (s.quranDailyAyahs[today] ?? 0) + count;
          return {
            quranLastReadDate: today,
            quranStreak: newStreak,
            quranDailyAyahs: { ...s.quranDailyAyahs, [today]: todayCount },
          };'''

new = '''          const todayCount = (s.quranDailyAyahs[today] ?? 0) + count;
          // Prune entries older than 90 days to keep localStorage tidy
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 90);
          const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
          const updated = { ...s.quranDailyAyahs, [today]: todayCount };
          for (const k of Object.keys(updated)) { if (k < cutoffISO) delete updated[k]; }
          return {
            quranLastReadDate: today,
            quranStreak: newStreak,
            quranDailyAyahs: updated,
          };'''

count = content.count(old)
if count == 1:
    content = content.replace(old, new, 1)
    print('Pruning added')
else:
    print(f'Pattern found {count} times')

with open('src/store/noorStore.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('Saved')
