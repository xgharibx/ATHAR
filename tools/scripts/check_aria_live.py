"""Find search/filter pages without aria-live."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
src_dir = 'src/pages'
results = []
for fname in os.listdir(src_dir):
    if not fname.endswith('.tsx'):
        continue
    path = os.path.join(src_dir, fname)
    with open(path, encoding='utf-8') as f:
        c = f.read()
    has_filter = ('filter' in c.lower()) and ('input' in c.lower() or 'search' in c.lower())
    has_live = ('aria-live' in c) or ('role="status"' in c) or ('role="alert"' in c)
    if has_filter and not has_live:
        results.append(fname)
print('Pages with filter but no aria-live:')
for r in results:
    print(' ', r)
print('Done.')
