"""Generate Athar's alternate app icons (Settings › أيقونة التطبيق).

Recolours the real icon instead of redrawing it: each pixel is unmixed into
the three original inks (green ground, gold fingerprint, white wordmark) by
barycentric least squares, the inks are swapped for the variant's, and the
residual (the paper texture) is added back, so grain and anti-aliasing stay.
The Ramadan icon adds a crescent and star.

    python3 tools/scripts/generate_app_icon_variants.py   (needs Pillow and numpy)

Writes the iPhone sets (ios/App/App/Assets.xcassets/AppIcon-<Name>.appiconset)
and the Android mipmaps (ic_launcher_<name>*.png) from the current icons.
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MASTER = os.path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")

def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)

PALETTES = {
    "light":   {"ground": "#F1E9DA", "print": "#B5913F", "mark": "#21402A", "texture": 0.55},
    "dark":    {"ground": "#0F1312", "print": "#D8B46A", "mark": "#F3EFE6", "texture": 0.9},
    "ramadan": {"ground": "#1B1E4A", "print": "#E2BD6B", "mark": "#FFFFFF", "texture": 0.9},
    "gold":    {"ground": "#B98F3C", "print": "#F5E6BE", "mark": "#183322", "texture": 0.7},
}

def references(rgb):
    h, w, _ = rgb.shape
    corner = np.concatenate([rgb[:h // 8, :w // 8].reshape(-1, 3), rgb[-h // 8:, -w // 8:].reshape(-1, 3)])
    ground = np.median(corner, axis=0)
    flat = rgb.reshape(-1, 3)
    r, g, b = flat[:, 0], flat[:, 1], flat[:, 2]
    gold_mask = (r > g) & (g > b) & (r - b > 60) & (r < 235)
    gold = np.median(flat[gold_mask], axis=0)
    white_mask = (r > 225) & (g > 225) & (b > 215)
    white = np.median(flat[white_mask], axis=0) if white_mask.sum() > 50 else np.array([250.0, 250.0, 245.0])
    return ground, gold, white

def recolor(rgb, refs, palette):
    ground, gold, white = refs
    e1, e2 = gold - ground, white - ground
    gram = np.array([[e1 @ e1, e1 @ e2], [e1 @ e2, e2 @ e2]])
    inv = np.linalg.inv(gram)
    d = rgb.reshape(-1, 3) - ground
    coeffs = (d @ np.stack([e1, e2], axis=1)) @ inv.T
    b = np.clip(coeffs[:, 0], 0, 1)
    c = np.clip(coeffs[:, 1], 0, 1)
    total = b + c
    over = total > 1
    b[over] /= total[over]
    c[over] /= total[over]
    a = 1 - b - c
    model = a[:, None] * ground + b[:, None] * gold + c[:, None] * white
    residual = rgb.reshape(-1, 3) - model
    ng, np_, nm = (hex_rgb(palette[k]) for k in ("ground", "print", "mark"))
    out = a[:, None] * ng + b[:, None] * np_ + c[:, None] * nm + residual * palette["texture"] * a[:, None]
    return np.clip(out, 0, 255).reshape(rgb.shape)

def crescent(img, cx, cy, r, colour):
    """A slim crescent with a small star: drawn 4x larger, then reduced for smooth edges."""
    scale = 4
    w, h = img.size
    layer = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(layer)
    R = r * scale
    X, Y = cx * scale, cy * scale
    draw.ellipse([X - R, Y - R, X + R, Y + R], fill=255)
    off = R * 0.42
    draw.ellipse([X - R + off, Y - R - off * 0.35, X + R + off, Y + R - off * 0.35], fill=0)
    # Five-pointed star inside the crescent's opening.
    sx, sy, sr = X + R * 0.95, Y - R * 0.55, R * 0.22
    pts = []
    for i in range(10):
        ang = np.pi / 2 + i * np.pi / 5
        rad = sr if i % 2 == 0 else sr * 0.45
        pts.append((sx + rad * np.cos(ang), sy - rad * np.sin(ang)))
    draw.polygon(pts, fill=255)
    mask = layer.resize((w, h), Image.LANCZOS)
    solid = Image.new("RGBA", (w, h), tuple(int(v) for v in colour) + (255,))
    base = img.convert("RGBA")
    base.paste(solid, (0, 0), mask)
    return base

def variant(path_in, name, refs, out_path, crescent_at=None):
    src = Image.open(path_in).convert("RGBA")
    arr = np.asarray(src).astype(np.float64)
    rgb, alpha = arr[..., :3], arr[..., 3:]
    out = recolor(rgb, refs, PALETTES[name])
    img = Image.fromarray(np.concatenate([out, alpha], axis=2).astype(np.uint8), "RGBA")
    if name == "ramadan" and crescent_at is not None:
        w = img.size[0]
        cx, cy, r = (v * w for v in crescent_at)
        img = crescent(img, cx, cy, r, hex_rgb(PALETTES["ramadan"]["print"]))
    img.save(out_path)
    return img

CRESCENT = (0.70, 0.27, 0.06)
DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]

if __name__ == "__main__":
    master = np.asarray(Image.open(MASTER).convert("RGB")).astype(np.float64)
    refs = references(master)
    assets = os.path.join(ROOT, "ios/App/App/Assets.xcassets")
    res = os.path.join(ROOT, "android/app/src/main/res")
    for name in PALETTES:
        title = name.capitalize()
        icon_set = os.path.join(assets, f"AppIcon-{title}.appiconset")
        os.makedirs(icon_set, exist_ok=True)
        image = variant(MASTER, name, refs, os.path.join(icon_set, "icon.png"), crescent_at=CRESCENT)
        # The App Store rejects app icons with an alpha channel.
        image.convert("RGB").save(os.path.join(icon_set, "icon.png"))
        with open(os.path.join(icon_set, "Contents.json"), "w") as f:
            json.dump({
                "images": [{"filename": "icon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
                "info": {"author": "xcode", "version": 1},
            }, f, indent=2)
            f.write("\n")
        for density in DENSITIES:
            folder = os.path.join(res, f"mipmap-{density}")
            for kind in ("ic_launcher", "ic_launcher_round", "ic_launcher_foreground"):
                suffix = kind[len("ic_launcher"):]
                variant(os.path.join(folder, f"{kind}.png"), name, refs,
                        os.path.join(folder, f"ic_launcher_{name}{suffix}.png"), crescent_at=CRESCENT)
        print("wrote", name)
