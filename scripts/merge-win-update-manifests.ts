import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeMacUpdateManifests,
  parseMacUpdateManifest,
  serializeMacUpdateManifest,
} from "./merge-mac-update-manifests.ts";

function main(args: ReadonlyArray<string>): void {
  const [x64PathArg, arm64PathArg, outputPathArg] = args;
  if (!x64PathArg || !arm64PathArg) {
    throw new Error(
      "Usage: node scripts/merge-win-update-manifests.ts <latest.yml> <latest-arm64.yml> [output-path]",
    );
  }

  const x64Path = resolve(x64PathArg);
  const arm64Path = resolve(arm64PathArg);
  const outputPath = resolve(outputPathArg ?? x64PathArg);

  const x64Manifest = parseMacUpdateManifest(readFileSync(x64Path, "utf8"), x64Path);
  const arm64Manifest = parseMacUpdateManifest(readFileSync(arm64Path, "utf8"), arm64Path);
  const merged = mergeMacUpdateManifests(x64Manifest, arm64Manifest);
  writeFileSync(outputPath, serializeMacUpdateManifest(merged));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
