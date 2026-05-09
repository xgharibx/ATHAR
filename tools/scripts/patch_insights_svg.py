"""Patch Insights.tsx: add role=img to radar chart SVG."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Insights.tsx'
content = open(path, 'r', encoding='utf-8').read()

old = '    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="\u0645\u062e\u0637\u0637 \u0627\u0644\u0631\u0627\u062f\u0627\u0631">'
new = '    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="\u0645\u062e\u0637\u0637 \u0627\u0644\u0631\u0627\u062f\u0627\u0631">'

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED radar chart SVG role')
elif new in content:
    print('ALREADY_HAS role=img')
else:
    print('NOT_FOUND - checking what is there')
    import re
    matches = re.findall(r'<svg[^>]*aria-label[^>]*>', content)
    for m in matches:
        print(repr(m))
