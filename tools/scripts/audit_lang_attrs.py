"""Audit English text without lang='en' attribute in Arabic pages.
Look for patterns like:
- <span lang="en"> usage
- English-only words appearing in the app
"""
import re, os

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
results = []

patterns = [
    r'lang="en"',
    r"lang='en'",
    r'lang=\{',
]

for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            content = open(path, encoding='utf-8').read()
            for p in patterns:
                matches = re.findall(p, content)
                if matches:
                    fname = path.replace(base + os.sep, '')
                    results.append(f'{fname}: {len(matches)} occurrences')

print("Files using lang attribute:")
for r in results:
    print(r)
print(f'\nTotal files: {len(results)}')

# Also look for English text in JSX that should have lang=en
print('\n--- English text in JSX without lang attr ---')
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            content = open(path, encoding='utf-8').read()
            lines = content.split('\n')
            for i, line in enumerate(lines):
                # Look for patterns like "lang="en"" already present
                if 'lang="en"' in line or "lang='en'" in line:
                    fname = path.replace(base + os.sep, '')
                    print(f'{fname}:{i+1}: {line.strip()[:90]}')
