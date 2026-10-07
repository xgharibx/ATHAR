export function vendorChunk(id: string): string | undefined {
  // Shared helpers must stay with the eager runtime. Putting one in a lazy
  // engine makes every dynamic import depend on that entire engine at boot.
  if (id.includes("vite/preload-helper") || id.includes("commonjsHelpers")) return "vendor-react";
  const path = id.replaceAll("\\", "/");
  if (!path.includes("/node_modules/")) return;
  const has = (name: string) => path.includes(`/node_modules/${name}/`);
  if (has("@react-three/fiber") || has("@react-three/drei") || has("@react-three/postprocessing") || has("three") || has("postprocessing") || has("maath")) return "vendor-three";
  if (has("lottie-react") || has("lottie-web")) return "vendor-lottie";
  if (has("gsap")) return "vendor-motion";
  if (has("react-router-dom") || has("react-router")) return "vendor-router";
  if (has("@tanstack/react-query") || has("@tanstack/query-core")) return "vendor-query";
  if (has("zustand")) return "vendor-state";
  if (has("fuse.js") || has("cmdk")) return "vendor-search";
  if (has("html-to-image") || has("canvas-confetti")) return "vendor-share";
  if (has("lucide-react") || path.includes("/node_modules/@radix-ui/")) return "vendor-ui";
  if (has("react") || has("react-dom") || has("scheduler") || has("framer-motion")) return "vendor-react";
}
