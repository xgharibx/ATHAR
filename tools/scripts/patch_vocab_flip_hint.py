#!/usr/bin/env python3
"""Add flip hint icon to QuranVocab card front face."""

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '                <p className="text-xs opacity-50">اضغط للكشف عن المعنى</p>'
new = (
    '                <p className="text-xs opacity-50 flex items-center justify-center gap-1">\n'
    '                  <RotateCcw size={12} aria-hidden="true" />\n'
    '                  اضغط للكشف عن المعنى\n'
    '                </p>'
)

count = content.count(old)
if count == 1:
    content = content.replace(old, new, 1)
    print('Flip hint icon added')
else:
    print(f'Pattern found {count} times - expected 1')

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('Saved')
