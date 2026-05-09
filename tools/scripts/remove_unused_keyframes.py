"""Remove unused @keyframes blocks from globals.css"""
import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

orig_len = len(content)

# Remove @keyframes quranSheetIn block (not quranSheetInCenter!)
# Pattern: @keyframes quranSheetIn { ... } where name is exactly quranSheetIn
# Use word boundary to avoid matching quranSheetInCenter
def remove_keyframe(css, name):
    # Match @keyframes <exact-name> { ... } — handles nested braces
    pattern = r'@keyframes ' + re.escape(name) + r'\s*\{[^}]*\}\s*\n?'
    new_css = re.sub(pattern, '', css)
    return new_css

# Remove quranSheetIn (but NOT quranSheetInCenter)
# We need to check it's not followed by 'Center'
content_new = re.sub(
    r'@keyframes quranSheetIn(?!Center)\s*\{[^}]*\}\s*\n?',
    '',
    content
)

# Remove cornerSpin
content_new = re.sub(
    r'@keyframes cornerSpin\s*\{[^}]*\}\s*\n?',
    '',
    content_new
)

removed = orig_len - len(content_new)
print(f'Removed {removed} characters')

# Verify
if 'quranSheetIn\n' in content_new or '@keyframes quranSheetIn {' in content_new:
    print('WARNING: quranSheetIn still present!')
else:
    print('OK: quranSheetIn removed')

if '@keyframes cornerSpin' in content_new:
    print('WARNING: cornerSpin still present!')
else:
    print('OK: cornerSpin removed')

if '@keyframes quranSheetInCenter' in content_new:
    print('OK: quranSheetInCenter preserved')
else:
    print('WARNING: quranSheetInCenter was incorrectly removed!')

with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
    f.write(content_new)

print('Done.')
