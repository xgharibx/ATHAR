import re, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
issues = []

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
    
    # Find all <button ...> tags (possibly multi-line)
    # Match <button followed by everything until the closing >
    for m in re.finditer(r'<button\b([^>]*(?:>[^<]*(?:<(?!/button)[^>]*>[^<]*)*)*?)(?=/>|>)', content, re.DOTALL):
        tag_content = m.group(0)
        # Check next 200 chars for the closing >
        pos = m.start()
        # Find the actual closing > of the opening tag
        # Look for type= within the tag
        # Get a generous window around the <button
        window_start = pos
        window_end = min(pos + 300, len(content))
        window = content[window_start:window_end]
        # Find first > not inside a string
        # Simple approach: find where the tag ends
        tag_match = re.match(r'<button\b([^>]*)>', window, re.DOTALL)
        if tag_match:
            tag_attrs = tag_match.group(1)
            if 'type=' not in tag_attrs:
                line_num = content[:pos].count('\n') + 1
                issues.append((fpath, line_num, tag_attrs[:60].strip()))

print(str(len(issues)) + ' buttons truly missing type=')
by_file = {}
for fpath, lineno, attrs in issues:
    if fpath not in by_file:
        by_file[fpath] = []
    by_file[fpath].append((lineno, attrs))

for fpath, lst in sorted(by_file.items(), key=lambda x: -len(x[1])):
    print(f'\n{fpath} ({len(lst)} buttons):')
    for lineno, attrs in lst[:3]:
        print(f'  L{lineno}: {attrs[:70]}')
