/** Your own recitation, a word or an ayah of it at a time. */
let ctx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;

export function playPcm(audio: Float32Array, from: number, to: number, onEnd?: () => void): void {
  stopPcm();
  ctx ??= new AudioContext();
  void ctx.resume();
  const rate = 16000;
  const a = Math.max(0, Math.floor(from * rate));
  const b = Math.min(audio.length, Math.ceil(to * rate));
  if (b <= a) return;
  const buf = ctx.createBuffer(1, b - a, rate);
  buf.copyToChannel(audio.slice(a, b), 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => {
    if (current === src) current = null;
    onEnd?.();
  };
  src.start();
  current = src;
}

export function stopPcm(): void {
  try {
    current?.stop();
  } catch {
    // already ended
  }
  current = null;
}
