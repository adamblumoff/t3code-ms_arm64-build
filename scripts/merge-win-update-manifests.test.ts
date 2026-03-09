import { assert, describe, it } from "@effect/vitest";

import {
  mergeMacUpdateManifests,
  parseMacUpdateManifest,
  serializeMacUpdateManifest,
} from "./merge-mac-update-manifests.ts";

describe("merge-win-update-manifests", () => {
  it("merges x64 and arm64 Windows update manifests into one multi-arch manifest", () => {
    const x64 = parseMacUpdateManifest(
      `version: 0.0.4
files:
  - url: T3-Code-0.0.4-x64.exe
    sha512: x64exe
    size: 123
path: T3-Code-0.0.4-x64.exe
sha512: x64exe
releaseDate: '2026-03-07T10:32:14.587Z'
`,
      "latest.yml",
    );

    const arm64 = parseMacUpdateManifest(
      `version: 0.0.4
files:
  - url: T3-Code-0.0.4-arm64.exe
    sha512: arm64exe
    size: 456
path: T3-Code-0.0.4-arm64.exe
sha512: arm64exe
releaseDate: '2026-03-07T10:36:07.540Z'
`,
      "latest-arm64.yml",
    );

    const merged = mergeMacUpdateManifests(x64, arm64);

    assert.equal(merged.version, "0.0.4");
    assert.equal(merged.releaseDate, "2026-03-07T10:36:07.540Z");
    assert.deepStrictEqual(
      merged.files.map((file) => file.url),
      ["T3-Code-0.0.4-x64.exe", "T3-Code-0.0.4-arm64.exe"],
    );

    const serialized = serializeMacUpdateManifest(merged);
    assert.ok(!serialized.includes("path:"));
    assert.equal((serialized.match(/- url:/g) ?? []).length, 2);
  });
});
