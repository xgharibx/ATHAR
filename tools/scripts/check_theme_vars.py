"""Check what CSS variables each theme overrides"""
import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Find theme class declarations
themes = ['noor', 'midnight', 'forest', 'bees', 'roses', 'sapphire', 'violet', 'sunset', 'mist', 'light']

for theme in themes:
    # Find .theme { ... } block
    pattern = r'\.' + re.escape(theme) + r'\s*\{([^}]*)\}'
    matches = list(re.finditer(pattern, content))
    if matches:
        for m in matches[:2]:  # Show first 2 matches (in case multiple overrides)
            lineno = content[:m.start()].count('\n') + 1
            body = m.group(1).strip()
            # Look for --accent definition
            accent_match = re.search(r'--accent\s*:\s*([^;]+)', body)
            print(f'.{theme} (L{lineno}):')
            if accent_match:
                print(f'  --accent: {accent_match.group(1).strip()}')
            else:
                print(f'  (no --accent override)')
            # Also show other vars
            vars = re.findall(r'--\w[\w-]*\s*:[^;]+', body)
            for v in vars[:4]:
                print(f'  {v.strip()}')
            print()
    else:
        print(f'.{theme}: NOT FOUND\n')
