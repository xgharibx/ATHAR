#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix missing closing div in vocab browse search."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# The browse list section ends with:
# ))}\n        </div>\n      )}\n      {/* Flashcard */
# We need to add an extra </div> before the outer </div>

old_browse_end = '          ))}\n        </div>\n      )}\n      {/* Flashcard */'
new_browse_end = '          ))}\n          </div>\n        </div>\n      )}\n      {/* Flashcard */'

count = content.count(old_browse_end)
print(f'Pattern found {count} times')

if count == 1:
    content = content.replace(old_browse_end, new_browse_end, 1)
    print('Wrapped correctly')
else:
    idx = content.find('Flashcard')
    print(f'Flashcard at {idx}')
    print(repr(content[max(0,idx-200):idx+30]))

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
