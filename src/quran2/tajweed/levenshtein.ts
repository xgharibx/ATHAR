/**
 * Edit distance and alignment, as python-Levenshtein computes them (imam.py's
 * reference): the same distance, and the same choice among equally short
 * alignments — the common prefix and suffix set aside, then the path traced
 * back from the end, deleting where the distance allows it, inserting next,
 * matching otherwise. tests/quran2Tajweed.test.ts checks both against vectors
 * from the Python library.
 */

/**
 * The number of edits from a to b: Myers' bit-parallel algorithm (Hyyrö's
 * form), the pattern in blocks of 32, one block at a time across the text,
 * the horizontal carries kept per text position.
 */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  // What both share at the ends never costs anything.
  let pre = 0;
  while (pre < a.length && pre < b.length && a.charCodeAt(pre) === b.charCodeAt(pre)) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a.charCodeAt(a.length - 1 - suf) === b.charCodeAt(b.length - 1 - suf)) suf++;
  let s1 = a.slice(pre, a.length - suf);
  let s2 = b.slice(pre, b.length - suf);
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  // s2 (the pattern, in bits) is the shorter one; s1 is the text.
  if (s2.length > s1.length) [s1, s2] = [s2, s1];
  const n = s1.length;
  const m = s2.length;
  const peq = new Map<number, number>();
  const hBlocks = Math.ceil(n / 32);
  const phc = new Int32Array(hBlocks).fill(-1);
  const mhc = new Int32Array(hBlocks);
  const vBlocks = Math.ceil(m / 32);
  let score = m;
  for (let blk = 0; blk < vBlocks; blk++) {
    const start = blk * 32;
    const end = Math.min(m, start + 32);
    peq.clear();
    for (let k = start; k < end; k++) {
      const c = s2.charCodeAt(k);
      peq.set(c, (peq.get(c) ?? 0) | (1 << (k - start)));
    }
    const last = blk === vBlocks - 1;
    const top = 1 << (end - start - 1);
    let mv = 0;
    let pv = -1;
    score = m;
    for (let i = 0; i < n; i++) {
      const eq = peq.get(s1.charCodeAt(i)) ?? 0;
      const word = i >>> 5;
      const bit = i & 31;
      const pb = (phc[word]! >>> bit) & 1;
      const mb = (mhc[word]! >>> bit) & 1;
      const xv = eq | mv;
      const xh = ((((eq | mb) & pv) + pv) ^ pv) | eq | mb;
      let ph = mv | ~(xh | pv);
      let mh = pv & xh;
      if (last) {
        if (ph & top) score++;
        if (mh & top) score--;
      }
      if (((ph >>> 31) ^ pb) & 1) phc[word] = phc[word]! ^ (1 << bit);
      if (((mh >>> 31) ^ mb) & 1) mhc[word] = mhc[word]! ^ (1 << bit);
      ph = (ph << 1) | pb;
      mh = (mh << 1) | mb;
      pv = mh | ~(xv | ph);
      mv = ph & xv;
    }
  }
  return score;
}

export type Opcode = ["equal" | "replace" | "delete" | "insert", number, number, number, number];
type Editop = ["replace" | "delete" | "insert", number, number];

function editopsCore(s1: string, s2: string, pre: number): Editop[] {
  const n = s1.length;
  const m = s2.length;
  const w = m + 1;
  const D = new Int32Array((n + 1) * w);
  for (let i = 0; i <= n; i++) D[i * w] = i;
  for (let j = 0; j <= m; j++) D[j] = j;
  for (let i = 1; i <= n; i++) {
    const ci = s1.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      const sub = D[(i - 1) * w + j - 1]! + (ci === s2.charCodeAt(j - 1) ? 0 : 1);
      const del = D[(i - 1) * w + j]! + 1;
      const ins = D[i * w + j - 1]! + 1;
      D[i * w + j] = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
    }
  }
  const ops: Editop[] = [];
  let i = n;
  let j = m;
  while (i && j) {
    if (D[i * w + j]! - D[(i - 1) * w + j]! === 1) {
      i--;
      ops.push(["delete", i + pre, j + pre]);
    } else {
      j--;
      if (j && D[i * w + j]! - D[(i - 1) * w + j]! === -1) {
        ops.push(["insert", i + pre, j + pre]);
      } else {
        i--;
        if (s1.charCodeAt(i) !== s2.charCodeAt(j)) ops.push(["replace", i + pre, j + pre]);
      }
    }
  }
  while (i) {
    i--;
    ops.push(["delete", i + pre, j + pre]);
  }
  while (j) {
    j--;
    ops.push(["insert", i + pre, j + pre]);
  }
  return ops.reverse();
}

/** The alignment of a to b, as blocks: equal, replace, delete, insert. */
export function opcodes(a: string, b: string): Opcode[] {
  let pre = 0;
  while (pre < a.length && pre < b.length && a.charCodeAt(pre) === b.charCodeAt(pre)) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a.charCodeAt(a.length - 1 - suf) === b.charCodeAt(b.length - 1 - suf)) suf++;
  const ops = editopsCore(a.slice(pre, a.length - suf), b.slice(pre, b.length - suf), pre);
  const out: Opcode[] = [];
  let sp = 0;
  let dp = 0;
  let k = 0;
  while (k < ops.length) {
    const [t, i, j] = ops[k]!;
    if (sp < i || dp < j) {
      out.push(["equal", sp, i, dp, j]);
      sp = i;
      dp = j;
    }
    const sb = sp;
    const db = dp;
    while (k < ops.length && ops[k]![0] === t && ops[k]![1] === sp && ops[k]![2] === dp) {
      if (t === "replace") {
        sp++;
        dp++;
      } else if (t === "delete") sp++;
      else dp++;
      k++;
    }
    out.push([t, sb, sp, db, dp]);
  }
  if (sp < a.length || dp < b.length) out.push(["equal", sp, a.length, dp, b.length]);
  return out;
}
