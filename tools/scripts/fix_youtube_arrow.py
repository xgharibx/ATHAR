import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
path = 'src/components/video/YouTubeCoursePlayer.tsx'
with open(path, encoding='utf-8') as f:
    c = f.read()
old = '<ArrowRight size={13} />\n            </button>'
new = '<ArrowRight size={13} aria-hidden="true" />\n            </button>'
if old in c:
    print('FOUND, patching')
    c = c.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
else:
    print('NOT FOUND')
