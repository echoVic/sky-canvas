/**
 * 包处理工具函数
 */

import { PluginPackage } from './PluginManagerTypes';

/**
 * 去重包列表
 */
export function deduplicatePackages(packages: PluginPackage[]): PluginPackage[] {
  const seen = new Set<string>();
  const unique: PluginPackage[] = [];

  for (const pkg of packages) {
    const key = `${pkg.metadata.id}@${pkg.metadata.version}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(pkg);
    }
  }

  return unique;
}

/**
 * 排序包列表
 */
export function sortPackages(
  packages: PluginPackage[],
  sortBy: string = 'relevance',
  sortOrder: string = 'desc'
): PluginPackage[] {
  const sorted = [...packages];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        comparison = a.metadata.name.localeCompare(b.metadata.name);
        break;
      case 'downloads':
        comparison = ((a as unknown as Record<string, number>).downloads || 0) -
                     ((b as unknown as Record<string, number>).downloads || 0);
        break;
      case 'rating':
        comparison = ((a as unknown as Record<string, number>).rating || 0) -
                     ((b as unknown as Record<string, number>).rating || 0);
        break;
      case 'updated':
        comparison =
          new Date(a.metadata.version).getTime() - new Date(b.metadata.version).getTime();
        break;
      default:
        comparison = a.metadata.name.localeCompare(b.metadata.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * 查找依赖特定包的其他包
 */
export function findDependentPackages(
  packageId: string,
  installedPackages: Map<string, PluginPackage>
): string[] {
  const dependents: string[] = [];

  for (const [id, packageInfo] of installedPackages) {
    if (id === packageId) continue;

    const dependencies = packageInfo.metadata.dependencies || {};
    const peerDependencies = packageInfo.metadata.peerDependencies || {};

    if (dependencies[packageId] || peerDependencies[packageId]) {
      dependents.push(id);
    }
  }

  return dependents;
}
