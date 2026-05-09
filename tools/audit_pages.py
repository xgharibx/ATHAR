"""
Check page design consistency patterns
"""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src\pages"
pages = [f for f in os.listdir(ROOT) if f.endswith('.tsx')]

for page in sorted(pages):
    with open(os.path.join(ROOT, page), encoding='utf-8') as f:
        content = f.read()
    
    has_stars = 'dhikr-card-stars' in content or 'dhikr-page-stars' in content
    has_gradient = 'bg-gradient-to' in content
    has_back_btn = 'navigate(-1)' in content or 'ArrowRight' in content
    has_title_h1 = '<h1 ' in content
    has_page_enter = 'page-enter' in content
    
    flags = []
    if not has_stars: flags.append('no-stars')
    if not has_gradient: flags.append('no-gradient')
    if not has_back_btn: flags.append('no-back')
    if not has_title_h1: flags.append('no-h1')
    if not has_page_enter: flags.append('NO-ENTER')
    
    status = " | ".join(flags) if flags else "OK"
    print(f"{page}: {status}")
