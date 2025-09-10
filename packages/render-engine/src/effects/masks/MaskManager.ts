/**
 * 遮罩管理器
 */

import { 
  IMask, 
  IMaskManager,
  AnyMaskConfig,
  MaskEvents
} from '../types/MaskTypes';
import { IShape } from '../../canvas-sdk/src/types/Shape';
import { EventEmitter } from '../../animation/core/EventEmitter';
import { MaskFactory } from './MaskFactory';

export class MaskManager extends EventEmitter<MaskEvents> implements IMaskManager {
  private masks: Map<string, IMask> = new Map();
  private maskFactory: MaskFactory;

  constructor() {
    super();
    this.maskFactory = new MaskFactory();
  }

  createMask(config: AnyMaskConfig): IMask {
    let mask: IMask;

    switch (config.shape) {
      case 'rectangle':
        mask = this.maskFactory.createRectangleMask(config as any);
        break;
      case 'circle':
        mask = this.maskFactory.createCircleMask(config as any);
        break;
      case 'ellipse':
        mask = this.maskFactory.createEllipseMask(config as any);
        break;
      case 'polygon':
        mask = this.maskFactory.createPolygonMask(config as any);
        break;
      case 'path':
        mask = this.maskFactory.createPathMask(config as any);
        break;
      case 'custom':
        mask = this.maskFactory.createCustomMask(config as any);
        break;
      default:
        throw new Error(`Unknown mask shape: ${(config as any).shape}`);
    }

    this.masks.set(mask.id, mask);
    this.emit('maskCreated', mask);
    
    return mask;
  }

  addMask(mask: IMask): void {
    this.masks.set(mask.id, mask);
    this.emit('maskCreated', mask);
  }

  removeMask(maskId: string): boolean {
    const mask = this.masks.get(maskId);
    if (mask) {
      mask.dispose();
      this.masks.delete(maskId);
      this.emit('maskRemoved', maskId);
      return true;
    }
    return false;
  }

  getMask(maskId: string): IMask | undefined {
    return this.masks.get(maskId);
  }

  getAllMasks(): IMask[] {
    return Array.from(this.masks.values());
  }

  applyMasks(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void {
    if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
      return;
    }

    const enabledMasks = this.getEnabledMasks();
    if (enabledMasks.length === 0) {
      return;
    }

    // 应用多个遮罩需要特殊处理
    this.applyMultipleMasks(ctx, target, enabledMasks);
  }

  private applyMultipleMasks(
    ctx: CanvasRenderingContext2D, 
    target: IShape | HTMLCanvasElement, 
    masks: IMask[]
  ): void {
    if (masks.length === 1) {
      // 单个遮罩直接应用
      masks[0].apply(ctx, target);
      return;
    }

    // 多个遮罩需要组合应用
    ctx.save();

    try {
      // 创建遮罩组合
      for (const mask of masks) {
        mask.apply(ctx, target);
      }
    } finally {
      ctx.restore();
    }
  }

  clear(): void {
    for (const mask of this.masks.values()) {
      mask.dispose();
    }
    this.masks.clear();
  }

  setMaskEnabled(maskId: string, enabled: boolean): void {
    const mask = this.masks.get(maskId);
    if (mask) {
      mask.enabled = enabled;
      this.emit('maskEnabled', maskId, enabled);
      this.emit('maskUpdated', mask);
    }
  }

  getStats(): {
    totalMasks: number;
    enabledMasks: number;
    activeMasks: number;
  } {
    const totalMasks = this.masks.size;
    const enabledMasks = this.getEnabledMasks().length;
    const activeMasks = enabledMasks; // 简化实现，认为启用的遮罩都是活跃的

    return {
      totalMasks,
      enabledMasks,
      activeMasks
    };
  }

  /**
   * 获取启用的遮罩
   */
  private getEnabledMasks(): IMask[] {
    return Array.from(this.masks.values()).filter(mask => mask.enabled);
  }

  /**
   * 根据类型获取遮罩
   */
  getMasksByType(type: string): IMask[] {
    return Array.from(this.masks.values()).filter(mask => mask.config.type === type);
  }

  /**
   * 根据形状获取遮罩
   */
  getMasksByShape(shape: string): IMask[] {
    return Array.from(this.masks.values()).filter(mask => mask.config.shape === shape);
  }

  /**
   * 更新遮罩配置
   */
  updateMaskConfig(maskId: string, config: Partial<AnyMaskConfig>): boolean {
    const mask = this.masks.get(maskId);
    if (mask) {
      mask.updateConfig(config);
      this.emit('maskUpdated', mask);
      return true;
    }
    return false;
  }

  /**
   * 克隆遮罩
   */
  cloneMask(maskId: string): IMask | null {
    const mask = this.masks.get(maskId);
    if (mask) {
      const clonedMask = mask.clone();
      this.masks.set(clonedMask.id, clonedMask);
      this.emit('maskCreated', clonedMask);
      return clonedMask;
    }
    return null;
  }

  /**
   * 批量操作遮罩
   */
  batchOperation(operation: (mask: IMask) => void): void {
    for (const mask of this.masks.values()) {
      operation(mask);
    }
  }

  /**
   * 启用所有遮罩
   */
  enableAllMasks(): void {
    this.batchOperation(mask => {
      mask.enabled = true;
      this.emit('maskEnabled', mask.id, true);
    });
  }

  /**
   * 禁用所有遮罩
   */
  disableAllMasks(): void {
    this.batchOperation(mask => {
      mask.enabled = false;
      this.emit('maskEnabled', mask.id, false);
    });
  }

  /**
   * 切换所有遮罩状态
   */
  toggleAllMasks(): void {
    this.batchOperation(mask => {
      mask.enabled = !mask.enabled;
      this.emit('maskEnabled', mask.id, mask.enabled);
    });
  }

  /**
   * 获取遮罩层次结构（按应用顺序）
   */
  getMaskHierarchy(): IMask[] {
    // 简化实现：按创建顺序返回
    return this.getAllMasks();
  }

  /**
   * 重排序遮罩
   */
  reorderMasks(maskIds: string[]): boolean {
    const reorderedMasks = new Map<string, IMask>();
    
    // 按指定顺序重新排列
    for (const id of maskIds) {
      const mask = this.masks.get(id);
      if (mask) {
        reorderedMasks.set(id, mask);
      }
    }
    
    // 添加未在列表中的遮罩
    for (const [id, mask] of this.masks) {
      if (!reorderedMasks.has(id)) {
        reorderedMasks.set(id, mask);
      }
    }
    
    this.masks = reorderedMasks;
    return true;
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }
}