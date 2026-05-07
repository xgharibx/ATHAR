/**
 * fetch-avatars.mjs
 * Scrapes YouTube channel pages to extract high-res avatar URLs,
 * then patches them into public/data/video-library.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");

const HDRS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ar,en-US;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function extractJsonAt(html, offset) {
  let depth = 0, i = offset, inStr = false, esc = false;
  while (i < html.length) {
    const ch = html[i];
    if (esc) { esc = false; i++; continue; }
    if (ch === "\\" && inStr) { esc = true; i++; continue; }
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return html.slice(offset, i + 1); }
    }
    i++;
  }
  return html.slice(offset);
}

function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) { obj.forEach(i => findAll(i, key, out)); return out; }
  if (obj && typeof obj === "object") {
    if (key in obj) out.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, out);
  }
  return out;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms + Math.random() * 300)); }

async function fetchAvatar(channel) {
  const url = channel.youtubeUrl || `https://www.youtube.com/${channel.handle}`;
  console.log(`  ↳ ${channel.displayName}: ${url}`);

  try {
    const res = await fetch(url, { headers: HDRS });
    const html = await res.text();

    // Try ytInitialData first
    const marker = "var ytInitialData = ";
    const start = html.indexOf(marker);
    if (start !== -1) {
      try {
        const data = JSON.parse(extractJsonAt(html, start + marker.length));

        // c4TabbedHeaderRenderer has the avatar
        const headers = findAll(data, "c4TabbedHeaderRenderer");
        for (const h of headers) {
          const thumbs = h.avatar?.thumbnails || [];
          const best = thumbs.slice(-1)[0]?.url;
          if (best) {
            // Upgrade to higher res
            const hq = best.replace(/=s\d+-c/, "=s240-c").replace(/=s\d+/, "=s240");
            console.log(`    ✓ Found avatar (c4TabbedHeaderRenderer): ${hq.slice(0, 80)}...`);
            return hq;
          }
        }

        // channelMetadataRenderer fallback
        const meta = findAll(data, "channelMetadataRenderer");
        for (const m of meta) {
          const thumbs = m.avatar?.thumbnails || [];
          const best = thumbs.slice(-1)[0]?.url;
          if (best) {
            const hq = best.replace(/=s\d+-c/, "=s240-c").replace(/=s\d+/, "=s240");
            console.log(`    ✓ Found avatar (channelMetadataRenderer): ${hq.slice(0, 80)}...`);
            return hq;
          }
        }

        // Any thumbnail with yt3.googleusercontent.com domain (channel avatars)
        const allThumbs = findAll(data, "thumbnails").flat();
        const avatarThumb = allThumbs.find(t => t?.url?.includes("yt3.googleusercontent.com") || t?.url?.includes("yt3.ggpht.com"));
        if (avatarThumb) {
          const hq = avatarThumb.url.replace(/=s\d+-c/, "=s240-c").replace(/=s\d+/, "=s240");
          console.log(`    ✓ Found avatar (generic): ${hq.slice(0, 80)}...`);
          return hq;
        }
      } catch (e) {
        console.warn(`    ⚠ JSON parse error: ${e.message}`);
      }
    }

    // Fallback: look for og:image meta tag (channel profile photo)
    const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogMatch) {
      const hq = ogMatch[1].replace(/=s\d+-c/, "=s240-c");
      console.log(`    ✓ Found avatar (og:image): ${hq.slice(0, 80)}...`);
      return hq;
    }

    console.warn(`    ✗ No avatar found`);
    return null;
  } catch (e) {
    console.warn(`    ✗ Fetch error: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("🖼  Fetching YouTube channel avatars\n");

  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));

  for (const ch of db.channels) {
    if (ch.avatarUrl) {
      console.log(`  ✓ ${ch.displayName}: already has avatar`);
      continue;
    }
    const url = await fetchAvatar(ch);
    if (url) ch.avatarUrl = url;
    await delay(1200);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log("\n✅ Done — avatars written to video-library.json");
  db.channels.forEach(c => console.log(`  ${c.displayName}: ${c.avatarUrl ? "✓" : "✗"}`));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
