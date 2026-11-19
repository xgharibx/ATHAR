// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { startDigitShaping, stopDigitShaping, __test } from "@/lib/digitShaping";

describe("digit shaping", () => {
  afterEach(() => {
    stopDigitShaping();
    document.body.innerHTML = "";
  });

  it("writes Latin digits as Arabic ones", () => {
    expect(__test.toArabic("آية 60، 0/374")).toBe("آية ٦٠، ٠/٣٧٤");
  });

  it("shapes text and spoken labels, but leaves English, inputs and code as they are", async () => {
    document.body.innerHTML = `
      <p id="a">الجزء 3</p>
      <button id="b" aria-label="التقدم: 2 من 9">x</button>
      <p id="c" lang="en">Hubble (1929)</p>
      <p id="d">Surah 2</p>
      <input id="e" value="12" />
      <code id="f">v1.2</code>
      <span id="g" data-latin-digits>mp3quran 114</span>`;
    startDigitShaping(document.body);
    expect(document.getElementById("a")!.textContent).toBe("الجزء ٣");
    expect(document.getElementById("b")!.getAttribute("aria-label")).toBe("التقدم: ٢ من ٩");
    expect(document.getElementById("c")!.textContent).toBe("Hubble (1929)");
    expect(document.getElementById("d")!.textContent).toBe("Surah 2");
    expect((document.getElementById("e") as HTMLInputElement).value).toBe("12");
    expect(document.getElementById("f")!.textContent).toBe("v1.2");
    expect(document.getElementById("g")!.textContent).toBe("mp3quran 114");
  });

  it("keeps shaping what appears later", async () => {
    startDigitShaping(document.body);
    const p = document.createElement("p");
    p.textContent = "صفحة 50";
    document.body.appendChild(p);
    await new Promise((r) => setTimeout(r, 0));
    expect(p.textContent).toBe("صفحة ٥٠");
    p.firstChild!.nodeValue = "صفحة 51";
    await new Promise((r) => setTimeout(r, 0));
    expect(p.textContent).toBe("صفحة ٥١");
  });
});
