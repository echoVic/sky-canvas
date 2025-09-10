/**
 * 形状仓储服务 - DI集成的MVVM Repository
 */

import { injectable } from '../di/ServiceIdentifier';
import { IShapeRepository, MemoryShapeRepository } from '../models/repositories/IShapeRepository';
import { ShapeEntity } from '../models/entities/Shape';

/**
 * 形状仓储服务接口
 */
export interface IShapeRepositoryService extends IShapeRepository {
  /**
   * 初始化仓储
   */
  initialize(): Promise<void>;

  /**
   * 获取仓储统计信息
   */
  getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    visible: number;
    selected: number;
  }>;
}

/**
 * 内存形状仓储服务实现
 */
@injectable
export class MemoryShapeRepositoryService extends MemoryShapeRepository implements IShapeRepositoryService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // 这里可以添加初始化逻辑，比如从持久化存储加载数据
    this.initialized = true;
  }

  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    visible: number;
    selected: number;
  }> {
    const shapes = await this.getAll();
    const stats = {
      total: shapes.length,
      byType: {} as Record<string, number>,
      visible: 0,
      selected: 0 // 这里需要和选择服务集成
    };

    for (const shape of shapes) {
      // 统计类型
      stats.byType[shape.type] = (stats.byType[shape.type] || 0) + 1;
      
      // 统计可见形状
      if (shape.visible) {
        stats.visible++;
      }
    }

    return stats;
  }
}