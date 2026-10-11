#!/usr/bin/env node
// Regenerates skills/index.json from the skills/*/ directories.
// Run it after adding or changing a skill; the CI workflow runs it on push.
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skillsDir = join(root, "skills");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const skills = [];
for (const name of readdirSync(skillsDir).sort()) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) continue;

  const files = walk(dir).map((path) => relative(dir, path)).sort();

  // The version is a content hash, so it changes exactly when the skill does.
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update(readFileSync(join(dir, file)));

  skills.push({ name, version: hash.digest("hex").slice(0, 12), files });
}

writeFileSync(join(skillsDir, "index.json"), JSON.stringify({ skills }, null, 2) + "\n");
console.log(`Wrote skills/index.json with ${skills.length} skill(s).`);
