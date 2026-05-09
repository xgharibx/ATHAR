import re, glob

with open('src/styles/globals.css', encoding='utf-8') as f:
    css = f.read()

# Find all @keyframes names
keyframes = re.findall(r'@keyframes\s+([a-zA-Z_-]+)', css)

# Find all animation-name usages in CSS
used_in_css = set(re.findall(r'animation(?:-name)?\s*:\s*([a-zA-Z_-]+)', css))

# Also check animation shorthand (animation: name duration ...)
shorthand_names = re.findall(r'animation\s*:\s*([a-zA-Z_-]+)', css)
used_in_css.update(shorthand_names)

# Also check multiple animations: animation: anim1 0.3s, anim2 0.5s
# Find in TSX files
all_tsx = sorted(glob.glob('src/**/*.tsx', recursive=True)) + sorted(glob.glob('src/**/*.ts', recursive=True))
used_in_tsx = set()
for fpath in all_tsx:
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
    for name in keyframes:
        if name in content:
            used_in_tsx.add(name)

print(f'Total keyframes: {len(keyframes)}')
print()

for name in keyframes:
    in_css = name in used_in_css
    in_tsx = name in used_in_tsx
    if not in_css and not in_tsx:
        print(f'  UNUSED? -> {name}')
    elif not in_css:
        print(f'  TSX only -> {name}')

print()
print('All usage:')
for name in keyframes:
    in_css = name in used_in_css
    in_tsx = name in used_in_tsx
    markers = []
    if in_css: markers.append('CSS')
    if in_tsx: markers.append('TSX')
    print(f'  {name}: {", ".join(markers) if markers else "UNUSED"}')
