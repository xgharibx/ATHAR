/** Wraps logical Arabic text without reversing its words for RTL rendering. */
export function wrapHadithPosterText(
  text: string,
  maxWidth: number,
  measureText: (text: string) => number,
): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureText(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}
