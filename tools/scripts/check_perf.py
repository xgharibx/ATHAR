import os

src = 'src/pages'
results = []
for fname in os.listdir(src):
    if fname.endswith('.tsx'):
        path = os.path.join(src, fname)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        lines = content.count('\n')
        has_usememo = 'useMemo' in content
        has_usecallback = 'useCallback' in content
        has_filter = '.filter(' in content
        has_sort = '.sort(' in content
        count_usememo = content.count('useMemo')
        flags = []
        if not has_usememo and (has_filter or has_sort):
            flags.append('NO-MEMO')
        results.append((lines, fname, count_usememo, has_usecallback, ' '.join(flags)))

results.sort(reverse=True)
print('Lines | File                              | useMemo | uc | flags')
print('-'*75)
for lines, fname, cum, uc, flags in results[:20]:
    print('%5d | %-35s | %d      | %s  | %s' % (lines, fname, cum, uc, flags))
