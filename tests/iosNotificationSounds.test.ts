import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const IOS_APP_ROOT = new URL("../ios/App/App/", import.meta.url);
const XCODE_PROJECT = new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url);
const SOUND_NAMES = ["adhan_ahmad_al_nafees", "birds"] as const;

function readCafDescription(fileName: string) {
  const bytes = readFileSync(new URL(`sounds/${fileName}.caf`, IOS_APP_ROOT));
  expect(bytes.toString("ascii", 0, 4), `${fileName} must be a Core Audio Format file`).toBe("caff");

  let offset = 8;
  let description: {
    sampleRate: number;
    format: string;
    bytesPerPacket: number;
    framesPerPacket: number;
    channels: number;
    bitsPerChannel: number;
  } | null = null;
  let audioBytes = 0;

  while (offset + 12 <= bytes.length) {
    const chunk = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = Number(bytes.readBigInt64BE(offset + 4));
    const payloadStart = offset + 12;
    const payloadEnd = payloadStart + chunkSize;
    expect(chunkSize).toBeGreaterThanOrEqual(0);
    expect(payloadEnd).toBeLessThanOrEqual(bytes.length);

    if (chunk === "desc") {
      expect(chunkSize).toBeGreaterThanOrEqual(32);
      description = {
        sampleRate: bytes.readDoubleBE(payloadStart),
        format: bytes.toString("ascii", payloadStart + 8, payloadStart + 12),
        bytesPerPacket: bytes.readUInt32BE(payloadStart + 16),
        framesPerPacket: bytes.readUInt32BE(payloadStart + 20),
        channels: bytes.readUInt32BE(payloadStart + 24),
        bitsPerChannel: bytes.readUInt32BE(payloadStart + 28),
      };
    } else if (chunk === "data") {
      expect(chunkSize).toBeGreaterThanOrEqual(4);
      audioBytes = chunkSize - 4; // CAF data chunks start with an edit count.
    }

    offset = payloadEnd;
  }

  expect(description, `${fileName} must declare its PCM format`).not.toBeNull();
  expect(audioBytes, `${fileName} must contain audio frames`).toBeGreaterThan(0);
  const details = description!;
  const durationSeconds = audioBytes / details.bytesPerPacket / details.sampleRate * details.framesPerPacket;
  return { ...details, durationSeconds };
}

describe("iOS notification sound resources", () => {
  it.each(SOUND_NAMES)("bundles %s as mono/stereo PCM CAF under the iOS alert limit", (name) => {
    const sound = readCafDescription(name);

    expect(sound.format).toBe("lpcm");
    expect(sound.sampleRate).toBeGreaterThanOrEqual(22050);
    expect(sound.channels).toBeGreaterThanOrEqual(1);
    expect(sound.channels).toBeLessThanOrEqual(2);
    expect(sound.bitsPerChannel).toBe(16);
    expect(sound.durationSeconds).toBeGreaterThan(0);
    expect(sound.durationSeconds).toBeLessThanOrEqual(29.9);
  });

  it.each(SOUND_NAMES)("copies %s into the root app bundle", (name) => {
    const project = readFileSync(XCODE_PROJECT, "utf8");
    const fileName = `${name}.caf`;

    expect(project).toContain(`path = ${fileName};`);
    expect(project.match(new RegExp(`${fileName} in Resources`, "g")) ?? []).toHaveLength(2);
  });
});
