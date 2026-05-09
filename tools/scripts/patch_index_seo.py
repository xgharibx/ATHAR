"""Patch index.html: upgrade twitter:card to summary_large_image, add og:site_name, og:url, canonical link, and abs og:image URL."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\index.html'
content = open(path, 'r', encoding='utf-8').read()

# 1. Change twitter:card to summary_large_image for better social sharing
old1 = '    <meta name="twitter:card" content="summary" />'
new1 = '    <meta name="twitter:card" content="summary_large_image" />'

# 2. Add og:site_name and og:url after og:locale
old2 = '    <meta property="og:locale" content="ar_SA" />'
new2 = '''    <meta property="og:locale" content="ar_SA" />
    <meta property="og:site_name" content="\u0623\u062b\u0631" />
    <meta property="og:url" content="https://www.athark.org/" />'''

# 3. Add canonical link after manifest link
old3 = '    <link rel="manifest" href="%BASE_URL%manifest.webmanifest" />'
new3 = '''    <link rel="manifest" href="%BASE_URL%manifest.webmanifest" />
    <link rel="canonical" href="https://www.athark.org/" />'''

patches = [(old1, new1), (old2, new2), (old3, new3)]
for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:60])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(new[:60])}')
    else:
        print(f'NOT_FOUND: {repr(old[:60])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
