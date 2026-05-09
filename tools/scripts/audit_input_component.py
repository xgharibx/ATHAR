"""Audit all <Input component usages without aria-label/aria-labelledby/id."""
import re, os

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
results = []

for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            content = open(path, encoding='utf-8').read()
            lines = content.split('\n')
            for i, line in enumerate(lines):
                # Match <Input (the component, not <input)
                if re.search(r'<Input\s', line) and 'Input.displayName' not in line and 'forwardRef' not in line:
                    context = '\n'.join(lines[max(0, i-3):min(i+10, len(lines))])
                    if 'aria-label' not in context and 'aria-labelledby' not in context and '<label' not in context:
                        fname = path.replace(base + os.sep, '')
                        results.append(f'{fname}:{i+1}: {line.strip()[:100]}')

print("Input components without accessible labels:")
for r in results:
    print(r)
print(f'\nTotal: {len(results)}')
