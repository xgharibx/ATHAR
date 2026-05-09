"""Phase 69c: Find buttons with only icon children (no visible text, no aria-label)."""
import sys, os, glob, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/*.tsx')
issues = []
for f in sorted(files):
    with open(f, encoding='utf-8') as fp:
        c = fp.read()
    # Look for <button ...> that have aria-label to count how many do
    # Then find buttons without aria-label
    lines = c.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        # Multi-line button start
        if re.search(r'<button\b', line) and 'aria-label' not in line:
            # Look ahead for aria-label within next 5 lines
            snippet = '\n'.join(lines[i:i+6])
            if 'aria-label' not in snippet and 'aria-labelledby' not in snippet:
                # Check if button has visible text (not just icon)
                button_content = '\n'.join(lines[i:i+8])
                has_text = bool(re.search(r'>[^<{]+</', button_content)) or \
                           bool(re.search(r'>{[^}]+}</', button_content)) or \
                           bool(re.search(r'>\s*[^\s{<][^<]*</', button_content))
                # Only flag if it looks like icon-only (very short visible content)
                if not has_text and ('<svg' in button_content or 'size={' in button_content or 'className' in button_content):
                    issues.append((os.path.relpath(f), i+1, line.strip()[:100]))
        i += 1

print(f'Potentially unlabeled icon-only buttons: {len(issues)}')
for f, ln, l in issues[:30]:
    print(f'  {f} L{ln}: {l}')
