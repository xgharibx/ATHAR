"""Scan all TSX pages for patterns that might look wrong in light mode"""
import re, glob, os

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))

issues = []

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    fname = fpath.replace('src\\', '').replace('src/', '')
    
    file_issues = []
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith('//') or s.startswith('*'): continue
        
        # Check for text-white NOT on a colored background element in same line
        if 'text-white' in s and not any(x in s for x in [
            'bg-', 'bg=', 'background', 'video', 'thumbnail', 'cover',
            'text-shadow', 'grade', 'color', 'book?.color', 'severity',
            'status', 'pill', 'badge', '#059669', '#ef4444', '#10b981',
            'overlay', 'accent'
        ]):
            # Might be text-white standalone on a token bg
            file_issues.append(f'  L{i+1}: text-white without obvious bg context: {s[:75]}')
        
        # Check for hardcoded bg-gray-N / bg-slate-N / bg-zinc-N that ignore theme
        if re.search(r'\bbg-(gray|slate|zinc|neutral)-(700|800|900)\b', s):
            file_issues.append(f'  L{i+1}: Dark gray bg (dark-only?): {s[:75]}')
    
    if file_issues:
        issues.append((fname, file_issues))

print(f'Found issues in {len(issues)} files:\n')
for fname, file_issues in issues[:20]:
    print(f'=== {fname} ===')
    for issue in file_issues[:6]:
        print(issue)
    print()
