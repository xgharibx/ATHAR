/**
 * «محرك التجويد»: downloaded once (about 38 MB: the model and its runtime),
 * checked against its SHA-256, kept on the device, and run in a worker.
 */
import { cacheDelete, cacheGet, cachePut } from "../data/cache";
import type { AyahVerdict } from "./analyse";
import type { FollowWord } from "./follow";
import type { WorkerIn, WorkerOut } from "./worker";

/** HisnLabs Tajweed v2, int8 (Apache-2.0), at a fixed revision. */
const MODEL = {
  key: "tajweed:model:b3b0503d",
  url: "https://huggingface.co/Hisnlabs/tajweed-v2/resolve/b3b0503d32b4d9a8a0447880b4564fd3e9d69c15/onnx/model-int8.onnx",
  sha256: "79cca1a2fc7ef81e325a3071a5f26cfec69203ef2c63177549065cdc1022c373",
  bytes: 23173931,
};
/** ONNX Runtime Web 1.31.1's WebAssembly (MIT), the same version as the code that loads it. */
const WASM = {
  key: "tajweed:ort-wasm:1.31.1",
  url: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort-wasm-simd-threaded.wasm",
  sha256: "4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d",
  bytes: 14848852,
};

/**
 * The tafkhim / tarqiq head of the same model (its weights from the same revision's model.safetensors), as a few
 * protobuf bytes that, appended to the model, add an output to its graph (protobuf merges a message given twice):
 * tools/quran2/tajweed/tafkheem_patch.py. It comes with the app, and is kept with the engine.
 */
const PATCH = {
  key: "tajweed:tafkheem:b3b0503d",
  path: "data/quran2/tajweed/tafkheem.onnxpatch",
  sha256: "f3e43ac3c53dc52e25731eb8f1ea0031569381cb393c80e3b61b89966802f54f",
  bytes: 8612,
};

export const ENGINE_MB = Math.round((MODEL.bytes + WASM.bytes) / 1_000_000);

export function engineSupported(): boolean {
  return typeof WebAssembly !== "undefined" && typeof Worker !== "undefined" && Boolean(globalThis.crypto?.subtle) && typeof DecompressionStream !== "undefined";
}

export async function engineInstalled(): Promise<boolean> {
  const [m, w] = await Promise.all([cacheGet<ArrayBuffer>(MODEL.key), cacheGet<ArrayBuffer>(WASM.key)]);
  return Boolean(m && w);
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function fetchVerified(file: typeof MODEL, onBytes: (n: number) => void, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(file.url, { signal });
  if (!res.ok || !res.body) throw new Error(`download: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const out = new Uint8Array(file.bytes);
  let at = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + value.length > out.length) throw new Error("download: larger than expected");
    out.set(value, at);
    at += value.length;
    onBytes(value.length);
  }
  if (at !== file.bytes) throw new Error("download: incomplete");
  const digest = hex(await crypto.subtle.digest("SHA-256", out));
  if (digest !== file.sha256) throw new Error("download: the file is not the expected one");
  return out.buffer;
}

/** The tafkhim head, from the device or from the app; null if it cannot be had (the engine then works without it). */
async function loadPatch(): Promise<ArrayBuffer | null> {
  const kept = await cacheGet<ArrayBuffer>(PATCH.key);
  if (kept) return kept;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL ?? "/"}${PATCH.path}`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== PATCH.bytes || hex(await crypto.subtle.digest("SHA-256", buf)) !== PATCH.sha256) return null;
    await cachePut(PATCH.key, buf);
    return buf;
  } catch {
    return null;
  }
}

/** Download what is missing; progress in bytes. */
export async function installEngine(onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<void> {
  const total = MODEL.bytes + WASM.bytes;
  let done = 0;
  for (const file of [WASM, MODEL]) {
    if (await cacheGet<ArrayBuffer>(file.key)) {
      done += file.bytes;
      onProgress(done, total);
      continue;
    }
    const buf = await fetchVerified(
      file,
      (n) => {
        done += n;
        onProgress(done, total);
      },
      signal,
    );
    await cachePut(file.key, buf);
    if (!(await cacheGet<ArrayBuffer>(file.key))) throw new Error("storage: the device did not keep the file");
  }
  await loadPatch();
}

export async function removeEngine(): Promise<void> {
  worker?.terminate();
  worker = null;
  ready = null;
  await cacheDelete([MODEL.key, WASM.key, PATCH.key]);
}

let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;
let nextId = 1;

function startWorker(): Promise<Worker> {
  if (!ready) {
    ready = (async () => {
      const [model, wasm, patch] = await Promise.all([cacheGet<ArrayBuffer>(MODEL.key), cacheGet<ArrayBuffer>(WASM.key), loadPatch()]);
      if (!model || !wasm) throw new Error("engine not installed");
      const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "tajweed" });
      await new Promise<void>((resolve, reject) => {
        const onMsg = (e: MessageEvent<WorkerOut>) => {
          if (e.data.type === "ready") {
            w.removeEventListener("message", onMsg);
            resolve();
          } else if (e.data.type === "error") {
            w.removeEventListener("message", onMsg);
            reject(new Error(e.data.message));
          }
        };
        w.addEventListener("message", onMsg);
        w.addEventListener("error", (ev) => reject(new Error(ev.message || "worker")), { once: true });
        w.postMessage({ type: "init", model, wasm, patch } satisfies WorkerIn);
      });
      worker = w;
      return w;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

/** Send one request to the worker and wait for its answer (or its error). */
function ask<T>(w: Worker, msg: WorkerIn, transfer: Transferable[], pick: (m: WorkerOut) => T | undefined): Promise<T> {
  const id = (msg as { id: number }).id;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (!("id" in m) || m.id !== id) return;
      if (m.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(m.message));
        return;
      }
      const v = pick(m);
      if (v !== undefined) {
        w.removeEventListener("message", onMsg);
        resolve(v);
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage(msg, transfer);
  });
}

export type Follower = {
  /** The passage's words in order ("s:a:n") and where each lies in its script. */
  words: FollowWord[];
  /** The script's length (its end is the end of the passage). */
  length: number;
  /** The stretch of the script the last seconds heard cover (its end is where the reciter is now); null when it cannot be told. */
  step: (audio: Float32Array, at: number) => Promise<{ from: number; to: number } | null>;
};

/** Follow a passage live, with the model itself as the listener. */
export async function startFollowing(ayahs: Array<{ s: number; a: number }>): Promise<Follower> {
  const w = await startWorker();
  const planned = await ask(w, { type: "plan", id: nextId++, ayahs }, [], (m) => (m.type === "planned" ? m : undefined));
  return {
    words: planned.words,
    length: planned.length,
    step: (audio, at) =>
      ask(w, { type: "follow", id: nextId++, audio, at }, [audio.buffer], (m) => (m.type === "followed" ? { r: m.to === null || m.from === null ? null : { from: m.from, to: m.to } } : undefined)).then((x) => x.r),
  };
}

/** Hear a whole recitation and judge it, ayah by ayah. */
export async function judgeRecitation(audio: Float32Array, ayahs: Array<{ s: number; a: number }>, onProgress?: (done: number, total: number) => void): Promise<AyahVerdict[]> {
  const w = await startWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (!("id" in m) || m.id !== id) return;
      if (m.type === "progress") onProgress?.(m.done, m.total);
      else if (m.type === "verdicts") {
        w.removeEventListener("message", onMsg);
        resolve(m.verdicts);
      } else if (m.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(m.message));
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "judge", id, audio, ayahs } satisfies WorkerIn, [audio.buffer]);
  });
}
