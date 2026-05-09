import os, re

# Check for any missing 'dir=rtl' on Arabic text containers that should have it
issues = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        # Count dir attributes
        dir_count = content.count('dir="rtl"') + content.count("dir='rtl'")
        # Count Arabic text classes
        arabic_count = content.count('arabic-text') + content.count('font-arabic')
        if arabic_count > 0 and dir_count == 0:
            issues.append(f'{fp}: has Arabic text classes but no dir=rtl ({arabic_count} arabic, {dir_count} dir)')

print(f'Files with Arabic text but no dir=rtl:')
for iss in issues[:15]:
    print(' ', iss)
