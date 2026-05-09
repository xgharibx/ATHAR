"""Phase 55d: Decorative emoji aria-hidden in NotFound and OnboardingFlow."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# ── NotFound.tsx ──────────────────────────────────────────────────────────────
f = root / "src/pages/NotFound.tsx"
src = f.read_text(encoding="utf-8")

old1 = '''          {/* Arabic "404" */}
          <div className="text-8xl font-black opacity-10 leading-none select-none tabular-nums">
            ٤٠٤
          </div>

          <div className="mt-4 text-4xl">🔍</div>'''

new1 = '''          {/* Arabic "404" */}
          <div className="text-8xl font-black opacity-10 leading-none select-none tabular-nums" aria-hidden="true">
            ٤٠٤
          </div>

          <div className="mt-4 text-4xl" aria-hidden="true">🔍</div>'''

if old1 in src:
    src = src.replace(old1, new1, 1)
    print("  patched NotFound decorative emoji aria-hidden")
else:
    print("SKIP1: NotFound pattern not found")

f.write_text(src, encoding="utf-8")
print("PATCHED NotFound.tsx")

# ── OnboardingFlow.tsx ────────────────────────────────────────────────────────
f2 = root / "src/components/onboarding/OnboardingFlow.tsx"
src2 = f2.read_text(encoding="utf-8")

old2 = '          <div className="text-5xl mb-5 text-center">{current.emoji}</div>'
new2 = '          <div className="text-5xl mb-5 text-center" aria-hidden="true">{current.emoji}</div>'

if old2 in src2:
    src2 = src2.replace(old2, new2, 1)
    print("  patched OnboardingFlow step emoji aria-hidden")
else:
    print("SKIP2: OnboardingFlow emoji pattern not found")

f2.write_text(src2, encoding="utf-8")
print("PATCHED OnboardingFlow.tsx")
