import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with open('src/pages/Settings.tsx', encoding='utf-8') as f:
    content = f.read()

count = len(re.findall(r'aria-pressed', content))
print(f'aria-pressed count in Settings.tsx: {count}')

lines = content.split('\n')
for i, line in enumerate(lines):
    cond1 = 'onClick={() => setPrefs(' in line or 'onClick={() => setReminders({' in line
    if not cond1:
        continue
    window = '\n'.join(lines[max(0,i-3):min(len(lines),i+3)])
    prev_lines = '\n'.join(lines[max(0,i-2):i+1])
    if 'aria-pressed' not in window and 'type="button"' in prev_lines:
        print(f'L{i+1}: {line.strip()[:80]}')
