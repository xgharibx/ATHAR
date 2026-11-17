
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
/** Placed between separate text blocks so each is weighed as its own attempt. */
export const BLOCK_SEPARATOR = "\n\u3000\n";

/** Turns the model's raw reply text into the text the reader is shown. */
export type Finalize = (rawText: string) => Promise<string>;

/** Text blocks seen so far in one streamed message. */
export type StreamState = {
  /** Raw text of each text block, by content index. */
  texts: Map<number, string>;
  /** Closing events of text blocks, held until the reply has been finalized. */
  heldStops: string[];
  released: boolean;
};

export function newStreamState(): StreamState {
  return { texts: new Map(), heldStops: [], released: false };
}

/**
 * The model can write its answer in more than one text block, for example
 * when it starts again. They are one reply to the reader, so they are
 * finalized together and sent once, in the first text block.
 */
async function releaseReply(state: StreamState, finalize: Finalize): Promise<string> {
  if (state.released || state.texts.size === 0) return "";
  state.released = true;
  const indexes = Array.from(state.texts.keys()).sort((a, b) => a - b);
  const raw = indexes.map((index) => state.texts.get(index) ?? "").filter((text) => text.trim()).join(BLOCK_SEPARATOR);
  const text = await finalize(raw);
  let out = "";
  for (let at = 0; at < text.length; at += DELTA_CHUNK_CHARS) out += textDeltaEvent(indexes[0]!, text.slice(at, at + DELTA_CHUNK_CHARS));
  return out + state.heldStops.join("");
}

/** Transform one complete SSE event. Exported for tests. */
export async function guardSseEvent(raw: string, finalize: Finalize, state: StreamState): Promise<string> {
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
    state.texts.set(index, String(event.content_block.text ?? ""));
    return `${raw}\n\n`;
  }
  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
    state.texts.set(index, (state.texts.get(index) ?? "") + String(event.delta.text ?? ""));
    return "";
  }
  if (event.type === "content_block_stop" && state.texts.has(index)) {
    state.heldStops.push(`${raw}\n\n`);
    return "";
  }
  // The message is complete once its closing events arrive.
  if (event.type === "message_delta" || event.type === "message_stop") {
    return (await releaseReply(state, finalize)) + `${raw}\n\n`;
  }
  return `${raw}\n\n`;
}

export function guardSseStream(upstream: ReadableStream<Uint8Array>, finalize: Finalize): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const state = newStreamState();
  let buffer = "";
  const reader = upstream.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          let tail = buffer.trim() ? await guardSseEvent(buffer.trim(), finalize, state) : "";
          // A stream cut short still delivers whatever reply it carried.
          tail += await releaseReply(state, finalize);
          if (tail) controller.enqueue(encoder.encode(tail));
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
          if (raw.trim()) out += await guardSseEvent(raw, finalize, state);
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
  const textBlocks = content.filter((block) => block && typeof block === "object" && (block as { type?: unknown }).type === "text") as Array<{ text?: unknown }>;
  if (textBlocks.length === 0) return message;
  const raw = textBlocks.map((block) => String(block.text ?? "")).filter((text) => text.trim()).join(BLOCK_SEPARATOR);
  const text = await finalize(raw);
  textBlocks.forEach((block, index) => { block.text = index === 0 ? text : ""; });
  return message;
}
