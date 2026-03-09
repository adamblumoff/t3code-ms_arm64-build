import { assert, describe, it } from "@effect/vitest";

import {
  mergeMacUpdateManifests,
  parseMacUpdateManifest,
  serializeMacUpdateManifest,
} from "./merge-mac-update-manifests.ts";

describe("merge-linux-update-manifests", () => {
  it("merges x64 and arm64 Linux update manifests into one multi-arch manifest", () => {
    const x64 = parseMacUpdateManifest(
      `version: 0.0.4
files:
  - url: T3-Code-0.0.4-x64.AppImage
    sha512: x64appimage
    size: 123
    blockMapSize: 321
path: T3-Code-0.0.4-x64.AppImage
sha512: x64appimage
releaseDate: '2026-03-07T10:32:14.587Z'
`,
      "latest-linux.yml",
    );

    const arm64 = parseMacUpdateManifest(
      `version: 0.0.4
files:
  - url: T3-Code-0.0.4-arm64.AppImage
    sha512: arm64appimage
    size: 456
    blockMapSize: 654
path: T3-Code-0.0.4-arm64.AppImage
sha512: arm64appimage
releaseDate: '2026-03-07T10:36:07.540Z'
`,
      "latest-linux-arm64.yml",
    );

    const merged = mergeMacUpdateManifests(x64, arm64);

    assert.equal(merged.version, "0.0.4");
    assert.equal(merged.releaseDate, "2026-03-07T10:36:07.540Z");
    assert.deepStrictEqual(
      merged.files.map((file) => file.url),
      ["T3-Code-0.0.4-x64.AppImage", "T3-Code-0.0.4-arm64.AppImage"],
    );

    const serialized = serializeMacUpdateManifest(merged);
    assert.ok(!serialized.includes("path:"));
    assert.equal((serialized.match(/- url:/g) ?? []).length, 2);
    assert.ok(serialized.includes("blockMapSize: 321"));
    assert.ok(serialized.includes("blockMapSize: 654"));
  });
});
