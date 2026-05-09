"""Phase 86 audit: find all remaining toggle buttons without aria-pressed"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

# Find all IconButton/button with toggle-like labels or onClick patterns that lack aria-pressed
toggle_patterns = [
    'toggleFavorite', 'toggleBookmark', 'toggleDuaFavorite', 'toggleHadithBookmark',
    'toggleLibraryFavorite', 'toggleQuranBookmark', 'toggleMemorized', 'toggleMemo',
    'setFav', 'setBookmark', 'setFavorite',
]

print("=== Toggle buttons missing aria-pressed ===")
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
            # Check if this line has a toggle function call
            has_toggle = any(p in l for p in toggle_patterns)
            if not has_toggle: continue
            # Check if aria-pressed is nearby
            window = ''.join(lines[max(0,i-3):min(len(lines),i+3)])
            if 'aria-pressed' not in window:
                print(f'{rel}:{i+1}: {l[:120]}')

print("\n=== Quran bookmark buttons ===")
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
            if 'QuranBookmark' in l or 'quranBookmark' in l:
                window = ''.join(lines[max(0,i-3):min(len(lines),i+3)])
                if 'aria-pressed' not in window and 'aria-label' in window:
                    print(f'{rel}:{i+1}: {l[:120]}')

print("\nDone.")
