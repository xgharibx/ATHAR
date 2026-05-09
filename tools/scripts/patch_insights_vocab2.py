#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Target just the closing div of the stats
old = '            <span className="tabular-nums">{overallQuranProgress.toLocaleString("ar-EG")}\u066a \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646</span>\n          </div>'
new = (
    '            <span className="tabular-nums">{overallQuranProgress.toLocaleString("ar-EG")}\u066a \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646</span>\n'
    '            {learnedVocabCount > 0 && (\n'
    '              <span className="tabular-nums" style={{ color: "var(--accent)" }}>\u2605 {learnedVocabCount.toLocaleString("ar-EG")}/200 \u0645\u0641\u0631\u062f\u0629 \u0645\u062d\u0641\u0648\u0638\u0629</span>\n'
    '            )}\n'
    '          </div>'
)

count = content.count(old)
print(f'Pattern count: {count}')
if count == 1:
    content = content.replace(old, new, 1)
    with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
else:
    # Show context
    idx = content.find('\u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646</span>')
    if idx >= 0:
        print(repr(content[max(0,idx-80):idx+50]))
