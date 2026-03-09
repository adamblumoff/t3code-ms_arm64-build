param(
  [switch]$InstallMissing
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$requiredVisualStudioComponents = @(
  "Microsoft.VisualStudio.Workload.VCTools",
  "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
  "Microsoft.VisualStudio.Component.VC.Tools.ARM64",
  "Microsoft.VisualStudio.Component.Windows11SDK.26100"
)

function Write-Section([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message"
}

function Get-CommandPath([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $null
  }

  return $command.Source
}

function Get-VisualStudioPaths() {
  $vswherePath = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
  $installerPath = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vs_installer.exe"
  if (!(Test-Path $vswherePath)) {
    return @{
      VsWhere = $null
      InstallPath = $null
      InstallerPath = $(if (Test-Path $installerPath) { $installerPath } else { $null })
    }
  }

  $installationPath = & $vswherePath -nologo -latest -products * -property installationPath
  if ([string]::IsNullOrWhiteSpace($installationPath)) {
    return @{
      VsWhere = $vswherePath
      InstallPath = $null
      InstallerPath = $(if (Test-Path $installerPath) { $installerPath } else { $null })
    }
  }

  return @{
    VsWhere = $vswherePath
    InstallPath = $installationPath.Trim()
    InstallerPath = $(if (Test-Path $installerPath) { $installerPath } else { $null })
  }
}

function Install-BuildTools([string]$InstallerPath, [string]$InstallPath, [string[]]$Components) {
  if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget is required to install Visual Studio Build Tools when no instance is present."
  }

  $overrideParts = @(
    "--quiet",
    "--wait",
    "--norestart",
    "--nocache",
    "--installPath `"$InstallPath`""
  ) + ($Components | ForEach-Object { "--add $_" })

  Write-Section "Installing Visual Studio Build Tools for Windows ARM64 packaging"
  $wingetArgs = @(
    "install",
    "--source", "winget",
    "--exact",
    "--id", "Microsoft.VisualStudio.2022.BuildTools",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--override", ($overrideParts -join " ")
  )

  & winget @wingetArgs
}

function Ensure-VisualStudioComponents([string]$InstallerPath, [string]$InstallPath, [string[]]$Components) {
  if ([string]::IsNullOrWhiteSpace($InstallerPath) -or !(Test-Path $InstallerPath)) {
    throw "Visual Studio installer was not found at $InstallerPath"
  }

  if ($Components.Count -eq 0) {
    return
  }

  Write-Section "Ensuring required Visual Studio components are installed"
  $installerArgs = @(
    "modify",
    "--installPath", $InstallPath,
    "--quiet",
    "--wait",
    "--norestart",
    "--nocache"
  )

  foreach ($component in $Components) {
    $installerArgs += @("--add", $component)
  }

  & $InstallerPath @installerArgs
}

function Get-InstalledMsvcToolsetDirs([string]$InstallPath) {
  $msvcRoot = Join-Path $InstallPath "VC\Tools\MSVC"
  if (!(Test-Path $msvcRoot)) {
    throw "MSVC tools directory was not found at $msvcRoot"
  }

  return @(Get-ChildItem -Path $msvcRoot -Directory | Sort-Object Name -Descending)
}

function Get-SpectreComponentIdsForInstalledToolsets([string]$InstallPath) {
  $toolsetDirs = Get-InstalledMsvcToolsetDirs -InstallPath $InstallPath
  if ($toolsetDirs.Count -eq 0) {
    throw "No MSVC toolset directory was found under $(Join-Path $InstallPath 'VC\\Tools\\MSVC')"
  }

  return @(
    $toolsetDirs |
      ForEach-Object {
        $version = $_.Name
        @(
          "Microsoft.VisualStudio.Component.VC.$version.x86.x64.Spectre",
          "Microsoft.VisualStudio.Component.VC.$version.ARM64.Spectre"
        )
      } |
      Select-Object -Unique
  )
}

function Assert-Arm64Toolchain([string]$InstallPath) {
  $msbuildArm64Path = Join-Path $InstallPath "MSBuild\Current\Bin\arm64\MSBuild.exe"
  if (!(Test-Path $msbuildArm64Path)) {
    throw "ARM64 MSBuild was not found at $msbuildArm64Path"
  }

  $toolsetDirs = Get-InstalledMsvcToolsetDirs -InstallPath $InstallPath
  if ($toolsetDirs.Count -eq 0) {
    throw "No MSVC toolset directory was found under $(Join-Path $InstallPath 'VC\\Tools\\MSVC')"
  }

  foreach ($toolsetDir in $toolsetDirs) {
    $requiredPaths = @(
      (Join-Path $toolsetDir.FullName "bin\Hostarm64\arm64\cl.exe"),
      (Join-Path $toolsetDir.FullName "bin\Hostx64\x64\cl.exe"),
      (Join-Path $toolsetDir.FullName "lib\arm64\spectre"),
      (Join-Path $toolsetDir.FullName "lib\x64\spectre"),
      (Join-Path $toolsetDir.FullName "lib\x86\spectre")
    )

    $missingPaths = @($requiredPaths | Where-Object { !(Test-Path $_) })
    if ($missingPaths.Count -eq 0) {
      Write-Host "MSBuild (arm64): $msbuildArm64Path"
      Write-Host "MSVC toolset: $($toolsetDir.FullName)"
      return
    }
  }

  $toolsetList = $toolsetDirs | ForEach-Object { $_.FullName }
  throw "Required ARM64 Windows build dependencies were not found in any installed MSVC toolset. Checked: $($toolsetList -join '; ')"
}

Write-Section "Windows ARM64 build diagnostics"
Write-Host "node: $(node -p ""process.arch + ' ' + process.execPath"")"
Write-Host "bun:  $(bun -p ""process.arch + ' ' + process.execPath"")"

$nodeArch = node -p "process.arch"
if ($nodeArch.Trim() -ne "arm64") {
  throw "Expected native ARM64 Node.js on the windows-11-arm runner, but got '$nodeArch'."
}

$bunArch = bun -p "process.arch"
if ($bunArch.Trim() -ne "arm64") {
  throw "Expected native ARM64 Bun on the Windows ARM64 release runner, but got '$bunArch'. Refusing to continue because Windows ARM64 packaging must not run package installation or staging under x64-emulated Bun."
}

$pythonPath = Get-CommandPath "python"
if ($null -eq $pythonPath) {
  throw "python was not found on PATH. node-gyp rebuilds require Python."
}

Write-Host "python: $pythonPath"
python --version

$visualStudio = Get-VisualStudioPaths
$installPath = $visualStudio.InstallPath

if ([string]::IsNullOrWhiteSpace($installPath)) {
  if (-not $InstallMissing) {
    throw "No Visual Studio installation was found and -InstallMissing was not supplied."
  }

  $defaultInstallPath = Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\2022\BuildTools"
  Install-BuildTools -InstallerPath $visualStudio.InstallerPath -InstallPath $defaultInstallPath -Components $requiredVisualStudioComponents
  $visualStudio = Get-VisualStudioPaths
  $installPath = $visualStudio.InstallPath
}

if ([string]::IsNullOrWhiteSpace($installPath)) {
  throw "Unable to locate a Visual Studio installation after attempting setup."
}

Write-Host "Visual Studio: $installPath"
Ensure-VisualStudioComponents -InstallerPath $visualStudio.InstallerPath -InstallPath $installPath -Components $requiredVisualStudioComponents
$spectreComponents = Get-SpectreComponentIdsForInstalledToolsets -InstallPath $installPath
Ensure-VisualStudioComponents -InstallerPath $visualStudio.InstallerPath -InstallPath $installPath -Components $spectreComponents
Assert-Arm64Toolchain -InstallPath $installPath
