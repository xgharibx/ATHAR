"""Patch Favorites.tsx: add keyboard navigation to tablist."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Favorites.tsx'
content = open(path, 'r', encoding='utf-8').read()

# Add onKeyDown handler to the tablist div
old = '        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="\u062a\u0628\u0648\u064a\u0628\u0627\u062a \u0627\u0644\u0645\u0641\u0636\u0644\u0629">'
new = '''        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="\u062a\u0628\u0648\u064a\u0628\u0627\u062a \u0627\u0644\u0645\u0641\u0636\u0644\u0629"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}
        >'''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: Favorites tablist keyboard navigation')
else:
    print('NOT_FOUND')
