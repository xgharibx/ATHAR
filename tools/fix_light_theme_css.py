"""
Phase 8: Fix light-theme visibility issues in globals.css.

1. Skeleton shimmer animation: white-on-white is invisible on light theme.
   Fix: add .light .skeleton override with dark-on-light gradients.

2. Glass card background: white opacity on white BG is invisible.
   Fix: add .light .glass override with dark-on-light gradients.
"""

import pathlib
import sys

css_path = pathlib.Path("src/styles/globals.css")
if not css_path.exists():
    print("ERROR: globals.css not found")
    sys.exit(1)

css = css_path.read_text(encoding="utf-8")

# ── 1. Skeleton light theme fix ───────────────────────────────────────────────

SKELETON_ORIG = """.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.08) 40%,
    rgba(255, 255, 255, 0.04) 80%
  );
  background-size: 200% 100%;
  animation: skeletonShimmer 1.8s ease-in-out infinite;
  border-radius: 12px;
}"""

SKELETON_NEW = """.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.08) 40%,
    rgba(255, 255, 255, 0.04) 80%
  );
  background-size: 200% 100%;
  animation: skeletonShimmer 1.8s ease-in-out infinite;
  border-radius: 12px;
}

/* Light theme: skeleton needs dark-on-light shimmer */
.light .skeleton {
  background: linear-gradient(
    90deg,
    rgba(15, 19, 37, 0.06) 0%,
    rgba(15, 19, 37, 0.12) 40%,
    rgba(15, 19, 37, 0.06) 80%
  );
  background-size: 200% 100%;
}"""

if SKELETON_ORIG in css:
    css = css.replace(SKELETON_ORIG, SKELETON_NEW, 1)
    print("✅ Added .light .skeleton override")
elif ".light .skeleton" in css:
    print("⚠️  .light .skeleton already present — skipping")
else:
    print("❌ Could not find skeleton block to patch")
    sys.exit(1)

# ── 2. Glass light theme fix ──────────────────────────────────────────────────

GLASS_ORIG = """  .glass {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.03)
    );
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }"""

GLASS_NEW = """  .glass {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.03)
    );
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  /* Light theme: invert glass tint to dark-on-light */
  .light .glass {
    background: linear-gradient(
      180deg,
      rgba(15, 19, 37, 0.05),
      rgba(15, 19, 37, 0.02)
    );
  }"""

if GLASS_ORIG in css:
    css = css.replace(GLASS_ORIG, GLASS_NEW, 1)
    print("✅ Added .light .glass override")
elif ".light .glass" in css:
    print("⚠️  .light .glass already present — skipping")
else:
    print("❌ Could not find .glass block to patch")
    sys.exit(1)

# ── Write back ────────────────────────────────────────────────────────────────
css_path.write_text(css, encoding="utf-8")
print(f"✅ globals.css updated ({len(css.splitlines())} lines)")
