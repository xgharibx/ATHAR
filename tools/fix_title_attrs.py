"""Remove title= from interactive button elements in Mushaf and Ruqyah"""
import re

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src"

fixes = {
    # Mushaf: remove title from download button that already has aria-label
    r"pages\Mushaf.tsx": [
        ('      title="تحميل الصفحة لهذا القارئ"\n', ''),
    ],
    # Ruqyah: remove title from IconButton (aria-label already there)
    r"pages\Ruqyah.tsx": [
        ('<IconButton aria-label="\u0645\u0634\u0627\u0631\u0643\u0629" onClick={doShare} title="\u0645\u0634\u0627\u0631\u0643\u0629">',
         '<IconButton aria-label="\u0645\u0634\u0627\u0631\u0643\u0629" onClick={doShare}>'),
        ('<IconButton aria-label="\u0646\u0633\u062e" onClick={doCopy} title="\u0646\u0633\u062e">',
         '<IconButton aria-label="\u0646\u0633\u062e" onClick={doCopy}>'),
    ],
}

for rel, changes in fixes.items():
    path = ROOT + "\\" + rel
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    for old, new in changes:
        content = content.replace(old, new)
    
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Fixed: {rel}")
    else:
        print(f"  No match found: {rel}")
        # Debug: check if the text is there
        for old, _ in changes:
            if old in original:
                print(f"    -> Found: {repr(old[:40])}")
            else:
                print(f"    -> NOT found: {repr(old[:40])}")
