/**
 * Miracles that were the same miracle twice (same verse, same science) are
 * merged into one fuller entry. Their old addresses, and your read and saved
 * marks, follow them to the entry they were merged into. Kept apart from the
 * 12k-line data file so the section's shell can use it without loading it.
 */
export const MERGED_INTO: Record<string, string> = {
  'pulsar-piercing-star': 'pulsars-piercing-stars',
  'iron-sent-down-from-sky': 'iron-sent-down',
  'mountains-tectonic-stability': 'mountains-as-pegs',
  'deep-ocean-layers-of-darkness': 'deep-sea-darkness',
  'barriers-between-two-seas': 'two-seas-barrier',
  'embryo-chewed-lump': 'embryology-stages',
  'embryo-bones-before-flesh': 'embryology-stages',
  'pain-receptors-in-skin-quran': 'skin-pain-receptors',
  'water-cycle-evaporation-rain': 'water-cycle',
  'roman-battle-lowest-land': 'lowest-point-earth',
  'honey-antibacterial-properties': 'honey-healing',
  'water-origin-of-all-life': 'life-from-water',
  'sun-self-rotation-orbit': 'solar-apex-path',
  'black-holes-quran-khunnas': 'black-holes-quran',
  'prophet-paraclete-prophecy': 'prophecy-in-bible',
};

/**
 * Removed: the «code 19» claim comes from Rashad Khalifa's work, which the
 * scholars of the Ummah rejected (he later denied verses of the Quran and
 * claimed to be a messenger). It does not belong among the proofs.
 */
export const REMOVED = new Set(['quran-mathematical-code-nineteen']);

/** The slug a miracle lives at now ('' when it was removed). */
export function canonicalSlug(slug: string): string {
  if (REMOVED.has(slug)) return '';
  return MERGED_INTO[slug] ?? slug;
}
