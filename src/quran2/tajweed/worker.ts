/// <reference lib="webworker" />
/**
 * The tajweed engine, off the page: the model (HisnLabs Tajweed v2, int8,
 * Apache-2.0) in ONNX Runtime Web (MIT, WebAssembly, one thread), the
 * features, and the judging. Nothing leaves the device.
 */
import * as ort from "onnxruntime-web/wasm-extern";
import glueUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import { modelInput } from "./mel";
import { decode, withLead } from "./ctc";
import { cutPoints, judgeRecitation, RATE, type AyahVerdict } from "./analyse";
import { loadSurahPieces } from "./pieces";
import { followStep, planFollow, type FollowPlan, type FollowWord } from "./follow";

export type WorkerIn =
  | { type: "init"; model: ArrayBuffer; wasm: ArrayBuffer; patch?: ArrayBuffer | null }
  | { type: "judge"; id: number; audio: Float32Array; ayahs: Array<{ s: number; a: number }> }
  /** Get ready to follow a passage live. */
  | { type: "plan"; id: number; ayahs: Array<{ s: number; a: number }> }
  /** The last seconds of the recitation, and where in the script the reciter was. */
  | { type: "follow"; id: number; audio: Float32Array; at: number };
export type WorkerOut =
  | { type: "ready" }
  | { type: "error"; id?: number; message: string }
  | { type: "progress"; id: number; done: number; total: number }
  | { type: "verdicts"; id: number; verdicts: AyahVerdict[] }
  | { type: "planned"; id: number; words: FollowWord[]; length: number }
  | { type: "followed"; id: number; from: number | null; to: number | null; cost: number };

let session: ort.InferenceSession | null = null;
let plan: FollowPlan | null = null;
const post = (m: WorkerOut) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

async function hear(audio: Float32Array) {
  const padded = withLead(audio);
  const { data, frames } = modelInput(padded);
  const out = await session!.run({
    mel: new ort.Tensor("float32", data, [1, 80, frames]),
    riwaya: new ort.Tensor("int64", BigInt64Array.from([0n]), [1]),
  });
  const lp = out.logprobs!;
  return decode(lp.data as Float32Array, lp.dims[1]!, padded.length, out.tafkheem?.data as Float32Array | undefined);
}

/** The passage's ayahs with their expected pronunciation; only real ayahs (surah 1–114, an ayah its data has). */
async function passage(list: Array<{ s: number; a: number }>) {
  const asked = list.filter(({ s, a }) => Number.isInteger(s) && s >= 1 && s <= 114 && Number.isInteger(a) && a >= 1 && a <= 286);
  const surahs = [...new Set(asked.map((x) => x.s))];
  const bySurah = new Map(await Promise.all(surahs.map(async (s) => [s, await loadSurahPieces(s)] as const)));
  return asked.filter(({ s, a }) => bySurah.get(s)?.[a - 1]).map(({ s, a }) => ({ s, a, pieces: bySurah.get(s)![a - 1]! }));
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  // Messages come only from the page that started this worker (they carry no
  // origin); anything that names another origin is not ours.
  if (e.origin && e.origin !== self.location.origin) return;
  const msg = e.data;
  try {
    if (msg.type === "init") {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = { mjs: glueUrl };
      ort.env.wasm.wasmBinary = msg.wasm;
      // The tafkhim head, a few protobuf bytes appended to the model (protobuf merges the graph): see engine.ts.
      let bytes = new Uint8Array(msg.model);
      if (msg.patch) {
        const both = new Uint8Array(bytes.length + msg.patch.byteLength);
        both.set(bytes);
        both.set(new Uint8Array(msg.patch), bytes.length);
        bytes = both;
      }
      try {
        session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      } catch (error) {
        // Without the head if it does not load: the rest of the engine is unchanged.
        if (!msg.patch) throw error;
        session = await ort.InferenceSession.create(new Uint8Array(msg.model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      }
      post({ type: "ready" });
      return;
    }
    if (msg.type === "plan") {
      const ayahs = await passage(msg.ayahs);
      plan = planFollow(ayahs);
      post({ type: "planned", id: msg.id, words: plan.words, length: plan.all.length });
      return;
    }
    if (msg.type === "follow") {
      if (!session || !plan) throw new Error("engine not ready");
      const piece = await hear(msg.audio);
      const r = followStep(plan.all, Math.max(0, Math.min(plan.all.length, Math.floor(msg.at) || 0)), piece.heard);
      post({ type: "followed", id: msg.id, from: r ? r.from : null, to: r ? r.to : null, cost: r ? r.cost : 1 });
      return;
    }
    if (msg.type === "judge") {
      if (!session) throw new Error("engine not ready");
      const cuts = cutPoints(msg.audio);
      const total = cuts.length - 1 + 1;
      const heard = [];
      for (let i = 0; i + 1 < cuts.length; i++) {
        const piece = await hear(msg.audio.subarray(cuts[i], cuts[i + 1]));
        const offset = cuts[i]! / RATE;
        heard.push({ heard: piece.heard, probs: piece.probs, times: piece.times.map((t) => t + offset), ends: piece.ends.map((t) => t + offset), sifat: piece.sifat });
        post({ type: "progress", id: msg.id, done: i + 1, total });
      }
      const ayahs = await passage(msg.ayahs);
      const verdicts = judgeRecitation(ayahs, heard);
      post({ type: "progress", id: msg.id, done: total, total });
      post({ type: "verdicts", id: msg.id, verdicts });
    }
  } catch (error) {
    post({ type: "error", id: "id" in msg ? msg.id : undefined, message: error instanceof Error ? error.message : String(error) });
  }
};
