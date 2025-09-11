/**
 * 数据桥接器 - 优化Canvas SDK与Render Engine之间的数据传输
 * 提供增量更新、数据压缩、智能缓存等优化机制
 */

import { globalInterfaceOptimizer } from './OptimizedInterface';
import { IPoint, IRect } from '../graphics/IGraphicsContext';

/**
 * 数据变更类型
 */
export enum DataChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BATCH = 'batch'
}

/**
 * 数据变更记录
 */
export interface DataChange<T = any> {
  type: DataChangeType;
  id: string;
  data?: T;
  previousData?: T;
  timestamp: number;
  source: string;
  fields?: string[];
}

/**
 * 增量更新数据
 */
export interface IncrementalData<T = any> {
  id: string;
  changes: Partial<T>;
  version: number;
  checksum?: string;
}

/**
 * 数据同步配置
 */
export interface SyncConfig {
  enableIncrementalSync: boolean;
  enableCompression: boolean;
  enableChecksum: boolean;
  batchSize: number;
  syncInterval: number;
  conflictResolution: 'client' | 'server' | 'merge';
}

/**
 * 数据版本管理器
 */
class DataVersionManager {
  private versions = new Map<string, number>();
  private snapshots = new Map<string, any>();
  private maxSnapshots = 100;
  
  /**
   * 获取数据版本
   */
  getVersion(id: string): number {
    return this.versions.get(id) || 0;
  }
  
  /**
   * 更新数据版本
   */
  updateVersion(id: string, data?: any): number {
    const currentVersion = this.getVersion(id);
    const newVersion = currentVersion + 1;
    
    this.versions.set(id, newVersion);
    
    // 保存快照
    if (data) {
      this.saveSnapshot(id, newVersion, data);
    }
    
    return newVersion;
  }
  
  /**
   * 保存数据快照
   */
  private saveSnapshot(id: string, version: number, data: any): void {
    const key = `${id}_${version}`;
    
    // 限制快照数量
    if (this.snapshots.size >= this.maxSnapshots) {
      const firstKey = this.snapshots.keys().next().value;
      if (firstKey !== undefined) {
        this.snapshots.delete(firstKey);
      }
    }
    
    this.snapshots.set(key, this.deepClone(data));
  }
  
  /**
   * 获取数据快照
   */
  getSnapshot(id: string, version: number): any | null {
    const key = `${id}_${version}`;
    return this.snapshots.get(key) || null;
  }
  
  /**
   * 计算增量变更
   */
  calculateDelta<T>(id: string, newData: T): IncrementalData<T> | null {
    const currentVersion = this.getVersion(id);
    const previousSnapshot = this.getSnapshot(id, currentVersion);
    
    if (!previousSnapshot) {
      // 没有历史数据，返回完整数据
      return {
        id,
        changes: newData as Partial<T>,
        version: this.updateVersion(id, newData)
      };
    }
    
    const changes = this.diffObjects(previousSnapshot, newData);
    
    if (Object.keys(changes).length === 0) {
      return null; // 没有变更
    }
    
    return {
      id,
      changes,
      version: this.updateVersion(id, newData),
      checksum: this.calculateChecksum(changes)
    };
  }
  
  /**
   * 对比对象差异
   */
  private diffObjects(oldObj: any, newObj: any): any {
    const changes: any = {};
    
    // 检查新增或修改的属性
    for (const key in newObj) {
      if (newObj.hasOwnProperty(key)) {
        if (!this.isEqual(oldObj[key], newObj[key])) {
          changes[key] = newObj[key];
        }
      }
    }
    
    // 检查删除的属性
    for (const key in oldObj) {
      if (oldObj.hasOwnProperty(key) && !newObj.hasOwnProperty(key)) {
        changes[key] = undefined; // 标记为删除
      }
    }
    
    return changes;
  }
  
