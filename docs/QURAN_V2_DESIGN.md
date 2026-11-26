# «القرآن الكريم» — the design: «مشكاة»

The brief the section's look is built from. Kept up to date with the code.

## The prompt

> Design «القرآن الكريم» so that it feels like nothing a Quran app has looked like: premium,
> calm, unmistakably Islamic without a single cliché sticker, and modern enough to sit
> beside the best apps of 2026. The Quran is the light; the interface is the niche that
> holds it. Every screen should feel lit from within, quiet, and made by hand.
>
> Take the idea from the ayah of light: «مَثَلُ نُورِهِۦ كَمِشْكَوٰةٍ فِيهَا مِصْبَاحٌ» (an-Nur 35). A
> mishkat is the niche in a wall that holds a lamp. Its arch is the mihrab's arch; its
> lamp is the glow that marks what is being read, recited or memorised now. Around it,
> the geometry of Islamic art (the eight-point star, the girih lattice) is present but
> barely there, revealed only where the light falls.
>
> No stock mosque silhouettes, no crescent clip-art, no green-and-gold kitsch. Gold is a
> hairline, never a fill. The Quran's own text is the most beautiful thing on every screen.

## Research

- **What the best apps do.** Quran.com is clean and editorial; Tarteel is modern and dark,
  with one strong accent; the Ayah app (iOS) is minimal and typographic. None of them uses
  the visual language of the Islamic book arts (tadhhib, the arch, the lamp, girih) in a
  modern way. Most Islamic apps that try use flat clip-art.
- **2026 interface language.** Layered translucent material (glass that blurs what is
  behind it), soft depth, light that responds to focus, large expressive type, floating
  docks instead of tab bars.
- **The book arts.** The printed Madina mushaf: an ornamented frame, the surah title in a
  cartouche, rosettes for ayah ends, gold hairlines. Manuscript illumination (tadhhib):
  gold used in fine lines and small fields, never large slabs.
- **Readability.** The Quranic text needs high contrast and generous line height; ornament
  must never sit behind words being read.

## The system

**Palettes** (the reader chooses; both are premium, both pass contrast):

| Token | «سَحَر» (paper, dawn) | «ليل» (night) |
|---|---|---|
| Background | ivory parchment `#F6F0E2` with a warm lamp glow at the top | deep green-black `#070C0B` with a gold lamp glow at the top |
| Surfaces | frosted ivory glass | smoked glass (4–6 % white) |
| Ink | `#1B1712` | `#EEE6D3` |
| Accent (emerald) | `#0E5A44` | `#6FD1A8` |
| Gold (hairlines, ornament) | `#A8822F` | `#D8B56A` |
| Lamp (glow) | `#F2CF83` | `#E9C46A` |

**Type.** Reem Kufi (geometric Kufic, OFL) for titles and numbers: modern, architectural,
unlike any other Quran app. Amiri for book-like titles (surah names). Amiri Quran /
the King Fahd Complex's Uthmanic Hafs for the Quran. IBM Plex Sans Arabic for interface text.

**Signature elements.**
1. **The niche (المشكاة).** A pointed arch (mihrab profile) drawn in SVG: the hub's hero,
   the frame of cards that open a world, the active-tab marker in the dock.
2. **The lamp.** A soft radial glow that breathes slowly; it sits where the reader's
   attention is: the ayah being recited, the active tab, today's work.
3. **The lattice.** An eight-point-star girih tiling in gold hairline, a few percent
   opaque, revealed by the lamp glow (masked), never behind running Quranic text.
4. **Gilded edges.** Surfaces have a one-pixel gold top edge, like a gilt page edge.
5. **The star (khatam).** The eight-point star replaces generic bullets, ornaments and the
   ayah-number medallion in the interface.

**The dock.** A floating glass dock with five places: الرئيسية، المصحف، **التسميع** (raised,
in the middle, a star medallion), الحفظ، التفسير. Search sits in the top bar; the roots,
numbers, marks and khatma are reached from the home.

**Motion.** Slow and quiet: the lamp breathes over six seconds; cards rise and fade in,
staggered; the dock's arch slides to the active place. All of it stops under "reduce motion".

**The printed page, two styles.** «المصحف بصفحاته» (this section's verified text in Amiri
Quran on fifteen lines) and «مصحف المدينة» (the King Fahd Complex's own page fonts, drawn
as the printed Madina mushaf: ornamented frame, surah cartouches, page medallion).

**Sharing an ayah, two designs.** Athar's existing poster (five palettes, three sizes) and
«مشكاة» (the niche, the lamp and the lattice around the ayah).

## Rules

- Ornament never sits behind the Quranic text being read; the lattice is masked away from it.
- Gold is a line or a small field, never a large fill.
- Contrast: text ≥ 7:1 on its surface, interface text ≥ 4.5:1.
- Glass (backdrop blur) only on floating layers (dock, top bar, sheets), never on long lists,
  to stay smooth on phones.
- Everything works with motion reduced and at 200 % text size.
