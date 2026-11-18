"""Generate the themed versions of Athar's main app icon.

  - iPhone (iOS 18+): the dark icon (the gold fingerprint and white wordmark
    on a transparent ground, which iOS puts on its own dark background) and
    the tinted icon (a grayscale version iOS colours with the person's tint).
  - Android 13+: the monochrome layer of the adaptive icon, used when themed
    icons are on.

Uses the same ink unmixing as generate_app_icon_variants.py, so the mark
keeps its exact shape and anti-aliasing.

    python3 tools/scripts/generate_themed_icons.py   (needs Pillow and numpy)
"""
import importlib.util
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("variants", os.path.join(HERE, "generate_app_icon_variants.py"))
variants = importlib.util.module_from_spec(spec)
spec.loader.exec_module(variants)

ROOT = variants.ROOT
MASTER = variants.MASTER
DENSITIES = variants.DENSITIES
# How strongly the fingerprint shows next to the wordmark in one-colour icons.
PRINT_WEIGHT = 0.55
# Paper grain in the ground must not leave specks on a transparent ground.
FLOOR = 0.12


def inks(rgb, refs):
    """Per pixel: the share of ground, gold fingerprint and white wordmark."""
    ground, gold, white = refs
    e1, e2 = gold - ground, white - ground
    gram = np.array([[e1 @ e1, e1 @ e2], [e1 @ e2, e2 @ e2]])
    d = rgb.reshape(-1, 3) - ground
    coeffs = (d @ np.stack([e1, e2], axis=1)) @ np.linalg.inv(gram).T
    b = np.clip(coeffs[:, 0], 0, 1)
    c = np.clip(coeffs[:, 1], 0, 1)
    total = b + c
    over = total > 1
    b[over] /= total[over]
    c[over] /= total[over]
    shape = rgb.shape[:2]
    return b.reshape(shape), c.reshape(shape)


def clean(alpha):
    return np.where(alpha < FLOOR, 0.0, (alpha - FLOOR) / (1 - FLOOR))


def dark_icon(rgb, refs):
    b, c = inks(rgb, refs)
    alpha = clean(np.clip(b + c, 0, 1))
    gold, white = refs[1], refs[2]
    share = np.where(b + c > 0, c / np.maximum(b + c, 1e-6), 0)[..., None]
    colour = (1 - share) * gold + share * white
    return np.concatenate([colour, alpha[..., None] * 255], axis=2)


def one_colour_alpha(rgb, refs):
    b, c = inks(rgb, refs)
    return clean(np.clip(PRINT_WEIGHT * b + c, 0, 1))


def tinted_icon(rgb, refs):
    level = one_colour_alpha(rgb, refs) * 255
    return np.repeat(level[..., None], 3, axis=2)


if __name__ == "__main__":
    master = np.asarray(Image.open(MASTER).convert("RGB")).astype(np.float64)
    refs = variants.references(master)
    icon_set = os.path.dirname(MASTER)
    Image.fromarray(dark_icon(master, refs).astype(np.uint8), "RGBA").save(os.path.join(icon_set, "AppIcon-dark.png"))
    Image.fromarray(tinted_icon(master, refs).astype(np.uint8), "RGB").save(os.path.join(icon_set, "AppIcon-tinted.png"))
    base = {"idiom": "universal", "platform": "ios", "size": "1024x1024"}
    with open(os.path.join(icon_set, "Contents.json"), "w") as f:
        json.dump({
            "images": [
                {"filename": os.path.basename(MASTER), **base},
                {"appearances": [{"appearance": "luminosity", "value": "dark"}], "filename": "AppIcon-dark.png", **base},
                {"appearances": [{"appearance": "luminosity", "value": "tinted"}], "filename": "AppIcon-tinted.png", **base},
            ],
            "info": {"author": "xcode", "version": 1},
        }, f, indent=2)
        f.write("\n")

    res = os.path.join(ROOT, "android/app/src/main/res")
    for density in DENSITIES:
        folder = os.path.join(res, f"mipmap-{density}")
        fg = np.asarray(Image.open(os.path.join(folder, "ic_launcher_foreground.png")).convert("RGB")).astype(np.float64)
        alpha = one_colour_alpha(fg, refs) * 255
        white = np.full(fg.shape, 255.0)
        out = np.concatenate([white, alpha[..., None]], axis=2).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(os.path.join(folder, "ic_launcher_monochrome.png"), optimize=True)
    print("wrote dark, tinted and monochrome icons")
