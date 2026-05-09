"""Phase 81 audit: find loading patterns without aria-busy"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# 1. Loading state patterns: isLoading, loading, isFetching without aria-busy nearby
print("=== Loading state patterns lacking aria-busy ===")
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
            # Look for JSX elements with loading boolean prop
            if re.search(r'aria-busy', l): continue
            if re.search(r'isLoading|loading|isFetching', l) and ('?' in l or '{' in l):
                # Only if it looks like JSX (has < or className or role)
                if ('<' in l or 'className' in l) and 'aria-busy' not in l:
                    print(f'{rel}:{i+1}: {l[:120]}')

# 2. Spinner / loading divs
print("\n=== Spinner/skeleton containers ===")
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
            if 'animate-spin' in l or 'skeleton' in l.lower() or 'animate-pulse' in l:
                if 'aria-' not in l:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 3. autocomplete on inputs
print("\n=== text inputs without autocomplete attribute ===")
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
            if 'type="text"' in l and 'autoComplete' not in l:
                window = ''.join(lines[i:min(len(lines),i+5)])
                if 'autoComplete' not in window and 'placeholder' in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

# 4. inputmode missing on numeric inputs
print("\n=== number/tel inputs without inputMode ===")
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
            if ('type="number"' in l or 'type="tel"' in l) and 'inputMode' not in l:
                window = ''.join(lines[i:min(len(lines),i+5)])
                if 'inputMode' not in window:
                    print(f'{rel}:{i+1}: {l[:100]}')

print("\nDone.")
