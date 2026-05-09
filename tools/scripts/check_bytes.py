import sys
with open('src/pages/Settings.tsx', 'rb') as f:
    content = f.read()
l1 = b'role="list"'
l2 = b'role="listitem"'
print('list:', content.count(l1))
print('listitem:', content.count(l2))
# Show position of first listitem
idx = content.find(l2)
print('first listitem at byte:', idx)
if idx >= 0:
    print('context:', content[idx-30:idx+40])
