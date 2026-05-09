#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 43 part 2: Insert heatmap UI into Insights Quran card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# The anchor is the closing of the juz map + card close, before prayer section
old_close = (
    '                  </div>\n'
    '                ))})\n'
    '              </div>\n'
    '            </div>\n'
    '          )}\n'
    '        </Card>\n'
    '      )}\n\n'
    '      {/* I2: Prayer consistency chart (28 days) */}'
)

# Print surrounding context to debug
idx = content.find('I2: Prayer consistency chart')
print(f'  I2 found at index: {idx}')
if idx > 0:
    snippet = content[idx - 300:idx + 50]
    print('SNIPPET:', repr(snippet))
