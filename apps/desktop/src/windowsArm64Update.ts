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

function hasAppImageExtension(path: string): boolean {
  return path.toLowerCase().endsWith(".appimage");
}

function hasArchSpecificAppImagePath(path: string, arch: DesktopRuntimeInfo["appArch"]): boolean {
  const normalizedPath = path.toLowerCase();
  return hasAppImageExtension(normalizedPath) && normalizedPath.includes(`-${arch}.`);
}

export function preferLinuxArchUpdate(
  runtimeInfo: DesktopRuntimeInfo,
  updateInfoAndProvider: MutableUpdateInfoAndProvider | null | undefined,
): boolean {
  if (runtimeInfo.platform !== "linux" || (runtimeInfo.appArch !== "arm64" && runtimeInfo.appArch !== "x64")) {
    return false;
  }

  const info = updateInfoAndProvider?.info;
  const files = info?.files;
  if (!info || !files || files.length === 0) {
    return false;
  }

  const preferredFiles = files.filter((file) => hasArchSpecificAppImagePath(file.url, runtimeInfo.appArch));
  if (preferredFiles.length === 0) {
    return false;
  }

  info.files = preferredFiles;

  const firstPreferredFile = preferredFiles[0];
  if (
    firstPreferredFile &&
    typeof info.path === "string" &&
    hasAppImageExtension(info.path) &&
    !hasArchSpecificAppImagePath(info.path, runtimeInfo.appArch)
  ) {
    info.path = firstPreferredFile.url;
  }

  return true;
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
