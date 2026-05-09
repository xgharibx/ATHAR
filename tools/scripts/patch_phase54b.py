"""Patch Phase 54b: Add role=listitem to RuqyahItemCard root div."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Ruqyah.tsx'
content = open(path, encoding='utf-8').read()

old = '''    <div
      className={cn(
        "rounded-3xl border p-4 transition-all",
        done
          ? "border-[color-mix(in_srgb,var(--ok)_30%,transparent)] bg-ok-5"
          : "border-[var(--stroke)] glass"
      )}
    >'''

new = '''    <div
      role="listitem"
      className={cn(
        "rounded-3xl border p-4 transition-all",
        done
          ? "border-[color-mix(in_srgb,var(--ok)_30%,transparent)] bg-ok-5"
          : "border-[var(--stroke)] glass"
      )}
    >'''

if old in content:
    content = content.replace(old, new, 1)
    print("Ruqyah: PATCHED RuqyahItemCard role=listitem")
else:
    print("Ruqyah: RuqyahItemCard root NOT found")
open(path, 'w', encoding='utf-8').write(content)
print("Done.")
