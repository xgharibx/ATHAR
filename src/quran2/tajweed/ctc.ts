/**
 * Reading the model's output: the best path (the likeliest symbol in each
 * 20 ms frame, repeats collapsed, blanks dropped), each symbol with its
 * probability and its time, and the end of the last one — as inference.py.
 */

/** The 42 symbols of the Quran phonetic script, in the model's order (index 0 is the blank). */
export const PHONEMES = [
  "ء", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي",
  "ا", "ۦ", "ۥ", "َ", "ُ", "ِ", "۪", "ـ", "ٲ", "ڇ", "ں", "۾", "ۜ", "ؙ",
] as const;

/** Seconds of silence put before and after the recitation, as in training. */
export const LEAD_SECONDS = 0.4;

export type Heard = {
  heard: string;
  probs: number[];
  /** When each symbol starts (s), and after them the end of the last one. */
  times: number[];
  /** When each symbol ends (s): the end of its last frame. */
  ends: number[];
};

/** logprobs: [frames × 43]; samples: the length of the padded audio (16 kHz). */
export function decode(logprobs: Float32Array, frames: number, samples: number): Heard {
  const classes = PHONEMES.length + 1;
  const step = samples / 16000 / frames;
  const out: string[] = [];
  const probs: number[] = [];
  const times: number[] = [];
  const ends: number[] = [];
  let prev = 0;
  let last = -1;
  for (let t = 0; t < frames; t++) {
    let best = 0;
    let bestV = -Infinity;
    for (let c = 0; c < classes; c++) {
      const v = logprobs[t * classes + c]!;
      if (v > bestV) {
        bestV = v;
        best = c;
      }
    }
    if (best !== 0) last = t;
    if (best !== prev && best !== 0) {
      out.push(PHONEMES[best - 1]!);
      probs.push(Math.exp(bestV));
      times.push((t + 0.5) * step - LEAD_SECONDS);
      ends.push((t + 1) * step - LEAD_SECONDS);
    } else if (best !== 0 && best === prev && ends.length) {
      ends[ends.length - 1] = (t + 1) * step - LEAD_SECONDS;
    }
    prev = best;
  }
  times.push(last >= 0 ? (last + 1) * step - LEAD_SECONDS : 0);
  return { heard: out.join(""), probs, times, ends };
}

/** The recitation with its silence before and after, as the model expects it. */
export function withLead(audio: Float32Array): Float32Array {
  const lead = Math.round(16000 * LEAD_SECONDS);
  const x = new Float32Array(audio.length + 2 * lead);
  x.set(audio, lead);
  return x;
}
