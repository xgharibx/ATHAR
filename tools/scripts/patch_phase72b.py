"""Phase 72b: VideoLibrary search results aria-live, no-results role=status."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'VideoLibrary.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add sr-only live region with result count inside search results section
    (
        '      {searchResults && q.trim() && (\n'
        '        <div className="space-y-4">',
        '      {searchResults && q.trim() && (\n'
        '        <div className="space-y-4">\n'
        '          <div className="sr-only" aria-live="polite" aria-atomic="true">\n'
        '            {searchResults.videos.length === 0 && searchResults.courses.length === 0\n'
        '              ? `لا نتائج للبحث عن "${q}"`\n'
        '              : `${searchResults.videos.length + searchResults.courses.length} نتيجة للبحث عن "${q}"`}\n'
        '          </div>',
        'VideoLibrary search results aria-live region'
    ),
    # No-results div gets role=status
    (
        '          {searchResults.videos.length === 0 && searchResults.courses.length === 0 && (\n'
        '            <div className="glass rounded-3xl p-7 text-center">',
        '          {searchResults.videos.length === 0 && searchResults.courses.length === 0 && (\n'
        '            <div className="glass rounded-3xl p-7 text-center" role="status">',
        'VideoLibrary no-results div role=status'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
