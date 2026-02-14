import { execSync } from "node:child_process";

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
const iconRev = `auto-${stamp}`;

const env = {
  ...process.env,
  VITE_ICON_REV: iconRev
};

console.log(`[release:web] Using VITE_ICON_REV=${iconRev}`);

try {
  execSync("npm run verify", { stdio: "inherit", env });
} catch {
  process.exit(1);
}

console.log("[release:web] Done. dist/ is ready with fresh icon revision.");
