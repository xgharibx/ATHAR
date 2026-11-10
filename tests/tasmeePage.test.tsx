// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { loadQuranDB } from "@/data/quranLoad";
import type { QuranDB } from "@/data/quranTypes";
import { arNum } from "@/lib/formatNumber";
import { TasmeePage } from "@/pages/Tasmee";

vi.mock("@/data/quranLoad", () => ({ loadQuranDB: vi.fn() }));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));
vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn() } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const quran: QuranDB = [{
  id: 1,
  name: "الفاتحة",
  englishName: "Al-Fatiha",
  ayahs: ["بسم الله الرحمن الرحيم", "الحمد لله رب العالمين"],
}];

let root: Root;
let container: HTMLDivElement;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function mount(strict = false) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    const page = <MemoryRouter><TasmeePage /></MemoryRouter>;
    root.render(strict ? <React.StrictMode>{page}</React.StrictMode> : page);
    await Promise.resolve();
  });
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(document.body.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.includes(label));
  if (!(found instanceof HTMLButtonElement)) throw new Error(`Missing button: ${label}`);
  return found;
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.mocked(loadQuranDB).mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  container.remove();
  document.body.innerHTML = "";
});

describe("Quran memorization session", () => {
  it("grades one verse once when the user taps a grading button repeatedly", async () => {
    vi.mocked(loadQuranDB).mockResolvedValue(quran);
    await mount();

    act(() => button("ابدأ التسميع").click());
    const mastered = button("أتقنتها");
    act(() => {
      mastered.click();
      mastered.click();
    });

    expect(document.body.textContent).toContain(`الآية ${arNum(2)} من ${arNum(2)}`);
    expect(document.body.textContent).toContain(`✓ ${arNum(1)} إتقان`);
  });

  it("schedules only one missed result when the user taps the reveal action repeatedly", async () => {
    vi.useFakeTimers();
    vi.mocked(loadQuranDB).mockResolvedValue(quran);
    await mount();

    act(() => button("ابدأ التسميع").click());
    const missed = button("أخطأت — أرِني");
    act(() => {
      missed.click();
      missed.click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(document.body.textContent).toContain(`الآية ${arNum(2)} من ${arNum(2)}`);
    expect(document.body.textContent).toContain(`✗ ${arNum(1)} تحتاج مراجعة`);
  });

  it("does not accept a second grade while the missed reveal is pending", async () => {
    vi.useFakeTimers();
    vi.mocked(loadQuranDB).mockResolvedValue(quran);
    await mount();

    act(() => button("ابدأ التسميع").click());
    act(() => {
      button("أخطأت — أرِني").click();
      button("أتقنتها").click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(document.body.textContent).toContain(`الآية ${arNum(2)} من ${arNum(2)}`);
    expect(document.body.textContent).toContain(`✗ ${arNum(1)} تحتاج مراجعة`);
    expect(document.body.textContent).toContain(`✓ ${arNum(0)} إتقان`);
  });

  it("lets the user retry Quran loading after the local dataset fails", async () => {
    vi.mocked(loadQuranDB)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(quran);
    await mount();

    await act(async () => {
      button("إعادة المحاولة").click();
      await Promise.resolve();
    });

    expect(button("ابدأ التسميع").disabled).toBe(false);
  });

  it("ignores an older Quran load failure after a newer Strict Mode load succeeds", async () => {
    const staleFailure = deferred<QuranDB>();
    const currentSuccess = deferred<QuranDB>();
    vi.mocked(loadQuranDB)
      .mockReturnValueOnce(staleFailure.promise)
      .mockReturnValueOnce(currentSuccess.promise);
    await mount(true);

    expect(loadQuranDB).toHaveBeenCalledTimes(2);
    await act(async () => {
      currentSuccess.resolve(quran);
      await currentSuccess.promise;
    });
    await act(async () => {
      staleFailure.reject(new Error("stale offline response"));
      await staleFailure.promise.catch(() => undefined);
    });

    expect(button("ابدأ التسميع").disabled).toBe(false);
  });
});
