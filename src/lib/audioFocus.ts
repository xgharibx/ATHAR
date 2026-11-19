/**
 * Only one long-form player plays at a time in the web player: when the Quran
 * radio starts, the listening section stops, and the other way round. (In the
 * Android and iOS apps they share one native player, which already hands
 * over on its own; see nativeRecitation.ts.)
 */
export type AudioOwner = "radio" | "listen";

const stoppers = new Map<AudioOwner, () => void>();

/** Call when `owner` starts playing; every other owner is asked to stop. */
export function claimAudioFocus(owner: AudioOwner, stop: () => void): void {
  stoppers.set(owner, stop);
  for (const [other, stopOther] of stoppers) {
    if (other !== owner) stopOther();
  }
}
