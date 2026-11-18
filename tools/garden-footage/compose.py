#!/usr/bin/env python3
"""
Compose the «الحديقة» backgrounds from real footage.

Each scene is one portrait film (1080x1920, 24 fps, seamless 10-second loop)
built offline from real clips, so the phone only plays a single
hardware-decoded video instead of drawing a garden:

  night  the Milky Way over mountains (4148), palm fronds overhead as black
         silhouettes (4621, keyed out of its sky), grasses silhouetted along
         the ground (1178) and white oleander lit as if by the moon (1187).
  day    a real sky with clouds and grasses (1178), the same palm fronds in
         full colour hanging from above (4621) and bougainvillea rising from
         below (1168).

Layers are cut out of their own blue skies with colour keys (fronds and
flowers are warm or white, the sky is cyan-blue), placed, graded, and the
result is looped by cross-fading its last 1.5 s into its first.

Sources: Mixkit (https://mixkit.co), Stock Video Free License — free for
commercial use as part of a larger work, no attribution required. Clip ids:
4148, 4621, 1178, 1168, 1187. Originals are not committed; download them to
SRC (see README.md) and run:

    python3 tools/garden-footage/compose.py SRC OUT
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H, FPS = 1080, 1920, 24
N = 10 * FPS          # frames in the loop
K = int(1.5 * FPS)    # cross-fade length
TOTAL = N + K


def reader(path: Path, vf: str, w: int, h: int):
    """Yield float32 RGB frames (0..1) of one clip at 24 fps after `vf`."""
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(path),
        "-vf", f"fps={FPS},{vf}",
        "-frames:v", str(TOTAL), "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = w * h * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32) / 255.0
    proc.wait()


def clamp01(x):
    return np.clip(x, 0.0, 1.0)


def luma(img):
    return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114


def key_fronds(img):
    """Palm fronds (warm, or dark in shadow) against a cyan-blue sky."""
    r, b = img[..., 0], img[..., 2]
    warm = clamp01((r - b) / 0.22)
    dark = clamp01((0.32 - luma(img)) / 0.14)
    return np.maximum(warm, dark)


def key_grass(img):
    """Grass heads and stems against sky and white clouds."""
    r, b = img[..., 0], img[..., 2]
    warm = clamp01((r - b + 0.02) / 0.18)
    dark = clamp01((0.42 - luma(img)) / 0.15)
    return np.maximum(warm, dark)


def key_bougainvillea(img):
    """Magenta bracts and green leaves against the sky."""
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    bracts = clamp01((r - 0.45) / 0.14)
    leaves = clamp01((g - b + 0.05) / 0.12)
    dark = clamp01((0.30 - luma(img)) / 0.12)
    return np.maximum(np.maximum(bracts, leaves), dark)


def key_oleander(img):
    """White petals, dried blooms and stems against the sky.

    The sky behind this clip deepens toward the bottom, so "dark" alone would
    take it for shadow: dark only counts where blue does not dominate."""
    r, b = img[..., 0], img[..., 2]
    whites = clamp01((r - 0.5) / 0.14)
    not_sky = clamp01(1 - (b - r - 0.12) / 0.2)
    dark = clamp01((0.26 - luma(img)) / 0.1) * not_sky
    return np.maximum(whites, dark)


def soften(alpha, passes=1):
    """A cheap 3x3 blur so keyed edges sit into the plate instead of cutting."""
    a = alpha
    for _ in range(passes):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5.0
    return a


def place(canvas_rgb, canvas_a_mul, layer_rgb, layer_a, x, y):
    """Composite layer onto the canvas at (x, y), clipping at the edges."""
    lh, lw = layer_a.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + lw), min(H, y + lh)
    if x1 <= x0 or y1 <= y0:
        return
    lx0, ly0 = x0 - x, y0 - y
    a = layer_a[ly0:ly0 + (y1 - y0), lx0:lx0 + (x1 - x0)][..., None] * canvas_a_mul
    rgb = layer_rgb[ly0:ly0 + (y1 - y0), lx0:lx0 + (x1 - x0)]
    region = canvas_rgb[y0:y1, x0:x1]
    canvas_rgb[y0:y1, x0:x1] = region * (1 - a) + rgb * a


def horizontal_fade(w, fade_left=0, fade_right=0):
    """Feather a layer's side edges so it never ends in a visible line."""
    cols = np.arange(w, dtype=np.float32)
    a = np.ones(w, np.float32)
    if fade_left:
        a = np.minimum(a, clamp01(cols / fade_left))
    if fade_right:
        a = np.minimum(a, clamp01((w - 1 - cols) / fade_right))
    return a[None, :]