  /**
   * 深度比较两个值
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b;
    }
    
    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }
    
    if (a.prototype !== b.prototype) return false;
    
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    
    return keys.every(k => this.isEqual(a[k], b[k]));
  }
  
  /**
   * 计算校验和
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return hash.toString(36);
  }
  
  /**
   * 深拷贝对象
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  /**
   * 清理旧版本数据
   */
  cleanup(maxAge = 300000): void { // 5分钟
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const key of this.snapshots.keys()) {
      // 这里简化处理，实际应该基于时间戳清理
      if (this.snapshots.size > this.maxSnapshots / 2) {
        toDelete.push(key);
      }
    }
    
    toDelete.slice(0, toDelete.length / 2).forEach(key => {
      this.snapshots.delete(key);
    });
  }
  
  dispose(): void {
    this.versions.clear();
    this.snapshots.clear();
  }
}

/**
 * 数据压缩器
 */
class DataCompressor {
  private compressionThreshold = 1024; // 1KB
  
  /**
   * 压缩数据
   */
  compress<T>(data: T): { compressed: boolean; data: any; originalSize: number; compressedSize: number } {
    const originalString = JSON.stringify(data);
    const originalSize = originalString.length;
    
    if (originalSize < this.compressionThreshold) {
      return {
        compressed: false,
        data,
        originalSize,
        compressedSize: originalSize
      };
    }
    
    try {
      // 简化的压缩实现 - 实际中可使用 LZ-string 或其他库
      const compressed = this.simpleCompress(originalString);
      const compressedSize = compressed.length;
      
      // 如果压缩后更大，就不压缩
      if (compressedSize >= originalSize) {
        return {
          compressed: false,
          data,
          originalSize,
          compressedSize: originalSize
        };
      }
      
      return {
        compressed: true,
        data: compressed,
        originalSize,
        compressedSize
      };
    } catch (error) {
      console.warn('Data compression failed:', error);
      return {
        compressed: false,
        data,
        originalSize,
        compressedSize: originalSize
      };
    }
  }
  
  /**
   * 解压数据
   */
  decompress<T>(compressedData: any, wasCompressed: boolean): T {
    if (!wasCompressed) {
      return compressedData as T;
    }
    
    try {
      const decompressed = this.simpleDecompress(compressedData);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Data decompression failed:', error);
      throw error;
    }
  }
  
  /**
   * 简单的字符串压缩（示例实现）
   */
  private simpleCompress(str: string): string {
    // 这是一个简化的压缩实现
    // 在实际项目中建议使用专业的压缩库如 lz-string
    
    const freq: { [key: string]: number } = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    // 简单的替换压缩
    const substitutions: { [key: string]: string } = {};
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    
    let substitutionCode = 0;
    for (const [char, count] of sorted.slice(0, 10)) {
      if (count > 3 && char.length === 1) {
        substitutions[char] = String.fromCharCode(0xE000 + substitutionCode++);
      }
    }
    
    let compressed = str;
    for (const [original, replacement] of Object.entries(substitutions)) {
      compressed = compressed.split(original).join(replacement);
    }
    
    return JSON.stringify({ data: compressed, subs: substitutions });
  }
  
  /**
   * 简单的字符串解压
   */
  private simpleDecompress(compressedStr: string): string {
    try {
      const parsed = JSON.parse(compressedStr);
      let decompressed = parsed.data;
      
      for (const [original, replacement] of Object.entries(parsed.subs)) {
        decompressed = decompressed.split(replacement).join(original);
      }
      
      return decompressed;
    } catch {
      return compressedStr; // 如果解析失败，返回原始数据
    }
  }
}

/**
 * 数据冲突解决器
 */
class ConflictResolver {
  /**
   * 解决数据冲突
   */
  resolve<T>(
    localData: T,
    remoteData: T,
    strategy: 'client' | 'server' | 'merge' = 'merge'
  ): { resolved: T; hasConflicts: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    
    switch (strategy) {
      case 'client':
        return { resolved: localData, hasConflicts: false, conflicts: [] };
      
      case 'server':
        return { resolved: remoteData, hasConflicts: false, conflicts: [] };
      
      case 'merge':
      default:
        return this.mergeData(localData, remoteData);
    }
  }
  
