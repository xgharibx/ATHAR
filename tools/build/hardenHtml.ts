import { createHash } from "node:crypto";

/**
 * Production hardening for the HTML shell.
 *
 * Two things are added to the built index.html:
 *
 * 1. A Content-Security-Policy. The site is served from static hosting that
 *    cannot set response headers, so the policy travels as a <meta> tag. Inline
 *    scripts are allowed by hash only, which means a script injected into the
 *    page (through a compromised dependency, an extension-free XSS, or tampered
 *    markup) does not run. Hashes are computed from the built file, so editing
 *    an inline script never needs a manual policy update.
 *
 * 2. A guard that neutralises the React DevTools hook, so component state and
 *    props cannot be browsed or edited from the browser's developer tools.
 *
 * Neither makes client code secret: anything shipped to a browser can be read.
 * Secrets stay on the server, and the server enforces every permission.
 */

/** Runs before any module script. Must stay dependency-free and ES5-safe. */
export const DEVTOOLS_GUARD =
  '(function(){try{var h=window.__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!h||typeof h!=="object")return;' +
  'for(var k in h){if(k==="renderers"){h[k]=new Map()}else{h[k]=typeof h[k]==="function"?function(){}:null}}}catch(e){}})();';

const NON_EXECUTABLE_TYPES = new Set(["application/json", "application/ld+json", "importmap", "speculationrules"]);

function sha256(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("base64");
}

/** Bodies of inline scripts the browser will execute, in document order. */
export function inlineExecutableScripts(html: string): string[] {
  const bodies: string[] = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = match[1] ?? "";
    const body = match[2] ?? "";
    if (/\bsrc\s*=/.test(attributes)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes)?.[1]?.toLowerCase();
    if (type && NON_EXECUTABLE_TYPES.has(type)) continue;
    if (!body.trim()) continue;
    bodies.push(body);
  }
  return bodies;
}

export function buildContentSecurityPolicy(scriptHashes: string[]): string {
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        ...scriptHashes.map((hash) => `'sha256-${hash}'`),
        "'wasm-unsafe-eval'",
        // YouTube's player API, used by the video library and shorts feed.
        "https://www.youtube.com",
        "https://s.ytimg.com",
      ],
    ],
    // Component libraries set inline styles; styles cannot run code.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // The fonts ship with the app (src/styles/fonts.css).
    ["font-src", ["'self'", "data:"]],
    // Recitations, radio streams, thumbnails and content APIs come from many
    // HTTPS hosts listed in data files, so these stay scheme-restricted.
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["media-src", ["'self'", "data:", "blob:", "https:"]],
    ["connect-src", ["'self'", "data:", "blob:", "https:", "wss:"]],
    // The apps play YouTube through athark.org's player page (YouTube refuses
    // their own pages as referrers); see src/lib/youtubePlayer.ts.
    ["frame-src", ["https://www.youtube.com", "https://www.youtube-nocookie.com", "https://www.athark.org"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

export function hardenHtml(html: string): string {
  if (!/<meta\s+charset=/i.test(html)) {
    throw new Error("hardenHtml: expected a <meta charset> tag to anchor the security tags");
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script\b[\s\S]*?<\/script>/gi, ""))) {
    throw new Error("hardenHtml: inline event handlers are blocked by the content security policy");
  }

  const guard = `<script>${DEVTOOLS_GUARD}</script>`;
  const withGuard = html.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n    ${guard}`);
  const hashes = inlineExecutableScripts(withGuard).map(sha256);
  const policy = buildContentSecurityPolicy(hashes.filter((hash, index) => hashes.indexOf(hash) === index));
  const tags =
    `<meta http-equiv="Content-Security-Policy" content="${policy}" />\n` +
    `    <meta name="referrer" content="strict-origin-when-cross-origin" />`;
  return withGuard.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n    ${tags}`);
}

/** Vite plugin: applies the hardening to production builds only. */
export function hardenHtmlPlugin() {
  return {
    name: "athar-harden-html",
    apply: "build" as const,
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => hardenHtml(html),
    },
  };
}
