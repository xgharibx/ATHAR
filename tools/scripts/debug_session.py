with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('mushaf-session-card')
if idx >= 0:
    print('Found at', idx)
    # Print the surrounding context
    chunk = content[idx-2:idx+500]
    print(repr(chunk))
else:
    print('Not found')
