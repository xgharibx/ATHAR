with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

checks = [
    '.light .glass',
    '.light .skeleton',
    '.light .onboarding-card',
    '.light .onboarding-dot',
    '.light .quran-mem-span',
    '.light .glass-strong',
    '.light .form-field-readable',
]
for c in checks:
    status = 'FOUND' if c in content else 'MISSING'
    print(status + ': ' + c)
