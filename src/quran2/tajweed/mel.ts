/**
 * Whisper's 80-band log-mel spectrogram, as faster-whisper's FeatureExtractor
 * computes it (the model was trained on it): 16 kHz audio, a 400-sample Hann
 * window every 160 samples, the signal reflected at its ends, Slaney mel
 * filters, log10, the range held to 8 below the peak, scaled by (x + 4) / 4.
 * tests/quran2TajweedMel.test.ts checks it against the Python values.
 */
const N_FFT = 400;
const HOP = 160;
const N_MELS = 80;
const BINS = N_FFT / 2 + 1;

let filters: Float32Array | null = null;

/** The Slaney mel filter bank (80 × 201), exactly as faster-whisper builds it. */
export function melFilters(): Float32Array {
  if (filters) return filters;
  const sr = 16000;
  const fftFreqs = Array.from({ length: BINS }, (_, i) => (i * sr) / N_FFT);
  const minMel = 0;
  const maxMel = 45.245640471924965;
  const mels = Array.from({ length: N_MELS + 2 }, (_, i) => minMel + ((maxMel - minMel) * i) / (N_MELS + 1));
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  const freqs = mels.map((m) => (m >= minLogMel ? minLogHz * Math.exp(logStep * (m - minLogMel)) : fSp * m));
  const out = new Float32Array(N_MELS * BINS);
  for (let i = 0; i < N_MELS; i++) {
    const enorm = 2 / (freqs[i + 2]! - freqs[i]!);
    const lowDiff = freqs[i + 1]! - freqs[i]!;
    const upDiff = freqs[i + 2]! - freqs[i + 1]!;
    for (let k = 0; k < BINS; k++) {
      const lower = -(freqs[i]! - fftFreqs[k]!) / lowDiff;
      const upper = (freqs[i + 2]! - fftFreqs[k]!) / upDiff;
      out[i * BINS + k] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
  }
  filters = out;
  return out;
}

// The FFT of 400 points, by its factors (2·2·2·2·5·5), recursively.
const COS = new Float64Array(N_FFT);
const SIN = new Float64Array(N_FFT);
for (let t = 0; t < N_FFT; t++) {
  COS[t] = Math.cos((2 * Math.PI * t) / N_FFT);
  SIN[t] = -Math.sin((2 * Math.PI * t) / N_FFT);
}

function fft(re: Float64Array, im: Float64Array): [Float64Array, Float64Array] {
  const n = re.length;
  if (n === 1) return [re, im];
  const p = n % 2 === 0 ? 2 : n % 5 === 0 ? 5 : n;
  const m = n / p;
  const subs: Array<[Float64Array, Float64Array]> = [];
  for (let q = 0; q < p; q++) {
    const r = new Float64Array(m);
    const i = new Float64Array(m);
    for (let j = 0; j < m; j++) {
      r[j] = re[j * p + q]!;
      i[j] = im[j * p + q]!;
    }
    subs.push(m === 1 ? [r, i] : fft(r, i));
  }
  const outR = new Float64Array(n);
  const outI = new Float64Array(n);
  const step = N_FFT / n;
  for (let k = 0; k < n; k++) {
    let sr = 0;
    let si = 0;
    const km = k % m;
    for (let q = 0; q < p; q++) {
      const t = ((q * k) % n) * step;
      const c = COS[t]!;
      const s = SIN[t]!;
      const yr = subs[q]![0][km]!;
      const yi = subs[q]![1][km]!;
      sr += yr * c - yi * s;
      si += yr * s + yi * c;
    }
    outR[k] = sr;
    outI[k] = si;
  }
  return [outR, outI];
}

/** The spectrogram of 16 kHz audio: [80 × frames], frames = floor(length / 160). */
export function logMel(audio: Float32Array): { data: Float32Array; frames: number } {
  const n = audio.length;
  const pad = N_FFT / 2;
  // Reflect the signal at both ends (numpy's "reflect": the edge sample itself is not repeated).
  const x = new Float32Array(n + 2 * pad);
  for (let i = 0; i < pad; i++) x[i] = audio[Math.min(n - 1, pad - i)] ?? 0;
  x.set(audio, pad);
  for (let i = 0; i < pad; i++) x[pad + n + i] = audio[Math.max(0, n - 2 - i)] ?? 0;
  const frames = Math.floor(n / HOP);
  const win = new Float32Array(N_FFT);
  for (let i = 0; i < N_FFT; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N_FFT);
  const mf = melFilters();
  const mel = new Float32Array(N_MELS * frames);
  const re = new Float64Array(N_FFT);
  const im = new Float64Array(N_FFT);
  const power = new Float32Array(BINS);
  for (let f = 0; f < frames; f++) {
    const o = f * HOP;
    for (let i = 0; i < N_FFT; i++) {
      re[i] = Math.fround(x[o + i]! * win[i]!);
      im[i] = 0;
    }
    const [R, I] = fft(re, im);
    for (let k = 0; k < BINS; k++) {
      // complex64, then |X|²
      const r = Math.fround(R[k]!);
      const ii = Math.fround(I[k]!);
      power[k] = Math.fround(Math.hypot(r, ii) ** 2);
    }
    for (let m = 0; m < N_MELS; m++) {
      let sum = 0;
      const row = m * BINS;
      for (let k = 0; k < BINS; k++) sum += mf[row + k]! * power[k]!;
      mel[m * frames + f] = sum;
    }
  }
  let max = -Infinity;
  for (let i = 0; i < mel.length; i++) {
    const v = Math.log10(Math.max(mel[i]!, 1e-10));
    mel[i] = v;
    if (v > max) max = v;
  }
  for (let i = 0; i < mel.length; i++) mel[i] = (Math.max(mel[i]!, max - 8) + 4) / 4;
  return { data: mel, frames };
}

/** The model's input: the spectrogram cut to an even number of frames, at most 3000 (30 s). */
export function modelInput(audio: Float32Array): { data: Float32Array; frames: number } {
  const { data, frames } = logMel(audio);
  const keep = Math.min(3000, Math.floor(frames / 2) * 2);
  if (keep === frames) return { data, frames };
  const out = new Float32Array(N_MELS * keep);
  for (let m = 0; m < N_MELS; m++) out.set(data.subarray(m * frames, m * frames + keep), m * keep);
  return { data: out, frames: keep };
}
