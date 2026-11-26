/**
 * The recitation, captured from the microphone as 16 kHz samples for the
 * tajweed check, which runs on the device: nothing is sent anywhere.
 */

export type Capture = {
  /** Seconds captured so far. */
  seconds: () => number;
  /** The level of the voice now, 0–1, for the meter. */
  level: () => number;
  stop: () => Promise<Float32Array>;
};

/** Linear interpolation down to 16 kHz, after a short moving-average low-pass. */
export function resampleTo16k(input: Float32Array, rate: number): Float32Array {
  if (rate === 16000) return input;
  const ratio = rate / 16000;
  const width = Math.max(1, Math.round(ratio));
  const smooth = new Float32Array(input.length);
  let acc = 0;
  for (let i = 0; i < input.length; i++) {
    acc += input[i]!;
    if (i >= width) acc -= input[i - width]!;
    smooth[i] = acc / Math.min(i + 1, width);
  }
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let j = 0; j < out.length; j++) {
    const x = j * ratio;
    const i = Math.floor(x);
    const f = x - i;
    out[j] = smooth[i]! * (1 - f) + (smooth[i + 1] ?? smooth[i]!) * f;
  }
  return out;
}

export async function startCapture(): Promise<Capture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
  });
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ sampleRate: 16000 });
  } catch {
    ctx = new AudioContext();
  }
  const source = ctx.createMediaStreamSource(stream);
  const blocks: Float32Array[] = [];
  let total = 0;
  let level = 0;
  const take = (block: Float32Array) => {
    blocks.push(block);
    total += block.length;
    let sum = 0;
    for (let i = 0; i < block.length; i += 8) sum += block[i]! * block[i]!;
    level = Math.min(1, Math.sqrt(sum / (block.length / 8)) * 6);
  };
  let node: AudioNode;
  if (ctx.audioWorklet) {
    await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/pcm-capture.js`);
    const worklet = new AudioWorkletNode(ctx, "pcm-capture");
    worklet.port.onmessage = (e: MessageEvent<Float32Array>) => take(e.data);
    node = worklet;
  } else {
    // Older WebViews: the script processor, deprecated but everywhere.
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => take(new Float32Array(e.inputBuffer.getChannelData(0)));
    node = proc;
  }
  source.connect(node);
  // The node must reach the output to keep running; it writes silence.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  node.connect(mute);
  mute.connect(ctx.destination);
  if (ctx.state === "suspended") await ctx.resume();
  return {
    seconds: () => total / ctx.sampleRate,
    level: () => level,
    stop: async () => {
      source.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const rate = ctx.sampleRate;
      await ctx.close().catch(() => undefined);
      const all = new Float32Array(total);
      let o = 0;
      for (const b of blocks) {
        all.set(b, o);
        o += b.length;
      }
      return resampleTo16k(all, rate);
    },
  };
}
