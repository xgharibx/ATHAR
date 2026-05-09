"""Phase 80: Add aria-orientation=horizontal to all role=tablist elements missing it"""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(WORKSPACE, 'src')

changed_files = 0
changed_total = 0

for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for fn in files:
        if not fn.endswith('.tsx'): continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, WORKSPACE)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        
        # Only process files with role="tablist" without aria-orientation
        if 'role="tablist"' not in content:
            continue
        
        # Count before
        before = content.count('role="tablist"')
        already = content.count('aria-orientation')
        
        # Replace role="tablist" with role="tablist" aria-orientation="horizontal"
        # Only where aria-orientation is NOT already nearby (within 3 chars of the tablist)
        new_content = re.sub(
            r'role="tablist"(?!\s*aria-orientation)',
            'role="tablist" aria-orientation="horizontal"',
            content
        )
        
        if new_content != content:
            count = new_content.count('aria-orientation="horizontal"') - content.count('aria-orientation="horizontal"')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            changed_total += count
            changed_files += 1
            print(f'OK    {rel}: +{count} aria-orientation')

print(f'\nTotal: {changed_total} attributes added in {changed_files} files')
