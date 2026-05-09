"""Phase 86: Add aria-pressed to remaining toggle buttons in Library, Companions, ProphetStories, Mushaf"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

changes = 0

# --- Library.tsx ---
lib_path = os.path.join(WORKSPACE, 'src', 'pages', 'Library.tsx')
with open(lib_path, encoding='utf-8') as f:
    content = f.read()

old = '<IconButton aria-label="\u0645\u0641\u0636\u0644\u0629" onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>'
new = '<IconButton aria-label="\u0645\u0641\u0636\u0644\u0629" aria-pressed={favorite} onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>'
if old in content:
    content = content.replace(old, new, 1)
    print('OK: Library.tsx - added aria-pressed to favorite button')
    changes += 1
else:
    print('FAIL: Library.tsx - favorite button not found')
with open(lib_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- LibraryItem.tsx ---
libitem_path = os.path.join(WORKSPACE, 'src', 'pages', 'LibraryItem.tsx')
with open(libitem_path, encoding='utf-8') as f:
    content = f.read()

old = '<IconButton aria-label="\u0645\u0641\u0636\u0644\u0629" onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>'
new = '<IconButton aria-label="\u0645\u0641\u0636\u0644\u0629" aria-pressed={favorite} onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>'
if old in content:
    content = content.replace(old, new, 1)
    print('OK: LibraryItem.tsx - added aria-pressed to favorite button')
    changes += 1
else:
    print('FAIL: LibraryItem.tsx - favorite button not found')
with open(libitem_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- Mushaf.tsx: bookmark action button ---
mushaf_path = os.path.join(WORKSPACE, 'src', 'pages', 'Mushaf.tsx')
with open(mushaf_path, encoding='utf-8') as f:
    content = f.read()

old = '''            aria-label="\u0639\u0644\u0627\u0645\u0629"
          >
            <Bookmark size={18} fill={isSelBookmarked ? "currentColor" : "none"} />
            <span>\u0639\u0644\u0627\u0645\u0629</span>'''
new = '''            aria-label={isSelBookmarked ? "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629" : "\u0625\u0636\u0627\u0641\u0629 \u0639\u0644\u0627\u0645\u0629"}
            aria-pressed={isSelBookmarked}
          >
            <Bookmark size={18} fill={isSelBookmarked ? "currentColor" : "none"} />
            <span>\u0639\u0644\u0627\u0645\u0629</span>'''
if old in content:
    content = content.replace(old, new, 1)
    print('OK: Mushaf.tsx - added aria-pressed + dynamic label to bookmark button')
    changes += 1
else:
    print('FAIL: Mushaf.tsx - bookmark button not found')
with open(mushaf_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- Companions.tsx: bookmark button ---
companions_path = os.path.join(WORKSPACE, 'src', 'pages', 'Companions.tsx')
with open(companions_path, encoding='utf-8') as f:
    content = f.read()

old = '''                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(companion.id, e)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all glass-hover press-effect"'''
new = '''                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(companion.id, e)}
                      aria-pressed={bookmarks.has(companion.id)}
                      aria-label={bookmarks.has(companion.id) ? "\u0625\u0644\u063a\u0627\u0621 \u062d\u0641\u0638 \u0627\u0644\u0635\u062d\u0627\u0628\u064a" : "\u062d\u0641\u0638 \u0627\u0644\u0635\u062d\u0627\u0628\u064a"}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all glass-hover press-effect"'''
if old in content:
    content = content.replace(old, new, 1)
    print('OK: Companions.tsx - added aria-pressed + aria-label to bookmark button')
    changes += 1
else:
    print('FAIL: Companions.tsx - bookmark button not found')
with open(companions_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- ProphetStories.tsx: bookmark button ---
ps_path = os.path.join(WORKSPACE, 'src', 'pages', 'ProphetStories.tsx')
with open(ps_path, encoding='utf-8') as f:
    content = f.read()

old = '''            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(story.id); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"'''
new = '''            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(story.id); }}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "\u0625\u0644\u063a\u0627\u0621 \u062d\u0641\u0638 \u0627\u0644\u0642\u0635\u0629" : "\u062d\u0641\u0638 \u0627\u0644\u0642\u0635\u0629"}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"'''
if old in content:
    content = content.replace(old, new, 1)
    print('OK: ProphetStories.tsx - added aria-pressed + aria-label to bookmark button')
    changes += 1
else:
    print('FAIL: ProphetStories.tsx - bookmark button not found')
with open(ps_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes: {changes}')
