import re, glob

all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True))
issues = []

for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        
        # Find <button without type=
        if re.search(r'<button\b(?![^>]*\btype=)', line):
            issues.append((fpath, i+1, 'button missing type', stripped[:90]))

print(str(len(issues)) + ' buttons missing type=')
for fpath, lineno, kind, text in issues[:15]:
    print(fpath + ':L' + str(lineno) + ': ' + text)
