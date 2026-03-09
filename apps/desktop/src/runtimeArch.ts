import type { DesktopRuntimeArch, DesktopRuntimeInfo, DesktopRuntimePlatform } from "@t3tools/contracts";

interface ResolveDesktopRuntimeInfoInput {
  readonly platform: NodeJS.Platform;
  readonly processArch: string;
  readonly runningUnderArm64Translation: boolean;
}

function normalizeDesktopArch(arch: string): DesktopRuntimeArch {
  if (arch === "arm64") return "arm64";
  if (arch === "x64") return "x64";
  return "other";
}

function normalizeDesktopPlatform(platform: NodeJS.Platform): DesktopRuntimePlatform {
  if (platform === "darwin" || platform === "linux" || platform === "win32") {
    return platform;
  }
  return "other";
}

export function resolveDesktopRuntimeInfo(
  input: ResolveDesktopRuntimeInfoInput,
): DesktopRuntimeInfo {
  const platform = normalizeDesktopPlatform(input.platform);
  const appArch = normalizeDesktopArch(input.processArch);

  if (platform !== "darwin" && platform !== "win32") {
    return {
      platform,
      hostArch: appArch,
      appArch,
      runningUnderArm64Translation: false,
    };
  }

  const hostArch =
    appArch === "arm64" || input.runningUnderArm64Translation ? "arm64" : appArch;

  return {
    platform,
    hostArch,
    appArch,
    runningUnderArm64Translation: input.runningUnderArm64Translation,
  };
}

export function isArm64HostRunningTranslatedX64Build(runtimeInfo: DesktopRuntimeInfo): boolean {
  return runtimeInfo.hostArch === "arm64" && runtimeInfo.appArch === "x64";
}
