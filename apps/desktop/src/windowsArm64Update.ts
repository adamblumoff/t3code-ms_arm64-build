import type { DesktopRuntimeInfo } from "@t3tools/contracts";
import type { UpdateFileInfo } from "electron-updater";

import { isArm64HostRunningTranslatedX64Build } from "./runtimeArch";

interface WindowsPackageFileInfo {
  path: string;
  readonly sha512?: string;
  readonly size?: number;
  readonly blockMapSize?: number;
}

interface MutableWindowsUpdateInfo {
  files?: UpdateFileInfo[];
  path?: string;
  packages?: Record<string, WindowsPackageFileInfo | undefined>;
}

export interface MutableUpdateInfoAndProvider {
  info: MutableWindowsUpdateInfo;
}

function isArm64ArtifactPath(path: string): boolean {
  return path.toLowerCase().includes("arm64");
}

export function preferWindowsArm64UpdateForTranslatedBuild(
  runtimeInfo: DesktopRuntimeInfo,
  updateInfoAndProvider: MutableUpdateInfoAndProvider | null | undefined,
): boolean {
  if (!isArm64HostRunningTranslatedX64Build(runtimeInfo) || runtimeInfo.platform !== "win32") {
    return false;
  }

  const info = updateInfoAndProvider?.info;
  const files = info?.files;
  if (!info || !files || files.length === 0) {
    return false;
  }

  const arm64Files = files.filter((file) => isArm64ArtifactPath(file.url));
  if (arm64Files.length === 0) {
    return false;
  }

  info.files = arm64Files;

  const firstArm64File = arm64Files[0];
  if (firstArm64File && typeof info.path === "string" && !isArm64ArtifactPath(info.path)) {
    info.path = firstArm64File.url;
  }

  const arm64Package = info.packages?.arm64;
  if (arm64Package) {
    info.packages = {
      ...info.packages,
      x64: arm64Package,
    };
  }

  return true;
}
