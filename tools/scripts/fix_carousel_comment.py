"""Fix DailyCarousel.tsx broken JSX comment."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\ui\DailyCarousel.tsx'
content = open(path, 'r', encoding='utf-8').read()

# Fix the broken comment - missing closing }
old = '      {/* Header label */\n      <div className="flex items-center justify-between px-4 pt-3 pb-0">'
new = '      {/* Header label */}\n      <div className="flex items-center justify-between px-4 pt-3 pb-0">'

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('FIXED: Broken JSX comment in DailyCarousel.tsx')
else:
    # Check what's there
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'Header label' in line:
            print(f'Line {i+1}: {repr(line)}')
            print(f'Line {i+2}: {repr(lines[i+1])}')
