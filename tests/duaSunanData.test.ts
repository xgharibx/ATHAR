import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { AdhkarDBSchema } from "@/data/types";

const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../public/data/adhkar.json"), "utf8"));
const db = AdhkarDBSchema.parse(raw);
const section = (id: string) => db.sections.find((s) => s.id === id)!;

describe("adhkar.json dua and sunnah sections", () => {
  it("still parses against the app's schema", () => {
    expect(db.sections.length).toBeGreaterThan(30);
  });

  it("has the dua sections filled out", () => {
    expect(section("quranic_duas").content.length).toBeGreaterThanOrEqual(45);
    expect(section("prophets_duas").content.length).toBeGreaterThanOrEqual(35);
    expect(section("prophetic_duas").content.length).toBeGreaterThanOrEqual(55);
    expect(section("jawami_dua").content.length).toBeGreaterThanOrEqual(30);
  });

  it("has a sunan section ahead of the forgotten sunnahs", () => {
    const ids = db.sections.map((s) => s.id);
    expect(ids.indexOf("sunan")).toBeGreaterThan(-1);
    expect(ids.indexOf("sunan")).toBeLessThan(ids.indexOf("forgotten_sunnahs"));
    expect(section("sunan").content.length).toBeGreaterThanOrEqual(70);
    expect(section("forgotten_sunnahs").content.length).toBeGreaterThanOrEqual(100);
  });

  it("carries some nine hundred sunan across the topical sections", () => {
    const ids = db.sections.map((s) => s.id).filter((id) => id === "sunan" || id.startsWith("sunan_"));
    expect(ids.length).toBeGreaterThanOrEqual(10);
    const total = ids.reduce((n, id) => n + section(id).content.length, 0);
    expect(total).toBeGreaterThanOrEqual(900);
    for (const id of ids) {
      for (const item of section(id).content) {
        expect(item.source.length, `${id}: ${item.text.slice(0, 30)}`).toBeGreaterThan(4);
        expect(item.text.length).toBeGreaterThan(5);
      }
    }
  });

  it("has the companions' duas and the themed dua collections", () => {
    expect(section("sahaba_duas").content.length).toBeGreaterThanOrEqual(15);
    for (const item of section("sahaba_duas").content) expect(item.source).toMatch(/^رواه .+ \([٠-٩]+\)$/);
    for (const id of ["dua_istiadha", "dua_maghfira", "dua_huda"]) expect(section(id).content.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every sunnah the hadith it comes from, with its number", () => {
    for (const item of section("sunan").content) {
      expect(item.source, item.text).toMatch(/^رواه .+ \([٠-٩]+\)$/);
      expect(item.source_label, item.text).toContain("«");
      expect(item.benefit.length, item.text).toBeGreaterThan(5);
    }
  });

  it("gives every added hadith dua a cited source", () => {
    for (const id of ["prophetic_duas", "jawami_dua"]) {
      const cited = section(id).content.filter((i) => /^رواه .+ \([٠-٩]+\)$/.test(i.source));
      expect(cited.length, id).toBeGreaterThanOrEqual(10);
    }
  });

  it("names the Quran reference on every added Quranic dua", () => {
    const labelled = section("quranic_duas").content.filter((i) => /[٠-٩0-9]/.test(i.benefit));
    expect(labelled.length).toBeGreaterThanOrEqual(45);
  });

  it("carries no corrupted characters or duplicate texts within a section", () => {
    for (const id of db.sections.map((x) => x.id).filter((x) => /dua|sunan|sunnah|sahaba|jawami/.test(x))) {
      const texts = section(id).content.map((i) => i.text);
      for (const t of texts) expect(t.includes("�"), `${id}: ${t.slice(0, 30)}`).toBe(false);
      expect(new Set(texts).size, id).toBe(texts.length);
    }
  });
});
