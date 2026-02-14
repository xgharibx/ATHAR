#!/usr/bin/env node

const proc = globalThis.process;

const endpoint =
  proc?.env?.LEADERBOARD_ENDPOINT ||
  proc?.env?.VITE_LEADERBOARD_ENDPOINT ||
  "";
const apiKey =
  proc?.env?.LEADERBOARD_ANON_KEY ||
  proc?.env?.VITE_LEADERBOARD_ANON_KEY ||
  proc?.env?.VITE_SUPABASE_ANON_KEY ||
  proc?.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!endpoint) {
  console.error("[leaderboard:health] Missing endpoint.");
  console.error("Set LEADERBOARD_ENDPOINT or VITE_LEADERBOARD_ENDPOINT before running.");
  if (proc) proc.exitCode = 1;
  throw new Error("Missing endpoint");
}

const board = proc?.env?.LB_BOARD || "global";
const period = proc?.env?.LB_PERIOD || "daily";
const day = proc?.env?.LB_DAY || new Date().toISOString().slice(0, 10);

const url = new URL(endpoint);
url.searchParams.set("board", board);
url.searchParams.set("period", period);
url.searchParams.set("day", day);

async function run() {
  console.log(`[leaderboard:health] GET ${url.toString()}`);

  const headers = apiKey
    ? { apikey: apiKey, Authorization: `Bearer ${apiKey}` }
    : undefined;

  const res = await fetch(url.toString(), { method: "GET", headers });
  const text = await res.text();

  console.log(`[leaderboard:health] status: ${res.status}`);

  try {
    const json = JSON.parse(text);
    const rows = Array.isArray(json?.rows) ? json.rows : [];
    console.log(`[leaderboard:health] rows: ${rows.length}`);
    if (rows.length) {
      const top = rows[0];
      console.log(`[leaderboard:health] top: ${top?.name ?? "-"} (${top?.score ?? 0})`);
    }
    if (proc) proc.exitCode = res.ok ? 0 : 1;
    return;
  } catch {
    console.log(text.slice(0, 500));
    if (proc) proc.exitCode = res.ok ? 0 : 1;
    return;
  }
}

run().catch((err) => {
  console.error("[leaderboard:health] failed:", err?.message || err);
  if (proc) proc.exitCode = 1;
});