def vertical_fade(h, start, end):
    """1 above `start`, fading to 0 at `end` (rows of a layer of height h)."""
    rows = np.arange(h, dtype=np.float32)
    return clamp01((end - rows) / max(1, end - start))[:, None]


PALM_W, PALM_H = 1640, 922
PALM_X, PALM_Y = -280, -270


def night_frames(src: Path):
    sky = reader(src / "4148-2160.mp4", f"crop=1215:2160:1312:0,scale={W}:{H}", W, H)
    palms = reader(src / "4621-2160.mp4", f"scale={PALM_W}:{PALM_H}", PALM_W, PALM_H)
    grass = reader(src / "1178-1080.mp4", f"scale={W}:{H}", W, H)
    olea = reader(src / "1187-1080.mp4", "scale=594:1056", 594, 1056)
    palm_fade = vertical_fade(PALM_H, 560, 860)
    olea_fade = horizontal_fade(594, fade_left=160)
    night_ink = np.array([0.012, 0.016, 0.03], np.float32)
    for s, p, g, o in zip(sky, palms, grass, olea):
        frame = s * np.array([0.92, 0.95, 1.05], np.float32)  # a touch cooler
        # Ground: grasses as silhouettes, rising over the mountains.
        ga = soften(key_grass(g))
        place(frame, 1.0, np.broadcast_to(night_ink, g.shape), ga, 0, 470)
        # White oleander under the moon: desaturated, cool and dim.
        oa = soften(key_oleander(o)) * olea_fade
        moonlit = (luma(o)[..., None] * np.array([0.6, 0.68, 0.84], np.float32)) * 0.62
        place(frame, 1.0, moonlit, oa, W - 500, H - 800)
        # Palm fronds overhead, black against the stars.
        pa = soften(key_fronds(p)) * palm_fade
        place(frame, 1.0, np.broadcast_to(night_ink, p.shape), pa, PALM_X, PALM_Y)
        yield frame


ZENITH = np.array([0.16, 0.36, 0.72], np.float32)


def day_frames(src: Path):
    base = reader(src / "1178-1080.mp4", f"scale={W}:{H}", W, H)
    palms = reader(src / "4621-2160.mp4", f"scale={PALM_W}:{PALM_H}", PALM_W, PALM_H)
    bloom = reader(src / "1168-1080.mp4", "scale=830:1476", 830, 1476)
    palm_fade = vertical_fade(PALM_H, 560, 860)
    bloom_fade = horizontal_fade(830, fade_right=220)
    # A real sky is deepest at the zenith: blend the top toward deep blue.
    deepen = (vertical_fade(H, 0, 900) * 0.42)[:, :, None]
    for s, p, b in zip(base, palms, bloom):
        frame = s * (1 - deepen) + (s * ZENITH * 1.9) * deepen
        ba = soften(key_bougainvillea(b)) * bloom_fade
        place(frame, 1.0, b, ba, -150, H - 1060)
        pa = soften(key_fronds(p)) * palm_fade
        place(frame, 1.0, p, pa, PALM_X, PALM_Y)
        yield frame


def write(frames, out: Path):
    """Encode, folding the last K frames back over the first K for a seamless loop."""
    enc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out),
    ], stdin=subprocess.PIPE)
    head = []
    for i, frame in enumerate(frames):
        if i < K:
            head.append(frame)
        elif i < N:
            enc.stdin.write((frame * 255).clip(0, 255).astype(np.uint8).tobytes())
        else:
            t = i - N
            w = (t + 1) / (K + 1)
            mixed = frame * (1 - w) + head[t] * w
            enc.stdin.write((mixed * 255).clip(0, 255).astype(np.uint8).tobytes())
    enc.stdin.close()
    enc.wait()


def still(frames, path: Path, index: int = 60):
    """One frame as a JPEG, for tuning the keys and for the poster image."""
    from PIL import Image
    for i, frame in enumerate(frames):
        if i == index:
            Image.fromarray((frame * 255).clip(0, 255).astype(np.uint8)).save(path, quality=82)
            return


if __name__ == "__main__":
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    if sys.argv[3:4] == ["--still"]:
        out.mkdir(parents=True, exist_ok=True)
        still(night_frames(src), out / "night-still.jpg")
        still(day_frames(src), out / "day-still.jpg")
        sys.exit(0)
    out.mkdir(parents=True, exist_ok=True)
    which = sys.argv[3:] or ["night", "day"]
    if "night" in which:
        write(night_frames(src), out / "garden-night.mp4")
    if "day" in which:
        write(day_frames(src), out / "garden-day.mp4")
