"""Phase 67: Add aria-expanded + aria-hidden to footer toggle in AppShell."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/components/layout/AppShell.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

old = '''            <button type="button"
              onClick={() => setFooterExpanded((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 pt-5 pb-4"
            >
              <div className="arabic-text text-[15px] md:text-base font-semibold text-[var(--accent)]">
                صدقة جارية
              </div>
              <ChevronLeft
                size={16}
                className={cn("opacity-50 transition-transform duration-200", footerExpanded ? "-rotate-90" : "rotate-90")}
              />
            </button>'''

new = '''            <button type="button"
              onClick={() => setFooterExpanded((v) => !v)}
              aria-expanded={footerExpanded}
              aria-controls="footer-content"
              className="w-full flex items-center justify-between gap-3 px-5 pt-5 pb-4"
            >
              <div className="arabic-text text-[15px] md:text-base font-semibold text-[var(--accent)]">
                صدقة جارية
              </div>
              <ChevronLeft
                size={16}
                aria-hidden="true"
                className={cn("opacity-50 transition-transform duration-200", footerExpanded ? "-rotate-90" : "rotate-90")}
              />
            </button>'''

if old in c:
    c = c.replace(old, new)
    print('  OK  [footer expand button aria-expanded]')
else:
    print('  MISS[footer expand button aria-expanded]')

# Also add id to the footer content panel
old2 = '                <div className="mx-5 h-px bg-[var(--card)]" />'
new2 = '                <div id="footer-content" className="mx-5 h-px bg-[var(--card)]" />'

if old2 in c:
    # Actually add id to the wrapper div instead
    pass

# Add id to the content wrapper
old3 = '''              <>
                <div className="mx-5 h-px bg-[var(--card)]" />
                <div className="px-5 pb-5 pt-3 arabic-text text-center text-[13px] md:text-sm leading-7 md:leading-8 tracking-tight opacity-85 whitespace-pre-line">'''

new3 = '''              <div id="footer-content">
                <div className="mx-5 h-px bg-[var(--card)]" />
                <div className="px-5 pb-5 pt-3 arabic-text text-center text-[13px] md:text-sm leading-7 md:leading-8 tracking-tight opacity-85 whitespace-pre-line">'''

old4 = '''                </div>
              </>'''
new4 = '''                </div>
              </div>'''

for o, n, lbl in [(old3, new3, 'footer content div'), (old4, new4, 'footer content closing')]:
    if o in c:
        c = c.replace(o, n)
        print(f'  OK  [{lbl}]')
    else:
        print(f'  MISS[{lbl}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
