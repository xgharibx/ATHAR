"""More accurate audit of inputs without accessibility labels."""
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
                if '<input' in line:
                    # Get context (10 lines to catch multiline attributes)
                    context = '\n'.join(lines[max(0, i-2):min(i+12, len(lines))])
                    # Skip if hidden type
                    if 'type="hidden"' in line or 'type="file"' in line:
                        continue
                    # Skip if inside <label> block (check 3 lines above)
                    pre_context = '\n'.join(lines[max(0, i-3):i+1])
                    if '<label' in pre_context or 'htmlFor' in pre_context:
                        continue
                    # Check for aria-label in next 12 lines
                    if 'aria-label' not in context and 'aria-labelledby' not in context:
                        fname = path.replace(base + os.sep, '')
                        results.append(f'{fname}:{i+1}: {line.strip()[:100]}')

print("Inputs without accessible labels:")
for r in results:
    print(r)
print(f'\nTotal: {len(results)}')
