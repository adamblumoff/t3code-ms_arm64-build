import { describe, expect, it } from "vitest";

import { isArm64HostRunningTranslatedX64Build, resolveDesktopRuntimeInfo } from "./runtimeArch";

describe("resolveDesktopRuntimeInfo", () => {
  it("detects Rosetta-translated Intel builds on Apple Silicon", () => {
    const runtimeInfo = resolveDesktopRuntimeInfo({
      platform: "darwin",
      processArch: "x64",
      runningUnderArm64Translation: true,
    });

    expect(runtimeInfo).toEqual({
      platform: "darwin",
      hostArch: "arm64",
      appArch: "x64",
      runningUnderArm64Translation: true,
    });
    expect(isArm64HostRunningTranslatedX64Build(runtimeInfo)).toBe(true);
  });

  it("detects native Apple Silicon builds", () => {
    const runtimeInfo = resolveDesktopRuntimeInfo({
      platform: "darwin",
      processArch: "arm64",
      runningUnderArm64Translation: false,
    });

    expect(runtimeInfo).toEqual({
      platform: "darwin",
      hostArch: "arm64",
      appArch: "arm64",
      runningUnderArm64Translation: false,
    });
    expect(isArm64HostRunningTranslatedX64Build(runtimeInfo)).toBe(false);
  });

  it("detects Windows ARM64 hosts running translated x64 builds", () => {
    const runtimeInfo = resolveDesktopRuntimeInfo({
      platform: "win32",
      processArch: "x64",
      runningUnderArm64Translation: true,
    });

    expect(runtimeInfo).toEqual({
      platform: "win32",
      hostArch: "arm64",
      appArch: "x64",
      runningUnderArm64Translation: true,
    });
    expect(isArm64HostRunningTranslatedX64Build(runtimeInfo)).toBe(true);
  });

  it("passes through non-mac builds without translation", () => {
    const runtimeInfo = resolveDesktopRuntimeInfo({
      platform: "linux",
      processArch: "x64",
      runningUnderArm64Translation: true,
    });

    expect(runtimeInfo).toEqual({
      platform: "linux",
      hostArch: "x64",
      appArch: "x64",
      runningUnderArm64Translation: false,
    });
  });
});
