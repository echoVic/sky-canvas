/**
 * 内存分析器
 * 跟踪内存分配和检测内存泄漏
 */

/**
 * 内存泄漏信息
 */
export interface MemoryLeak {
  type: string;
  trend: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * 内存使用情况
 */
export interface MemoryUsage {
  total: number;
  byType: Map<string, number>;
}

/**
 * 内存分析器
 */
export class MemoryProfiler {
  private allocations = new Map<string, number>();
  private totalAllocated = 0;

  /**
   * 记录内存分配
   */
  recordAllocation(type: string, size: number): void {
    const current = this.allocations.get(type) || 0;
    this.allocations.set(type, current + size);
    this.totalAllocated += size;
  }

  /**
   * 记录内存释放
   */
  recordDeallocation(type: string, size: number): void {
    const current = this.allocations.get(type) || 0;
    this.allocations.set(type, Math.max(0, current - size));
    this.totalAllocated = Math.max(0, this.totalAllocated - size);
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): MemoryUsage {
    return {
      total: this.totalAllocated,
      byType: new Map(this.allocations)
    };
  }

  /**
   * 获取总分配内存
   */
  getTotalAllocated(): number {
    return this.totalAllocated;
  }

  /**
   * 获取特定类型的内存使用
   */
  getAllocationByType(type: string): number {
    return this.allocations.get(type) || 0;
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    for (const [type, usage] of this.allocations) {
      if (usage > 50 * 1024 * 1024) {
        const severity: 'low' | 'medium' | 'high' =
          usage > 200 * 1024 * 1024 ? 'high' : usage > 100 * 1024 * 1024 ? 'medium' : 'low';

        leaks.push({
          type,
          trend: usage,
          severity
        });
      }
    }

    return leaks;
  }

  /**
   * 重置分配记录
   */
  reset(): void {
    this.allocations.clear();
    this.totalAllocated = 0;
  }
}
