import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function singleUniqueValue(values, label, issues) {
  const unique = [...new Set(values)];
  if (unique.length === 0) {
    issues.push(`${label} is missing`);
    return null;
  }
  if (unique.length > 1) {
    issues.push(`${label} is inconsistent: ${unique.join(", ")}`);
    return null;
  }
  return unique[0];
}

function matches(source, expression) {
  return [...source.matchAll(expression)].map((match) => match[1].trim());
}

export function checkNativeVersionParity(packageSource, androidSource, iosSource) {
  const issues = [];
  let packageVersion = null;
  try {
    const parsed = JSON.parse(packageSource);
    packageVersion = typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    issues.push("package.json is not valid JSON");
  }
  if (!packageVersion) issues.push("package.json version is missing");

  const androidVersionName = singleUniqueValue(
    matches(androidSource, /\bversionName\s+["']([^"']+)["']/g),
    "Android versionName",
    issues,
  );
  const androidVersionCode = singleUniqueValue(
    matches(androidSource, /\bversionCode\s+(\d+)\b/g),
    "Android versionCode",
    issues,
  );
  const iosMarketingVersion = singleUniqueValue(
    matches(iosSource, /\bMARKETING_VERSION\s*=\s*([^;]+);/g),
    "iOS MARKETING_VERSION",
    issues,
  );
  const iosBuildNumber = singleUniqueValue(
    matches(iosSource, /\bCURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g),
    "iOS CURRENT_PROJECT_VERSION",
    issues,
  );

  if (packageVersion && androidVersionName && packageVersion !== androidVersionName) {
    issues.push(`package ${packageVersion} does not match Android ${androidVersionName}`);
  }
  if (packageVersion && iosMarketingVersion && packageVersion !== iosMarketingVersion) {
    issues.push(`package ${packageVersion} does not match iOS ${iosMarketingVersion}`);
  }
  if (androidVersionCode && iosBuildNumber && androidVersionCode !== iosBuildNumber) {
    issues.push(`Android build ${androidVersionCode} does not match iOS build ${iosBuildNumber}`);
  }

  return issues;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const repositoryRoot = resolve(dirname(scriptPath), "../..");
  const issues = checkNativeVersionParity(
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    readFileSync(resolve(repositoryRoot, "android/app/build.gradle"), "utf8"),
    readFileSync(resolve(repositoryRoot, "ios/App/App.xcodeproj/project.pbxproj"), "utf8"),
  );

  if (issues.length > 0) {
    console.error("Native version mismatch:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    const pkg = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
    console.log(`Native versions agree at ${pkg.version}; Android/iOS build number parity verified.`);
  }
}
