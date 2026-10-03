export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
  } finally {
    a?.remove();
    // Some browsers start reading the blob after the click handler returns.
    // Revoking in the same turn can produce an empty or missing download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}
