with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

HIGH_CONTRAST_BLOCK = '''
/* ═══════════════════════════════════════════════════════════════
   High-contrast accessibility: boost muted opacity & borders
   ═══════════════════════════════════════════════════════════════ */
@media (prefers-contrast: more) {
  :root {
    --muted:   rgba(245, 247, 255, 0.92);
    --muted-2: rgba(245, 247, 255, 0.80);
    --stroke:  rgba(255, 255, 255, 0.22);
    --card:    rgba(255, 255, 255, 0.10);
    --card-2:  rgba(255, 255, 255, 0.15);
  }
  .light {
    --muted:   rgba(15, 19, 37, 0.88);
    --muted-2: rgba(15, 19, 37, 0.72);
    --stroke:  rgba(15, 19, 37, 0.30);
    --card:    rgba(15, 19, 37, 0.10);
    --card-2:  rgba(15, 19, 37, 0.16);
  }
  /* Ensure muted text elements hit contrast thresholds */
  .opacity-50, .opacity-55, .opacity-60, .opacity-65 { opacity: 0.85 !important; }
  .opacity-40, .opacity-45 { opacity: 0.72 !important; }
  .opacity-30, .opacity-35 { opacity: 0.60 !important; }
  /* Thicker focus ring in high contrast */
  :focus-visible {
    outline-width: 3px;
    outline-offset: 4px;
  }
}

'''

# Insert after the text-size-adjust block
ANCHOR = 'html {\n  -webkit-text-size-adjust: 100%;\n  text-size-adjust: 100%;\n}'
if ANCHOR in content:
    content = content.replace(ANCHOR, ANCHOR + HIGH_CONTRAST_BLOCK, 1)
    with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
        f.write(content)
    # Verify
    if 'prefers-contrast' in content:
        print('SUCCESS: prefers-contrast block added')
    else:
        print('ERROR: block not found after replace')
else:
    print('ERROR: anchor not found in CSS')
    # Print surrounding text
    idx = content.find('text-size-adjust')
    print(f'Context at text-size-adjust: {repr(content[max(0,idx-100):idx+200])}')
