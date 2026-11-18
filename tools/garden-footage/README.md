# «الحديقة» footage

The garden behind the «أفق» design (and the classic «حديقة الليل» theme) is
real footage, composed offline into one seamless portrait loop per scene.
The app ships the results in `public/garden/`:

| File | What it is |
|---|---|
| `night.mp4`, `night.jpg` | Night film (864×1536, 24 fps, 10 s loop) and its still |
| `day.mp4`, `day.jpg` | Day film and its still |
| `moon.jpg` | The Moon, shaded live to tonight's phase (`src/components/ufuq/garden/gardenOverlay.ts`) |

## Sources and licences

| Layer | Source | Licence |
|---|---|---|
| Milky Way over mountains | Mixkit clip 4148 (4K) | Mixkit Stock Video Free License |
| Palm fronds | Mixkit clip 4621 (4K) | Mixkit Stock Video Free License |
| Grasses against the sky | Mixkit clip 1178 (1080p, portrait) | Mixkit Stock Video Free License |
| Bougainvillea | Mixkit clip 1168 (1080p, portrait) | Mixkit Stock Video Free License |
| White oleander | Mixkit clip 1187 (1080p, portrait) | Mixkit Stock Video Free License |
| The Moon | NASA's Scientific Visualization Studio, "Moon Phase and Libration, 2023" (SVS 5048), full-moon frame | NASA imagery, not copyrighted |

The Mixkit Stock Video Free License allows commercial use with no attribution,
as part of a larger work; the raw clips must not be redistributed on their own,
so they are not committed. Only the composed, re-encoded films are.

## Rebuilding

Download the originals into a folder (`SRC`), using the files Mixkit serves for
each clip page: `4148-2160.mp4`, `4621-2160.mp4`, `1178-1080.mp4`,
`1168-1080.mp4`, `1187-1080.mp4`. Then:

```sh
python3 tools/garden-footage/compose.py SRC OUT            # both scenes, 1080×1920
python3 tools/garden-footage/compose.py SRC OUT --still    # one frame each, for tuning keys

# Shipping encodes
ffmpeg -i OUT/garden-night.mp4 -vf scale=864:1536:flags=lanczos -c:v libx264 -preset veryslow \
  -crf 29 -tune film -profile:v high -pix_fmt yuv420p -movflags +faststart -an public/garden/night.mp4
ffmpeg -i OUT/garden-day.mp4 -vf scale=864:1536:flags=lanczos -c:v libx264 -preset veryslow \
  -crf 31 -tune film -profile:v high -pix_fmt yuv420p -movflags +faststart -an public/garden/day.mp4
ffmpeg -i public/garden/night.mp4 -frames:v 1 -q:v 5 public/garden/night.jpg
ffmpeg -i public/garden/day.mp4 -frames:v 1 -q:v 5 public/garden/day.jpg
```

How the layers are cut out: the palm fronds, grasses and flowers were all
filmed against a cyan-blue sky, so each is keyed by colour (warm or white
against blue) plus a darkness term for shadowed parts, softened by a small
blur and feathered at its edges. The palms are raised so that, across the
whole loop, they never sway into the patch of sky where the Moon is drawn.
