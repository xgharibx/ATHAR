import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Third-party notices for the published app.
 *
 * Most open-source licences allow use in a proprietary product on one
 * condition: the copyright notice and licence text travel with every copy.
 * This collects them for every package that ships in the app, straight from
 * the installed packages, so the published file always matches the build.
 */

type LockPackage = { version?: string; dev?: boolean; license?: unknown; link?: boolean };
type PackageInfo = { name: string; version: string; license: string; homepage: string; text: string };

const LICENCE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt|markdown))?$/i;

function readLicenceText(directory: string): string {
  let entries: string[];
  try {
    entries = fs.readdirSync(directory);
  } catch {
    return "";
  }
  const file = entries.filter((entry) => LICENCE_FILE.test(entry)).sort()[0];
  if (!file) return "";
  return fs.readFileSync(path.join(directory, file), "utf8").replace(/\r\n/g, "\n").trim();
}

function licenceName(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string") {
    return (value as { type: string }).type;
  }
  return "See licence text";
}

function repositoryUrl(value: unknown): string {
  const raw = typeof value === "string" ? value : (value as { url?: unknown } | null)?.url;
  if (typeof raw !== "string") return "";
  return raw.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
}

/** Every package that is installed for production, with its licence text. */
export function collectProductionPackages(root: string): PackageInfo[] {
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
    packages: Record<string, LockPackage>;
  };
  const packages: PackageInfo[] = [];
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location || entry.dev || entry.link || !location.includes("node_modules/")) continue;
    const directory = path.join(root, location);
    let manifest: { name?: string; version?: string; license?: unknown; homepage?: unknown; repository?: unknown };
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    } catch {
      continue; // optional package not installed on this platform
    }
    packages.push({
      name: manifest.name ?? location.replace(/^.*node_modules\//, ""),
      version: manifest.version ?? entry.version ?? "",
      license: licenceName(manifest.license ?? entry.license),
      homepage: repositoryUrl(manifest.repository) || (typeof manifest.homepage === "string" ? manifest.homepage : ""),
      text: readLicenceText(directory),
    });
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

export function renderThirdPartyNotices(packages: PackageInfo[]): string {
  // Identical licence texts are printed once, under the packages that share them.
  const groups = new Map<string, { text: string; license: string; members: PackageInfo[] }>();
  for (const item of packages) {
    const key = item.text
      ? createHash("sha256").update(item.text).digest("hex")
      : `no-text:${item.license}`;
    const group = groups.get(key) ?? { text: item.text, license: item.license, members: [] };
    group.members.push(item);
    groups.set(key, group);
  }

  const lines: string[] = [
    "ATHAR — THIRD-PARTY SOFTWARE NOTICES",
    "",
    "The Athar application is proprietary software. It includes the open-source",
    "components listed below, each used under its own licence. The copyright",
    "notices and licence texts that those licences require are reproduced here.",
    "",
    `Components: ${packages.length}`,
    "",
  ];
  for (const group of Array.from(groups.values())) {
    lines.push("=".repeat(78));
    for (const member of group.members) {
      lines.push(`${member.name} ${member.version} — ${member.license}${member.homepage ? ` — ${member.homepage}` : ""}`);
    }
    lines.push("-".repeat(78));
    lines.push(group.text || `Licensed under ${group.license}. No licence file is distributed with this package.`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Vite plugin: publishes the notices next to the app on every build. */
export function thirdPartyNoticesPlugin(root: string) {
  return {
    name: "athar-third-party-notices",
    apply: "build" as const,
    generateBundle(this: { emitFile: (file: { type: "asset"; fileName: string; source: string }) => void }) {
      this.emitFile({
        type: "asset",
        fileName: "third-party-licenses.txt",
        source: renderThirdPartyNotices(collectProductionPackages(root)),
      });
    },
  };
}
