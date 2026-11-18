#!/usr/bin/env python3
"""
Bloom sprites for «بستان الذِّكر»: real flowers opening, from time-lapse
footage shot against black, cut out and packed one sheet per flower.

Each sheet holds 24 frames (6 columns × 4 rows of 200×200) from bud to full
bloom, as WebP with alpha. The app plays a sheet once when a flower is
planted by a remembrance, then keeps the last frames breathing gently.

Cut-out: the clips are lit against black, so a pixel's brightest channel is
its opacity; colour is then un-premultiplied (divided by that opacity) so the
edges carry the petal's own colour instead of a dark fringe. Where a flower
or its leaves run off the clip's edge, a feather hides the cut.

Roses are cut down to the bloom itself (red or pink petals); their leaves
come from a hedge strip cut from a real rosebush (hedge.webp), drawn in two
layers so the blooms open from among the leaves.

Sources (Mixkit, Stock Video Free License): 34680 red peony-rose,
34515 white peony-rose, 34700 orange lily, 17815 pink rose,
17852 red rosebuds opening (and the hedge's leaves). Run:

    python3 tools/garden-footage/bloom_sprites.py SRC public/garden/bloom
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CELL = 200
COLS, ROWS = 6, 4
FRAMES = COLS * ROWS

# name: (file, crop x, y, size in source pixels, start s, end s, cut)
#   "black": everything lit against black (flower, stem, leaves)
#   "petals": only the bloom itself; the leaves come from the hedge instead
FLOWERS = {
    "peony-red": ("34680-720.mp4", 440, 40, 640, 0.0, 8.8, "black"),
    "peony-white": ("34515-720.mp4", 100, 0, 720, 0.0, 10.5, "black"),
    "lily": ("34700-720.mp4", 220, 0, 720, 0.0, 13.6, "black"),
    "rose-pink": ("17815-720.mp4", 330, 40, 560, 0.0, 14.6, "petals"),
    "rose-red": ("17852-720.mp4", 480, 260, 400, 0.0, 13.7, "petals"),
}

# Two real rosebushes, frames dense with leaves: (file, time, rows)
HEDGE_SRC = (("17852-720.mp4", 6.0, (300, 720)), ("17815-720.mp4", 2.0, (180, 720)))


def frames(path: Path, x, y, size, start, end):
    step = (end - start) / FRAMES
    for i in range(FRAMES):
        t = start + step * i
        out = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1",
             "-vf", f"crop={size}:{size}:{x}:{y},scale={CELL}:{CELL}:flags=lanczos",
             "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            capture_output=True, check=True,
        ).stdout
        yield np.frombuffer(out, np.uint8).reshape(CELL, CELL, 3).astype(np.float32) / 255.0


def feather() -> np.ndarray:
    """Soft edges all round, a little more at the bottom where stems run out."""
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    edge = np.minimum.reduce([xx, CELL - 1 - xx, yy, (CELL - 1 - yy) * 0.6])
    return np.clip(edge / 18.0, 0, 1)


def petal_alpha(img: np.ndarray) -> np.ndarray:
    """Rose petals are red or pink (red above green), and their pale hearts are
    bright and never green. Leaves are green; dim specks are dropped."""
    r, g = img[..., 0], img[..., 1]
    coloured = np.clip((r - g - 0.05) / 0.12, 0, 1)
    pale = np.clip((img.max(axis=2) - 0.5) / 0.15, 0, 1) * np.clip((r - g + 0.03) / 0.06, 0, 1)
    lit = np.clip((r - 0.32) / 0.12, 0, 1)
    return np.maximum(coloured, pale) * lit


def soften(a: np.ndarray) -> np.ndarray:
    return (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5.0


def cut(img: np.ndarray, mask: np.ndarray, kind: str = "black") -> np.ndarray:
    peak = img.max(axis=2)
    alpha = np.clip((peak - 0.055) / 0.11, 0, 1) * mask
    if kind == "petals":
        alpha = np.minimum(alpha, soften(petal_alpha(img)))
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip(img / np.maximum(peak, 1e-3)[..., None] * np.minimum(peak / np.maximum(alpha, 1e-3), 1.0)[..., None], 0, 1)
    rgb = np.where(alpha[..., None] > 0.02, np.clip(img / safe, 0, 1), rgb)
    return np.dstack([rgb, alpha])


def leaves_of(src: Path, file: str, t: float, rows: tuple) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(src / file), "-frames:v", "1",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    img = np.frombuffer(raw, np.uint8).reshape(720, 1280, 3).astype(np.float32) / 255.0
    band = img[rows[0]:rows[1]]
    r, g = band[..., 0], band[..., 1]
    peak = band.max(axis=2)
    leaves = np.clip((peak - 0.05) / 0.1, 0, 1) * np.clip((g - r + 0.02) / 0.1, 0, 1)
    rgb = np.clip(band / np.maximum(leaves, 1e-3)[..., None], 0, 1)
    rgb = np.where(leaves[..., None] > 0.02, rgb, band)
    strip = Image.fromarray((np.dstack([rgb, soften(leaves)]) * 255).clip(0, 255).astype(np.uint8), "RGBA")
    return strip.resize((round(strip.width * 263 / strip.height), 263), Image.LANCZOS)


def hedge(src: Path, out: Path):
    """Real rose leaves from two bushes, cut out against black, for the bed's foliage."""
    parts = [leaves_of(src, *spec) for spec in HEDGE_SRC]
    wide = Image.new("RGBA", (sum(p.width for p in parts) - 120, 263))
    x = 0
    for p in parts:
        wide.alpha_composite(p, (x, 0))
        x += p.width - 120
    wide.resize((1600, 263), Image.LANCZOS).save(out / "hedge.webp", "WEBP", quality=78, method=6)
    print("hedge", (out / "hedge.webp").stat().st_size // 1024, "KB")


def build(src: Path, out: Path):
    out.mkdir(parents=True, exist_ok=True)
    hedge(src, out)
    for name, (file, x, y, size, start, end, fkind) in FLOWERS.items():
        mask = feather()
        sheet = np.zeros((ROWS * CELL, COLS * CELL, 4), np.float32)
        for i, frame in enumerate(frames(src / file, x, y, size, start, end)):
            r, c = divmod(i, COLS)
            sheet[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = cut(frame, mask, fkind)
        Image.fromarray((sheet * 255).clip(0, 255).astype(np.uint8), "RGBA").save(
            out / f"{name}.webp", "WEBP", quality=80, method=6,
        )
        print(name, (out / f"{name}.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    build(Path(sys.argv[1]), Path(sys.argv[2]))
