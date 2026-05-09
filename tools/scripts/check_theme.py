import re

with open('src/store/noorStore.ts', encoding='utf-8') as f:
    content = f.read()

# Find zustand persist config name
m = re.search(r'name:\s*["\']([^"\']+)["\']', content)
if m:
    print('Persist key: ' + m.group(1))

# Find theme type
idx = content.find('NoorTheme')
if idx >= 0:
    print('\nNoorTheme context:')
    print(content[idx:idx+200])

# Find useApplyTheme to understand how theme is applied
with open('src/hooks/useApplyTheme.ts', encoding='utf-8') as f:
    theme_content = f.read()
print('\nuseApplyTheme.ts:')
print(theme_content[:800])
