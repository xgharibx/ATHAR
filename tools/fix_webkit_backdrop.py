"""
Phase 9: Add missing -webkit-backdrop-filter prefixes to globals.css.

iOS Safari requires the -webkit- prefix for backdrop-filter.
Several CSS classes were missing the vendor prefix.
"""

import pathlib
import re
import sys

css_path = pathlib.Path("src/styles/globals.css")
css = css_path.read_text(encoding="utf-8")

# Find all backdrop-filter: ... lines that are NOT immediately preceded by
# or followed by the -webkit- version, and add the -webkit- version.

# Strategy: find "backdrop-filter: X;" not preceded by "-webkit-backdrop-filter: X;"
# and add it.

# Simple approach: find every line with exactly "backdrop-filter:" (no -webkit- prefix)
# and if the line BEFORE it doesn't have -webkit-backdrop-filter, insert it.

lines = css.split('\n')
new_lines = []
i = 0
changed = 0

while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # Is this a bare backdrop-filter line (not the webkit variant)?
    if (stripped.startswith('backdrop-filter:') and 
            not stripped.startswith('-webkit-backdrop-filter:')):
        # Check if the line before already has -webkit-backdrop-filter
        prev_line = lines[i-1].strip() if i > 0 else ''
        next_line = lines[i+1].strip() if i + 1 < len(lines) else ''
        
        if not prev_line.startswith('-webkit-backdrop-filter:') and not next_line.startswith('-webkit-backdrop-filter:'):
            # Insert -webkit- version BEFORE this line, with same indentation
            indent = len(line) - len(line.lstrip())
            webkit_line = ' ' * indent + '-webkit-' + stripped
            new_lines.append(webkit_line)
            changed += 1
    
    new_lines.append(line)
    i += 1

if changed:
    css_path.write_text('\n'.join(new_lines), encoding='utf-8')
    print(f"✅ Added {changed} -webkit-backdrop-filter prefixes")
    print(f"   globals.css now has {len(new_lines)} lines")
else:
    print("No changes needed — all backdrop-filter already have webkit prefix")
