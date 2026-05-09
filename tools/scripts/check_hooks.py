"""Find potential Rules of Hooks violations: hooks called after conditional returns."""
import re
import os

def check_file(filepath):
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')

    # Find all conditional returns in function bodies
    violations = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for early returns
        if re.match(r'\s*if\s*\(.*\)\s*\{?$', line) or re.match(r'\s*if\s*\(!', line):
            # Check if the next few lines contain a return
            block = '\n'.join(lines[i:min(i+5, len(lines))])
            if 'return' in block and 'return (' in block or 'return null' in block:
                # Check if there are hooks called AFTER this conditional return
                # Look for useMemo/useState/useCallback/useEffect in next 100 lines
                after_block = '\n'.join(lines[i+5:min(i+200, len(lines))])
                if re.search(r'React\.(useMemo|useState|useCallback|useEffect)\s*\(|(?:useMemo|useState|useCallback|useEffect)\s*\(', after_block):
                    violations.append((i+1, line.strip()[:60]))
        i += 1
    return violations

issues = {}
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')):
            continue
        fp = os.path.join(root, fn)
        violations = check_file(fp)
        if violations:
            issues[fp] = violations

for fp, viols in issues.items():
    print(f'\n{os.path.basename(fp)}:')
    for lineno, text in viols[:5]:
        print(f'  L{lineno}: {text}')

if not issues:
    print('No violations found!')
