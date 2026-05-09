"""Phase 78d: Check focus return patterns in dialogs/sheets"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# Find files that have role="dialog" and check if they restore focus
print("=== Dialogs/sheets: focus return patterns ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        if 'role="dialog"' in content:
            has_focus_ref = 'triggerRef' in content or ('useRef' in content and '.focus()' in content)
            has_autofocus = 'autoFocus' in content
            has_focus_call = '.focus()' in content
            print(f'{rel}: dialog={True}, triggerRef={has_focus_ref}, autoFocus={has_autofocus}, .focus()={has_focus_call}')

# Check external links for security
print("\n=== External links missing rel=noopener ===")
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            l = line.strip()
            if 'target="_blank"' in l and 'noopener' not in l:
                # Check surrounding lines
                window = ''.join(lines[max(0,i-1):i+4])
                if 'noopener' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

print("\nDone.")
