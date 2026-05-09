"""Add page-enter to Sources.tsx"""
with open(r'C:\Users\Amrab\Downloads\noor-adhkar\src\pages\Sources.tsx', encoding='utf-8') as f:
    content = f.read()

old = '<div className="space-y-4">'
new_str = '<div className="space-y-4 page-enter">'

if old in content:
    content = content.replace(old, new_str, 1)
    with open(r'C:\Users\Amrab\Downloads\noor-adhkar\src\pages\Sources.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added page-enter to Sources.tsx")
else:
    print(f"Pattern not found: {repr(old)}")
