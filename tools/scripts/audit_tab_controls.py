"""Phase 73 audit: Find tablist patterns where tabs lack aria-controls."""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
issues = []
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in ['__pycache__']]
    for f in files:
        if not f.endswith('.tsx'):
            continue
        path = os.path.join(root, f)
        with open(path, encoding='utf-8') as fp:
            lines = fp.readlines()
        for i, line in enumerate(lines):
            if 'role="tab"' in line:
                # Check 6-line window for aria-controls
                window = ''.join(lines[max(0,i-2):i+4])
                if 'aria-controls' not in window:
                    rel = os.path.relpath(path, base)
                    issues.append((rel, i+1, line.strip()[:80]))

if issues:
    for rel, ln, text in issues:
        print(f'{rel}:{ln}: {text}')
else:
    print('All role="tab" elements have aria-controls in their window.')
print('Done.')
