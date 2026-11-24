/**
 * «القرآن ٢» — following a recitation from memory, word by word.
 *
 * The speech recogniser writes what it hears in everyday spelling; each heard
 * word is compared with the next expected word of the page (data/arabic.ts
 * understands the Uthmani spelling). If it is not the next word but one of the
 * two after it, the words in between were skipped and are marked missed. Words
 * that match nothing (a cough, a repeated word) are ignored.
 *
 * At the end, the share of words said gives a suggested grade for the memory
 * model; the person can always choose another.
 */
import { matchesWord } from "../data/arabic";
import type { Grade } from "./fsrs";

export type WordMark = "ok" | "missed";

export type ReciteTracker = {
  /** Feed the words heard so far in a recogniser segment (the text grows as it listens). */
  hear: (segment: string, text: string, final: boolean) => void;
  readonly position: number;
  readonly marks: ReadonlyArray<WordMark | undefined>;
  summary: () => { said: number; missed: number; total: number; done: boolean; grade: Grade };
};

const LOOKAHEAD = 2;

/** The suggested grade for a share of the page said correctly. */
export function gradeFor(share: number): Grade {
  if (share >= 0.97) return 4;
  if (share >= 0.85) return 3;
  if (share >= 0.6) return 2;
  return 1;
}

export function createReciteTracker(expected: string[], onChange?: () => void): ReciteTracker {
  const marks: Array<WordMark | undefined> = new Array(expected.length).fill(undefined);
  const consumed = new Map<string, number>();
  let pos = 0;
  // A word written as two («بَعْدَ مَا») may be heard as two words.
  let halfway = false;

  const matchesAt = (i: number, heard: string): boolean => {
    const word = expected[i];
    if (!word) return false;
    if (matchesWord(word, heard)) return true;
    const parts = word.split(" ");
    return parts.length > 1 && matchesWord(parts[0]!, heard);
  };

  const take = (heard: string) => {
    if (pos >= expected.length) return;
    if (halfway) {
      halfway = false;
      const parts = expected[pos - 1]?.split(" ") ?? [];
      if (parts.length > 1 && matchesWord(parts[1]!, heard)) return;
    }
    for (let k = 0; k <= LOOKAHEAD; k++) {
      if (!matchesAt(pos + k, heard)) continue;
      for (let j = pos; j < pos + k; j++) marks[j] = "missed";
      const word = expected[pos + k]!;
      marks[pos + k] = "ok";
      pos += k + 1;
      halfway = word.includes(" ") && !matchesWord(word, heard);
      onChange?.();
      return;
    }
  };

  return {
    hear(segment, text, final) {
      const words = text.split(/\s+/).filter(Boolean);
      // The last word of an unfinished segment may still change: wait for it.
      const stable = final ? words : words.slice(0, -1);
      const already = consumed.get(segment) ?? 0;
      for (const w of stable.slice(already)) take(w);
      consumed.set(segment, Math.max(already, stable.length));
    },
    get position() {
      return pos;
    },
    get marks() {
      return marks;
    },
    summary() {
      const said = marks.filter((m) => m === "ok").length;
      const missed = expected.length - said;
      return { said, missed, total: expected.length, done: pos >= expected.length, grade: gradeFor(expected.length ? said / expected.length : 0) };
    },
  };
}
