import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createVoiceCounter, normalizeArabic, VOICE_TASBEEH_PHRASES } from "@/lib/voiceTasbeeh";

describe("voice tasbeeh counting", () => {
  it("reads the phrases however the recogniser spells them", () => {
    expect(normalizeArabic("سُبْحَانَ اللَّهِ")).toBe(normalizeArabic("سبحان الله"));
    expect(normalizeArabic("لا إله إلا الله")).toBe(normalizeArabic("لا اله الا الله"));
    expect(normalizeArabic("اللهُ أَكْبَر")).toBe(normalizeArabic("الله اكبر"));
    expect(normalizeArabic("الحمدُ لله.")).toBe("الحمدلله");
  });

  it("counts every repetition in one breath, once", () => {
    const counter = createVoiceCounter(VOICE_TASBEEH_PHRASES);
    // Partial results grow while the person keeps going.
    expect(counter.push("s1", "سبحان الله")).toEqual(["subhanallah"]);
    expect(counter.push("s1", "سبحان الله سبحان")).toEqual([]);
    expect(counter.push("s1", "سبحان الله سبحان الله سبحان الله")).toEqual(["subhanallah", "subhanallah"]);
    // The final result repeats the same words: nothing new.
    expect(counter.push("s1", "سبحان الله سبحان الله سبحان الله")).toEqual([]);
  });

  it("starts each segment from zero and never takes counts back", () => {
    const counter = createVoiceCounter(VOICE_TASBEEH_PHRASES);
    expect(counter.push("s1", "الحمد لله الحمد لله")).toEqual(["alhamdulillah", "alhamdulillah"]);
    // A revised, shorter transcript of the same segment.
    expect(counter.push("s1", "الحمد لله")).toEqual([]);
    expect(counter.push("s2", "الحمد لله")).toEqual(["alhamdulillah"]);
  });

  it("tells the four tasbeehat apart, including the full baqiyat", () => {
    const counter = createVoiceCounter(VOICE_TASBEEH_PHRASES);
    expect(counter.push("s1", "سبحان الله والحمد لله ولا إله إلا الله والله أكبر").sort())
      .toEqual(["alhamdulillah", "allahu_akbar", "la_ilaha_illallah", "subhanallah"]);
  });

  it("counts a custom dhikr", () => {
    const counter = createVoiceCounter([...VOICE_TASBEEH_PHRASES, { key: "custom", text: "أستغفر الله" }]);
    expect(counter.push("s1", "استغفر الله استغفر الله")).toEqual(["custom", "custom"]);
  });

  it("ignores speech that is not a dhikr", () => {
    const counter = createVoiceCounter(VOICE_TASBEEH_PHRASES);
    expect(counter.push("s1", "مرحبا كيف الحال")).toEqual([]);
  });
});

describe("voice tasbeeh in the apps", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("uses the phone's speech recognition on Android", () => {
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java")).toContain("registerPlugin(VoiceTasbeehPlugin.class)");
    const plugin = read("android/app/src/main/java/com/athar/adhkar/VoiceTasbeehPlugin.java");
    expect(plugin).toContain('name = "VoiceTasbeeh"');
    expect(plugin).toContain("EXTRA_PARTIAL_RESULTS");
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain("android.permission.RECORD_AUDIO");
    expect(manifest).toContain('<action android:name="android.speech.RecognitionService" />');
  });

  it("uses Apple's speech recognition on iPhone", () => {
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(VoiceTasbeehPlugin())");
    const plugin = read("ios/App/App/VoiceTasbeehPlugin.swift");
    expect(plugin).toContain('jsName = "VoiceTasbeeh"');
    expect(plugin).toContain("requiresOnDeviceRecognition = true");
    expect(plugin).toContain("shouldReportPartialResults = true");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("VoiceTasbeehPlugin.swift in Sources");
    const plist = read("ios/App/App/Info.plist");
    expect(plist).toContain("NSSpeechRecognitionUsageDescription");
    expect(plist).toContain("NSMicrophoneUsageDescription");
  });

  it("shows the voice button under the counter in the Sebha", () => {
    const sebha = read("src/pages/Sebha.tsx");
    expect(sebha).toContain("سبّح بصوتك");
    expect(sebha).toContain("useVoiceTasbeeh(");
  });
});