  /**
   * 合并数据
   */
  private mergeData<T>(localData: T, remoteData: T): { resolved: T; hasConflicts: boolean; conflicts: string[] } {
    if (!localData || !remoteData) {
      return {
        resolved: (localData || remoteData) as T,
        hasConflicts: false,
        conflicts: []
      };
    }
    
    if (typeof localData !== 'object' || typeof remoteData !== 'object') {
      return {
        resolved: remoteData, // 优先使用远程数据
        hasConflicts: localData !== remoteData,
        conflicts: localData !== remoteData ? ['value'] : []
      };
    }
    
    const conflicts: string[] = [];
    const resolved: any = { ...localData };
    
    for (const key in remoteData) {
      if (remoteData.hasOwnProperty(key)) {
        const localValue = (localData as any)[key];
        const remoteValue = (remoteData as any)[key];
        
        if (localValue !== remoteValue) {
          if (localValue === undefined) {
            // 远程新增字段
            resolved[key] = remoteValue;
          } else if (remoteValue === undefined) {
            // 远程删除字段
            delete resolved[key];
          } else if (typeof localValue === 'object' && typeof remoteValue === 'object') {
            // 递归合并对象
            const subResult = this.mergeData(localValue, remoteValue);
            resolved[key] = subResult.resolved;
            conflicts.push(...subResult.conflicts.map(c => `${key}.${c}`));
          } else {
            // 值冲突，优先使用远程数据
            resolved[key] = remoteValue;
            conflicts.push(key);
          }
        }
      }
    }
    
    return {
      resolved: resolved as T,
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }
}

/**
 * 数据桥接器主类
 */
export class DataBridge {
  private versionManager = new DataVersionManager();
  private compressor = new DataCompressor();
  private conflictResolver = new ConflictResolver();
  private changeLog: DataChange[] = [];
  private subscribers = new Map<string, Set<Function>>();
  
  private config: SyncConfig = {
    enableIncrementalSync: true,
    enableCompression: true,
    enableChecksum: true,
    batchSize: 100,
    syncInterval: 1000,
    conflictResolution: 'merge'
  };
  
  private stats = {
    totalChanges: 0,
    incrementalUpdates: 0,
    compressionSavings: 0,
    conflictsResolved: 0,
    dataTransferred: 0
  };
  
  /**
   * 同步数据到目标
   */
  sync<T>(id: string, data: T, source: string): { success: boolean; transferred?: any; size?: number } {
    try {
      let dataToTransfer: any;
      let transferSize: number;
      
      if (this.config.enableIncrementalSync) {
        // 计算增量更新
        const delta = this.versionManager.calculateDelta(id, data);
        
        if (!delta) {
          // 没有变更，不需要传输
          return { success: true };
        }
        
        dataToTransfer = delta;
        this.stats.incrementalUpdates++;
      } else {
        // 完整数据传输
        dataToTransfer = { id, data, version: this.versionManager.updateVersion(id, data) };
      }
      
      // 数据压缩
      if (this.config.enableCompression) {
        const compressed = this.compressor.compress(dataToTransfer);
        dataToTransfer = {
          ...dataToTransfer,
          compressed: compressed.compressed,
          data: compressed.data
        };
        
        this.stats.compressionSavings += compressed.originalSize - compressed.compressedSize;
        transferSize = compressed.compressedSize;
      } else {
        transferSize = JSON.stringify(dataToTransfer).length;
      }
      
      // 记录变更
      this.recordChange({
        type: DataChangeType.UPDATE,
        id,
        data,
        timestamp: Date.now(),
        source
      });
      
      // 通知订阅者
      this.notifySubscribers(id, data);
      
      this.stats.totalChanges++;
      this.stats.dataTransferred += transferSize;
      
      return {
        success: true,
        transferred: dataToTransfer,
        size: transferSize
      };
      
    } catch (error) {
      console.error('Data sync failed:', error);
      return { success: false };
    }
  }
  
