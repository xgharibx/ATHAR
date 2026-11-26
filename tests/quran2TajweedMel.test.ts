import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modelInput } from "@/quran2/tajweed/mel";
import { decode, withLead } from "@/quran2/tajweed/ctc";

/** Al-Ikhlas 1 (Mishary Alafasy, everyayah), and faster-whisper's features for it. */
const clip = JSON.parse(readFileSync(new URL("./fixtures/quran2-tajweed/mel-112-1.json", import.meta.url), "utf8")) as {
  pcm16: string;
  shape: [number, number];
  cols: Record<string, number[]>;
  mean: number;
  max: number;
  heard: string;
};

function audio(): Float32Array {
  const bytes = Buffer.from(clip.pcm16, "base64");
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  return Float32Array.from(pcm, (v) => v / 32768);
}

describe("التسميع: the model's input, as faster-whisper computes it", () => {
  it("gives the same log-mel spectrogram", () => {
    const { data, frames } = modelInput(withLead(audio()));
    expect([80, frames]).toEqual(clip.shape);
    for (const [col, want] of Object.entries(clip.cols)) {
      const c = Number(col);
      for (let m = 0; m < 80; m++) expect(Math.abs(data[m * frames + c]! - want[m]!), `mel ${m} at ${c}`).toBeLessThan(2e-3);
    }
    let sum = 0;
    let max = -Infinity;
    for (const v of data) {
      sum += v;
      if (v > max) max = v;
    }
    expect(Math.abs(sum / data.length - clip.mean)).toBeLessThan(1e-4);
    expect(Math.abs(max - clip.max)).toBeLessThan(1e-4);
  });

  // With the model on this machine (TAJWEED_MODEL=…/model-int8.onnx), it hears what the Python reference heard.
  const model = process.env.TAJWEED_MODEL;
  it.skipIf(!model || !existsSync(model))("hears the same script as the Python reference", async () => {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    const session = await ort.InferenceSession.create(new Uint8Array(readFileSync(model!)));
    const padded = withLead(audio());
    const { data, frames } = modelInput(padded);
    const out = await session.run({ mel: new ort.Tensor("float32", data, [1, 80, frames]), riwaya: new ort.Tensor("int64", BigInt64Array.from([0n]), [1]) });
    const lp = out.logprobs!;
    const heard = decode(lp.data as Float32Array, lp.dims[1]!, padded.length);
    expect(heard.heard).toBe(clip.heard);
  }, 60_000);
});
