#!/usr/bin/env python3
"""Append @media print styles to globals.css"""

import os

css_path = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'styles', 'globals.css')
css_path = os.path.normpath(css_path)

print_styles = r"""

/* ═══════════════════════════════════════════════════════
   @media print — clean printable output for adhkar cards
   ═══════════════════════════════════════════════════════ */
@media print {
  /* Hide navigation and interactive chrome */
  .app-shell-nav,
  .app-shell-header,
  .floating-nav,
  [data-radix-popper-content-wrapper],
  [data-sonner-toaster],
  .noor-starfield,
  .prayer-widget,
  .bottom-nav {
    display: none !important;
  }

  /* Reset backgrounds/colors to system defaults for ink saving */
  :root,
  .light {
    --bg: #ffffff;
    --fg: #000000;
    --card: #f5f5f5;
    --stroke: #cccccc;
    --muted: #555555;
    --muted-2: #777777;
    --accent: #000000;
  }

  body {
    background: #fff !important;
    color: #000 !important;
    font-size: 12pt;
  }

  /* Ensure full page width usage */
  main,
  [data-page],
  .page-root {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Keep dhikr cards legible */
  .dhikr-card,
  .card-base {
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 12pt;
  }

  /* Arabic text — keep diacritics visible */
  .font-arabic {
    font-size: 14pt;
    line-height: 2.2;
  }

  /* Show URLs after links */
  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 8pt;
    opacity: 0.6;
  }

  /* Page breaks */
  h1, h2, h3 {
    page-break-after: avoid;
    break-after: avoid;
  }
}
"""

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

if '@media print' in content:
    print('SKIP: @media print already exists in globals.css')
else:
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write(print_styles)
    print('OK: @media print styles appended to globals.css')
