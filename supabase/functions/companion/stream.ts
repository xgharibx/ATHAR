
/**
 * Applies reply finalization to a model response on its way to the client.
 *
 * Streaming responses are server-sent events. The text of a reply is held
 * until the model has finished it, because a reply can only be cleaned and
 * verified as a whole; it is then sent in one piece. Every other event,
 * including the model's progress events, is forwarded as it arrives, so the
 * connection stays active while the reader waits.
 */

type StreamEvent = {
  type?: string;
  index?: number;
  content_block?: { type?: string; text?: string };
  delta?: { type?: string; text?: string };
};

function textDeltaEvent(index: number, text: string): string {
  const data = { type: "content_block_delta", index, delta: { type: "text_delta", text } };
  return `event: content_block_delta\ndata: ${JSON.stringify(data)}\n\n`;
}

const DELTA_CHUNK_CHARS = 400;

/** Turns the model's raw reply text into the text the reader is shown. */
export type Finalize = (rawText: string) => Promise<string>;

/** Transform one complete SSE event. Exported for tests. */
export async function guardSseEvent(raw: string, finalize: Finalize, textBlocks: Map<number, string>): Promise<string> {
  const dataLine = raw.split(/\r?\n/).find((line) => line.startsWith("data:"));
  if (!dataLine) return `${raw}\n\n`;
  let event: StreamEvent;
  try {
    event = JSON.parse(dataLine.slice(5).trim()) as StreamEvent;
  } catch {
    return `${raw}\n\n`;
  }
  const index = typeof event.index === "number" ? event.index : -1;
  if (event.type === "content_block_start" && event.content_block?.type === "text") {
    textBlocks.set(index, String(event.content_block.text ?? ""));
    return `${raw}\n\n`;
  }
  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
    textBlocks.set(index, (textBlocks.get(index) ?? "") + String(event.delta.text ?? ""));
    return "";
  }
  if (event.type === "content_block_stop" && textBlocks.has(index)) {
    const text = await finalize(textBlocks.get(index) ?? "");
    textBlocks.delete(index);
    let out = "";
    for (let at = 0; at < text.length; at += DELTA_CHUNK_CHARS) out += textDeltaEvent(index, text.slice(at, at + DELTA_CHUNK_CHARS));
    return out + `${raw}\n\n`;
  }
  return `${raw}\n\n`;
}

export function guardSseStream(upstream: ReadableStream<Uint8Array>, finalize: Finalize): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const textBlocks = new Map<number, string>();
  let buffer = "";
  const reader = upstream.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) controller.enqueue(encoder.encode(await guardSseEvent(buffer.trim(), finalize, textBlocks)));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let out = "";
        for (;;) {
          const boundary = /\r?\n\r?\n/.exec(buffer);
          if (!boundary) break;
          const raw = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          if (raw.trim()) out += await guardSseEvent(raw, finalize, textBlocks);
        }
        if (out) {
          controller.enqueue(encoder.encode(out));
          return;
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/** Finalize the text of a complete (non-streaming) message object. */
export async function guardMessage(message: unknown, finalize: Finalize): Promise<unknown> {
  const content = (message as { content?: unknown })?.content;
  if (!Array.isArray(content)) return message;
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: unknown }).type === "text") {
      const textBlock = block as { text?: unknown };
      textBlock.text = await finalize(String(textBlock.text ?? ""));
    }
  }
  return message;
}
