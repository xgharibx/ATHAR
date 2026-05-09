"""Audit aria-pressed buttons without group wrappers."""
import re, os

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            content = open(path, encoding='utf-8').read()
            for m in re.finditer(r'aria-pressed=\{(?!true|false)', content):
                start = max(0, m.start()-600)
                ctx = content[start:m.start()]
                has_group = 'role="group"' in ctx or 'role="tablist"' in ctx
                if not has_group:
                    line = content[:m.start()].count('\n') + 1
                    fname = path.replace(base + os.sep, '')
                    val_end = content.find('}', m.end())
                    val = content[m.end():val_end+1]
                    print(f'{fname}:{line}: {val}')
