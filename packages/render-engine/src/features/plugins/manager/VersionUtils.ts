/**
 * 版本工具函数
 * 处理语义版本号的解析和比较
 */

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * 解析版本号字符串
 */
export function parseVersion(version: string): ParsedVersion {
  const parts = version.replace(/[^\d.]/g, '').split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * 检查版本兼容性
 */
export function isVersionCompatible(installedVersion: string, requiredVersion: string): boolean {
  const installed = parseVersion(installedVersion);

  if (requiredVersion.startsWith('^')) {
    const required = parseVersion(requiredVersion);
    return (
      installed.major === required.major &&
      (installed.minor > required.minor ||
        (installed.minor === required.minor && installed.patch >= required.patch))
    );
  } else if (requiredVersion.startsWith('~')) {
    const required = parseVersion(requiredVersion);
    return (
      installed.major === required.major &&
      installed.minor === required.minor &&
      installed.patch >= required.patch
    );
  } else {
    return installedVersion === requiredVersion;
  }
}

/**
 * 判断是否需要更新
 */
export function shouldUpdate(currentVersion: string, latestVersion: string): boolean {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);

  return (
    latest.major > current.major ||
    (latest.major === current.major && latest.minor > current.minor) ||
    (latest.major === current.major &&
      latest.minor === current.minor &&
      latest.patch > current.patch)
  );
}

/**
 * 比较两个版本号
 * @returns 负数表示 a < b，0 表示相等，正数表示 a > b
 */
export function compareVersions(versionA: string, versionB: string): number {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * 格式化版本号
 */
export function formatVersion(version: ParsedVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}
