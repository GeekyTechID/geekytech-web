import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = "G:/WebsiteDevelopment/GeekyTechWebsite";

const files = execSync('git ls-files -- "*.tsx" "*.ts" "*.css"', {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .map((f) => join(ROOT, f));

// Matches: optional leading whitespace + dark: + class chars (no arbitrary [] needed)
const DARK_CLASS = /\s*dark:[a-zA-Z0-9\-_:/!.]+/g;

let modified = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  if (!original.includes("dark:")) continue;

  const updated = original.replace(DARK_CLASS, "");
  if (updated !== original) {
    writeFileSync(file, updated, "utf8");
    modified++;
    console.log("  patched:", file.replace(ROOT + "/", "").replace(ROOT.replace("/", "\\") + "\\", ""));
  }
}

console.log(`\n${modified} files patched.`);
