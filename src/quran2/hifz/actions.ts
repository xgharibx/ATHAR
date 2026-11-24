import { review, type Grade } from "./fsrs";
import { useQ2Store } from "../store";
import { dayKey } from "../hooks";

/** First learning of a page: its first grade starts the memory model. */
export function learnPage(page: number, grade: Grade = 3, now = Date.now()): void {
  const store = useQ2Store.getState();
  if (store.hifz[page]) return;
  store.putHifz(page, { ...review(null, grade, now), learnedAt: now });
  store.logLearned(dayKey(new Date(now)), page);
}

/** A revision of a memorised page. */
export function revisePage(page: number, grade: Grade, now = Date.now()): void {
  const store = useQ2Store.getState();
  const card = store.hifz[page];
  if (!card) {
    learnPage(page, grade, now);
    return;
  }
  store.putHifz(page, { ...review(card, grade, now), learnedAt: card.learnedAt });
}