  /**
   * 批量同步数据
   */
  syncBatch<T>(items: Array<{ id: string; data: T }>, source: string): { success: boolean; results: Array<{ id: string; success: boolean; size?: number }> } {
    return globalInterfaceOptimizer.batchManager.addCall(
      'dataSyncBatch',
      { items, source },
      (batches: any[]) => {
        const results: Array<{ id: string; success: boolean; size?: number }> = [];
        
        for (const batch of batches) {
          for (const item of batch.items) {
            const result = this.sync(item.id, item.data, batch.source);
            results.push({
              id: item.id,
              success: result.success,
              size: result.size
            });
          }
        }
        
        return results;
      }
    ) as any; // 简化返回类型处理
  }
  
  /**
   * 应用增量更新
   */
  applyDelta<T>(id: string, delta: IncrementalData<T>, currentData: T): T {
    if (!delta.changes) return currentData;
    
    // 验证校验和
    if (this.config.enableChecksum && delta.checksum) {
      const calculatedChecksum = this.calculateChecksum(delta.changes);
      if (calculatedChecksum !== delta.checksum) {
        console.warn('Checksum mismatch for delta update');
        return currentData;
      }
    }
    
    // 应用变更
    const updatedData = { ...currentData } as any;
    
    for (const [key, value] of Object.entries(delta.changes)) {
      if (value === undefined) {
        delete updatedData[key];
      } else {
        updatedData[key] = value;
      }
    }
    
    return updatedData;
  }
  
  /**
   * 解决冲突并合并数据
   */
  resolveConflict<T>(id: string, localData: T, remoteData: T): T {
    const resolution = this.conflictResolver.resolve(
      localData,
      remoteData,
      this.config.conflictResolution
    );
    
    if (resolution.hasConflicts) {
      console.warn(`Data conflicts resolved for ${id}:`, resolution.conflicts);
      this.stats.conflictsResolved++;
    }
    
    return resolution.resolved;
  }
  
  /**
   * 订阅数据变更
   */
  subscribe(id: string, callback: Function): () => void {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    
    this.subscribers.get(id)!.add(callback);
    
    // 返回取消订阅函数
    return () => {
      const subscribers = this.subscribers.get(id);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(id);
        }
      }
    };
  }
  
  /**
   * 通知订阅者
   */
  private notifySubscribers(id: string, data: any): void {
    const subscribers = this.subscribers.get(id);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber notification error:', error);
        }
      }
    }
  }
  
  /**
   * 记录数据变更
   */
  private recordChange(change: DataChange): void {
    this.changeLog.push(change);
    
    // 限制变更日志大小
    if (this.changeLog.length > 10000) {
      this.changeLog = this.changeLog.slice(-5000);
    }
  }
  
  /**
   * 计算校验和
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }
  
  /**
   * 获取变更历史
   */
  getChangeHistory(id?: string, limit = 100): DataChange[] {
    let history = this.changeLog;
    
    if (id) {
      history = history.filter(change => change.id === id);
    }
    
    return history.slice(-limit);
  }
  
  /**
   * 配置数据桥接器
   */
  configure(config: Partial<SyncConfig>): void {
    Object.assign(this.config, config);
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      changeLogSize: this.changeLog.length,
      subscriberCount: this.subscribers.size,
      versions: this.versionManager.getVersion('stats') // 示例
    };
  }
  
  /**
   * 清理旧数据
   */
  cleanup(): void {
    this.versionManager.cleanup();
    
    // 清理旧的变更日志
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24小时前
    this.changeLog = this.changeLog.filter(change => change.timestamp > cutoff);
  }
  
  /**
   * 销毁数据桥接器
   */
  dispose(): void {
    this.versionManager.dispose();
    this.subscribers.clear();
    this.changeLog = [];
  }
}

// 创建全局数据桥接器实例
export const globalDataBridge = new DataBridge();