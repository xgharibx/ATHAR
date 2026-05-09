#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 21: Add vocab learned% stat to Insights.tsx Quran card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Add learnedVocabCount memo near top of component (after quranDailyAyahs) ───
old_state = '  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);'
new_state = (
    '  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);\n'
    '  const learnedVocabCount = React.useMemo(() => {\n'
    '    try {\n'
    '      const v = localStorage.getItem("noor_vocab_learned");\n'
    '      if (!v) return 0;\n'
    '      return (JSON.parse(v) as number[]).length;\n'
    '    } catch { return 0; }\n'
    '  }, []);'
)

count = content.count(old_state)
print(f'1. State: {count}')
if count == 1:
    content = content.replace(old_state, new_state, 1)

# ─── 2. Add vocab stat to the stats line in the Quran analytics card ───
old_stats_line = (
    '            <span className="tabular-nums">{quranStats.completed.toLocaleString("ar-EG")} \u0633\u0648\u0631\u0629 \u0645\u0643\u062a\u0645\u0644\u0629</span>\n'
    '            <span className="tabular-nums">{quranStats.started.toLocaleString("ar-EG")} \u0633\u0648\u0631\u0629 \u0628\u062f\u0623\u062a</span>\n'
    '            <span className="tabular-nums">{overallQuranProgress.toLocaleString("ar-EG")}\u0661 \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646</span>'
)
new_stats_line = (
    '            <span className="tabular-nums">{quranStats.completed.toLocaleString("ar-EG")} \u0633\u0648\u0631\u0629 \u0645\u0643\u062a\u0645\u0644\u0629</span>\n'
    '            <span className="tabular-nums">{quranStats.started.toLocaleString("ar-EG")} \u0633\u0648\u0631\u0629 \u0628\u062f\u0623\u062a</span>\n'
    '            <span className="tabular-nums">{overallQuranProgress.toLocaleString("ar-EG")}\u0661 \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646</span>\n'
    '            {learnedVocabCount > 0 && (\n'
    '              <span className="tabular-nums" style={{ color: "var(--accent)" }}>\u2605 {learnedVocabCount.toLocaleString("ar-EG")}/200 \u0645\u0641\u0631\u062f\u0629 \u0645\u062d\u0641\u0648\u0638\u0629</span>\n'
    '            )}'
)

count2 = content.count(old_stats_line)
print(f'2. Stats line: {count2}')
if count2 == 1:
    content = content.replace(old_stats_line, new_stats_line, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
