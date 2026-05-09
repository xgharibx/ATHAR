"""Scan pages for optimization opportunities."""
import re
import os

results = []
for fn in os.listdir('src/pages'):
    if not fn.endswith('.tsx'):
        continue
    fp = os.path.join('src/pages', fn)
    with open(fp, encoding='utf-8') as f:
        content = f.read()
    lines = content.count('\n')
    memo = len(re.findall(r'useMemo', content))
    callback = len(re.findall(r'useCallback', content))
    raw_computes = len(re.findall(r'(?:\.filter|\.map|\.sort|\.reduce)\s*\(', content))
    results.append((fn, lines, memo, callback, raw_computes))

results.sort(key=lambda x: x[4] - x[2]*3, reverse=True)
header = "{:<30} {:>6} {:>5} {:>4} {:>9}".format("File", "Lines", "Memo", "CB", "Computes")
print(header)
print('-' * 58)
for fn, lines, memo, cb, comp in results[:20]:
    flag = " <--" if comp > memo else ""
    row = "{:<30} {:>6} {:>5} {:>4} {:>9}{}".format(fn, lines, memo, cb, comp, flag)
    print(row)
