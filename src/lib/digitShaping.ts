/**
 * Arabic digits everywhere, from one place.
 *
 * Numbers reach the screen from hundreds of components («0/374»، «آية 60»،
 * «خطوة 3»…). Converting each at its source never stays complete, so the
 * app shapes digits as they are shown: every visible text node, and the
 * labels screen readers speak, get Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩).
 *
 * The underlying values are untouched (React state, stored data, what you
 * type). Left alone: anything marked English (`lang="en…"`), fields you type
 * in, code, and anything marked `data-latin-digits` (a URL, a version, a
 * reference that must stay as printed).
 */
const LATIN = /[0-9]/;
const LATIN_ALL = /[0-9]/g;
const AR = "٠١٢٣٤٥٦٧٨٩";
const SKIP = "script,style,textarea,input,code,pre,kbd,samp,[contenteditable=''],[contenteditable='true'],[data-latin-digits]";
const ATTRS = ["aria-label", "title", "placeholder", "aria-valuetext", "alt"];

function toArabic(s: string): string {
  return s.replace(LATIN_ALL, (d) => AR[d.charCodeAt(0) - 48]!);
}

function skipped(el: Element | null): boolean {
  if (!el) return true;
  if (el.closest(SKIP)) return true;
  const lang = el.closest("[lang]")?.getAttribute("lang") ?? "";
  return lang.toLowerCase().startsWith("en");
}

const LATIN_LETTERS = /[A-Za-z]/;
const ARABIC_LETTERS = /[\u0600-\u06FF]/;

/** English or technical text («Hubble (1929)»، «21.42°N») keeps its own digits. */
function isLatinText(v: string): boolean {
  return LATIN_LETTERS.test(v) && !ARABIC_LETTERS.test(v);
}

function shapeText(node: Text): void {
  const v = node.nodeValue;
  if (!v || !LATIN.test(v) || isLatinText(v)) return;
  if (skipped(node.parentElement)) return;
  node.nodeValue = toArabic(v);
}

function shapeAttrs(el: Element): void {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && LATIN.test(v) && !isLatinText(v) && !skipped(el)) el.setAttribute(a, toArabic(v));
  }
}

function shapeTree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    shapeText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (el.matches(SKIP)) return;
    shapeAttrs(el);
    for (const child of el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(","))) shapeAttrs(child);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) shapeText(n as Text);
}

let observer: MutationObserver | null = null;

/** Starts shaping the page's digits. Safe to call more than once. */
export function startDigitShaping(root: HTMLElement = document.body): () => void {
  if (observer || typeof MutationObserver === "undefined") return stopDigitShaping;
  shapeTree(root);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") shapeText(r.target as Text);
      else if (r.type === "attributes") shapeAttrs(r.target as Element);
      else r.addedNodes.forEach(shapeTree);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return stopDigitShaping;
}

export function stopDigitShaping(): void {
  observer?.disconnect();
  observer = null;
}

export const __test = { toArabic, shapeTree };
