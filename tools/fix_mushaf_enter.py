"""Add page-enter to Mushaf.tsx"""
with open(r'C:\Users\Amrab\Downloads\noor-adhkar\src\pages\Mushaf.tsx', encoding='utf-8') as f:
    content = f.read()

old = '      className="mushaf-reader"'
new_str = '      className="mushaf-reader page-enter"'

if old in content:
    content = content.replace(old, new_str, 1)
    with open(r'C:\Users\Amrab\Downloads\noor-adhkar\src\pages\Mushaf.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added page-enter to Mushaf.tsx")
else:
    print(f"Pattern not found: {repr(old)}")
    # Look for similar
    idx = content.find('mushaf-reader')
    if idx >= 0:
        print(f"Found mushaf-reader at: {repr(content[idx-5:idx+50])}")
