with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

FORCED_COLORS_BLOCK = '''
/* ═══════════════════════════════════════════════════════════════
   Forced-colors (Windows High Contrast Mode) support
   ═══════════════════════════════════════════════════════════════ */
@media (forced-colors: active) {
  /* Restore borders that rely on color-mix/opacity — they become invisible in HCM */
  .glass,
  .glass-strong,
  .glass-card {
    border: 1px solid ButtonText;
  }
  /* Ensure progress rings have visible strokes */
  .progress-ring-circle {
    forced-color-adjust: none;
  }
  /* Keep accent-colored text readable */
  .text-\\[var\\(--accent\\)\\],
  .floating-nav-item.active span {
    forced-color-adjust: none;
  }
  /* Skeleton shimmer is meaningless in HCM — show as plain block */
  .skeleton {
    background: ButtonFace;
    animation: none;
  }
}

'''

# Insert after the prefers-contrast block
ANCHOR = '@media (prefers-contrast: more) {'
idx = content.find(ANCHOR)
if idx >= 0:
    # Find the closing } of this block
    depth = 0
    pos = idx
    while pos < len(content):
        if content[pos] == '{':
            depth += 1
        elif content[pos] == '}':
            depth -= 1
            if depth == 0:
                end = pos + 1
                break
        pos += 1
    
    content = content[:end] + FORCED_COLORS_BLOCK + content[end:]
    with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
        f.write(content)
    if 'forced-colors' in content:
        print('SUCCESS: forced-colors block added')
    else:
        print('ERROR: forced-colors not found after insertion')
else:
    print('ERROR: anchor (prefers-contrast) not found')
