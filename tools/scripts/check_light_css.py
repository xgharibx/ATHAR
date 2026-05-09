"""Find rgba(255,255,255,...) patterns in globals.css that lack .light overrides."""
import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find all rgba(255,255,255,...) outside comments
issues = []
i = 0
while i < len(lines):
    line = lines[i]
    if re.search(r'rgba\s*\(\s*255\s*,\s*255\s*,\s*255', line):
        # Find the class context
        ctx_start = max(0, i-15)
        ctx = '\n'.join(lines[ctx_start:i+1])
        # Check if this is inside a .light block
        light_context = '.light' in ctx or 'transparent-mode' in ctx or '@keyframes' in ctx
        comment = line.strip().startswith('/*') or line.strip().startswith('*')
        if not light_context and not comment:
            # Find the enclosing selector
            selector = ""
            for j in range(i, -1, -1):
                if re.search(r'^\s*[\.\#\[\*a-zA-Z][\w\-\[\]:., >+~]*\s*\{', lines[j]):
                    selector = lines[j].strip()
                    break
            issues.append((i+1, selector[:60], line.strip()[:80]))
    i += 1

print(f"{'Line':<6} {'Selector':<50} Value")
print('-' * 120)
for lineno, sel, val in issues[:30]:
    print(f"{lineno:<6} {sel:<50} {val}")
print(f"\nTotal: {len(issues)}")
