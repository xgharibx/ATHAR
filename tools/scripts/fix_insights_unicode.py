#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix unicode escape literals in JSX strings."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

# Fix \u{1F3C5} -> actual medal emoji (🏅)
# Also fix \u{...} in the milestone icon strings in the memo
# The memo icon strings: replace all \u{XXXXXX} with actual characters
import re

def replace_unicode_escape(m):
    cp = int(m.group(1), 16)
    return chr(cp)

# Fix in JSX string literals
content = re.sub(r'\\u\{([0-9A-Fa-f]+)\}', replace_unicode_escape, content)

# Also fix escaped unicode in icon strings within the memo definition
# These look like: '\\u{1F331}' -> actual char
# Already handled above

count_bad = content.count('\\u{')
print(f'Remaining bad escapes: {count_bad}')

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print('Saved')
