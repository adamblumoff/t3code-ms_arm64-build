import { describe, expect, it } from "vitest";

import {
  preferLinuxArchUpdate,
  preferWindowsArm64UpdateForTranslatedBuild,
} from "./windowsArm64Update";

describe("preferLinuxArchUpdate", () => {
  it("switches Linux ARM64 installs to arm64 AppImage update artifacts", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [
          { url: "T3-Code-1.2.3-x64.AppImage", sha512: "x64", size: 100 },
          { url: "T3-Code-1.2.3-arm64.AppImage", sha512: "arm64", size: 101 },
        ],
        path: "T3-Code-1.2.3-x64.AppImage",
      },
    };

    const changed = preferLinuxArchUpdate(
      {
        platform: "linux",
        hostArch: "arm64",
        appArch: "arm64",
        runningUnderArm64Translation: false,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(true);
    expect(updateInfoAndProvider.info.files).toEqual([
      { url: "T3-Code-1.2.3-arm64.AppImage", sha512: "arm64", size: 101 },
    ]);
    expect(updateInfoAndProvider.info.path).toBe("T3-Code-1.2.3-arm64.AppImage");
  });

  it("switches Linux x64 installs to x64 AppImage update artifacts", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [
          { url: "T3-Code-1.2.3-arm64.AppImage", sha512: "arm64", size: 101 },
          { url: "T3-Code-1.2.3-x64.AppImage", sha512: "x64", size: 100 },
        ],
        path: "T3-Code-1.2.3-arm64.AppImage",
      },
    };

    const changed = preferLinuxArchUpdate(
      {
        platform: "linux",
        hostArch: "x64",
        appArch: "x64",
        runningUnderArm64Translation: false,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(true);
    expect(updateInfoAndProvider.info.files).toEqual([
      { url: "T3-Code-1.2.3-x64.AppImage", sha512: "x64", size: 100 },
    ]);
    expect(updateInfoAndProvider.info.path).toBe("T3-Code-1.2.3-x64.AppImage");
  });

  it("does nothing when Linux manifests do not include an arch-specific AppImage", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [{ url: "T3-Code-1.2.3.AppImage", sha512: "generic", size: 99 }],
        path: "T3-Code-1.2.3.AppImage",
      },
    };

    const changed = preferLinuxArchUpdate(
      {
        platform: "linux",
        hostArch: "arm64",
        appArch: "arm64",
        runningUnderArm64Translation: false,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(false);
    expect(updateInfoAndProvider.info.path).toBe("T3-Code-1.2.3.AppImage");
  });
});

describe("preferWindowsArm64UpdateForTranslatedBuild", () => {
  it("switches translated Windows ARM64 installs to arm64 update artifacts", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [
          { url: "T3-Code-1.2.3-x64.exe", sha512: "x64", size: 100 },
          { url: "T3-Code-1.2.3-arm64.exe", sha512: "arm64", size: 101 },
        ],
        path: "T3-Code-1.2.3-x64.exe",
        packages: {
          x64: { path: "T3-Code-1.2.3-x64.nsis.7z" },
          arm64: { path: "T3-Code-1.2.3-arm64.nsis.7z" },
        },
      },
    };

    const changed = preferWindowsArm64UpdateForTranslatedBuild(
      {
        platform: "win32",
        hostArch: "arm64",
        appArch: "x64",
        runningUnderArm64Translation: true,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(true);
    expect(updateInfoAndProvider.info.files).toEqual([
      { url: "T3-Code-1.2.3-arm64.exe", sha512: "arm64", size: 101 },
    ]);
    expect(updateInfoAndProvider.info.path).toBe("T3-Code-1.2.3-arm64.exe");
    expect(updateInfoAndProvider.info.packages?.x64?.path).toBe("T3-Code-1.2.3-arm64.nsis.7z");
  });

  it("does nothing for native x64 Windows installs", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [{ url: "T3-Code-1.2.3-x64.exe", sha512: "x64", size: 100 }],
      },
    };

    const changed = preferWindowsArm64UpdateForTranslatedBuild(
      {
        platform: "win32",
        hostArch: "x64",
        appArch: "x64",
        runningUnderArm64Translation: false,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(false);
    expect(updateInfoAndProvider.info.files).toEqual([
      { url: "T3-Code-1.2.3-x64.exe", sha512: "x64", size: 100 },
    ]);
  });

  it("does nothing when no arm64 artifact is published", () => {
    const updateInfoAndProvider = {
      info: {
        version: "1.2.3",
        files: [{ url: "T3-Code-1.2.3-x64.exe", sha512: "x64", size: 100 }],
        path: "T3-Code-1.2.3-x64.exe",
      },
    };

    const changed = preferWindowsArm64UpdateForTranslatedBuild(
      {
        platform: "win32",
        hostArch: "arm64",
        appArch: "x64",
        runningUnderArm64Translation: true,
      },
      updateInfoAndProvider,
    );

    expect(changed).toBe(false);
    expect(updateInfoAndProvider.info.path).toBe("T3-Code-1.2.3-x64.exe");
  });
});
