/** How the text is shown while reciting from memory. */
export type TasmeeMode = "hidden" | "cue" | "shown";

export function readMode(value: string | null): TasmeeMode {
  return value === "cue" || value === "shown" ? value : "hidden";
}
