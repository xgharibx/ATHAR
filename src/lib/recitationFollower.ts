/**
 * Following a recitation word by word (Tasmee'): the speech recogniser sends a
 * growing transcript, and each newly heard word that matches the next hidden
 * word of the ayah reveals it.
 *
 * The Mushaf text is in the Uthmani script, which often writes long vowels
 * differently from everyday spelling («ٱلْعَٰلَمِينَ» for «العالمين», «ٱلصَّلَوٰةَ»
 * for «الصلاة»), and recognisers write everyday spelling. So words are also
 * compared by their consonant skeleton, without alef, waw and ya.
 */
import { normalizeArabic } from "@/lib/voiceTasbeeh";

/** The word's letters without the long vowels and hamza seats. */
function skeleton(word: string): string {
  return word.replace(/[اويىءؤئ]/g, "");
}

/** Whether a heard word is the expected Mushaf word. */
export function wordsMatch(expected: string, heard: string): boolean {
  const a = normalizeArabic(expected);
  const b = normalizeArabic(heard);
  if (!a || !b) return false;
  if (a === b) return true;
  const sa = skeleton(a);
  const sb = skeleton(b);
  if (sa.length >= 2 && sa === sb) return true;
  // A recogniser may join or split a particle («والله», «و الله»).
  return a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a));
}

/** Pause marks and other tokens with no letters: revealed along with the word before. */
export function isSilentToken(word: string): boolean {
  return normalizeArabic(word).length === 0;
}

/** Move past silent tokens. */
function skipSilent(words: readonly string[], pointer: number): number {
  let next = pointer;
  while (next < words.length && isSilentToken(words[next])) next += 1;
  return next;
}

/** How far ahead a heard word may match, so one misheard word does not stall the ayah. */
const LOOKAHEAD = 3;

export function createRecitationFollower() {
  let segment: string | null = null;
  let consumed = 0;

  return {
    /**
     * A transcript update for `segment`. Returns how many of `words` are now
     * revealed, starting from `revealed`. Only words not seen before in this
     * segment are used, and the last word of a partial result waits until it
     * is complete.
     */
    push(segmentId: string, transcript: string, final: boolean, words: readonly string[], revealed: number): number {
      if (segmentId !== segment) {
        segment = segmentId;
        consumed = 0;
      }
      const heard = transcript.split(/\s+/).filter((word) => normalizeArabic(word).length > 0);
      const usable = final ? heard.length : Math.max(0, heard.length - 1);
      let pointer = skipSilent(words, revealed);
      for (let i = consumed; i < usable; i += 1) {
        if (pointer >= words.length) break;
        for (let ahead = 0, index = pointer; ahead < LOOKAHEAD && index < words.length; index += 1) {
          if (isSilentToken(words[index])) continue;
          if (wordsMatch(words[index], heard[i])) {
            pointer = skipSilent(words, index + 1);
            break;
          }
          ahead += 1;
        }
      }
      consumed = Math.max(consumed, usable);
      return Math.max(revealed, pointer);
    },
  };
}
