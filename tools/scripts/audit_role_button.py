"""Phase 73 audit: Find role=button without aria-label."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in ['__pycache__']]
    for f in files:
        if not f.endswith('.tsx'):
            continue
        path = os.path.join(root, f)
        with open(path, encoding='utf-8') as fp:
            lines = fp.readlines()
        for i, line in enumerate(lines):
            if 'role="button"' in line and 'aria-label' not in line:
                window = ''.join(lines[max(0,i-2):i+3])
                if 'aria-label' not in window:
                    rel = os.path.relpath(path, base)
                    print(f'{rel}:{i+1}: {line.strip()[:100]}')
print('Done.')
