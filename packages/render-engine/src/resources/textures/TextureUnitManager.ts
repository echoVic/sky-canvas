/**
 * 纹理单元管理器
 * 管理 WebGL 纹理单元的分配和回收
 */

import { PooledTexture } from './TextureTypes';

/**
 * 纹理单元统计信息
 */
export interface TextureUnitStats {
  available: number;
  used: number;
  total: number;
}

/**
 * 纹理单元管理器
 */
export class TextureUnitManager {
  private availableUnits: number[] = [];
  private usedUnits = new Set<number>();
  private unitTextures = new Map<number, PooledTexture>();

  constructor(maxUnits: number) {
    for (let i = 0; i < maxUnits; i++) {
      this.availableUnits.push(i);
    }
  }

  /**
   * 分配纹理单元
   */
  allocateUnit(): number | null {
    if (this.availableUnits.length === 0) {
      return this.reclaimLeastUsedUnit();
    }

    const unit = this.availableUnits.pop()!;
    this.usedUnits.add(unit);
    return unit;
  }

  /**
   * 释放纹理单元
   */
  releaseUnit(unit: number): void {
    if (this.usedUnits.has(unit)) {
      this.usedUnits.delete(unit);
      this.unitTextures.delete(unit);
      this.availableUnits.push(unit);
    }
  }

  /**
   * 绑定纹理到单元
   */
  bindTexture(unit: number, texture: PooledTexture): void {
    this.unitTextures.set(unit, texture);
  }

  /**
   * 获取单元统计
   */
  getStats(): TextureUnitStats {
    return {
      available: this.availableUnits.length,
      used: this.usedUnits.size,
      total: this.availableUnits.length + this.usedUnits.size
    };
  }

  private reclaimLeastUsedUnit(): number | null {
    let leastUsedUnit = -1;
    let oldestTime = Date.now();

    for (const [unit, texture] of this.unitTextures) {
      if (!texture.inUse && texture.lastUsed < oldestTime) {
        oldestTime = texture.lastUsed;
        leastUsedUnit = unit;
      }
    }

    if (leastUsedUnit >= 0) {
      const texture = this.unitTextures.get(leastUsedUnit);
      if (texture) {
        texture.unbind();
        this.unitTextures.delete(leastUsedUnit);
      }
      return leastUsedUnit;
    }

    return null;
  }
}
