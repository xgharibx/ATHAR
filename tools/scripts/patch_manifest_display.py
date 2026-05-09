"""Patch vite.config.ts: add display_override to manifest for better PWA desktop support."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\vite.config.ts'
content = open(path, 'r', encoding='utf-8').read()

old = '        display: "standalone",\n        orientation: "portrait-primary",\n        categories: ["lifestyle", "education", "utilities"],'
new = '        display: "standalone",\n        display_override: ["window-controls-overlay", "standalone"],\n        orientation: "portrait-primary",\n        categories: ["lifestyle", "education", "utilities"],'

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: display_override added')
elif new in content:
    print('ALREADY_HAS display_override')
else:
    print('NOT_FOUND')
