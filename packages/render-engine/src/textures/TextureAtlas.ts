/**
 * 高级纹理图集系统
 * 实现纹理的自动打包、管理和优化
 */

import { EventEmitter } from '../events/EventBus';

// 纹理信息接口
export interface TextureInfo {
  id: string;
  width: number;
  height: number;
  data?: ImageData | HTMLImageElement | HTMLCanvasElement;
  url?: string;
}

// 图集项信息
export interface AtlasEntry {
  textureId: string;
  atlasId: string;
  // 在图集中的位置和尺寸
  x: number;
  y: number;
  width: number;
  height: number;
  // UV坐标 (0-1)
  uvX: number;
  uvY: number;
  uvWidth: number;
  uvHeight: number;
  // 是否被使用
  isUsed: boolean;
  lastUsedTime: number;
}

// 图集区域信息
export interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean;
}

// 图集配置
export interface AtlasConfig {
  maxWidth: number;
  maxHeight: number;
  padding: number;
  powerOfTwo: boolean;
  allowRotation: boolean;
  algorithm: 'maxrects' | 'shelf' | 'guillotine';
}

// 图集事件
export interface AtlasEvents {
  atlasCreated: { atlasId: string; width: number; height: number };
  textureAdded: { textureId: string; entry: AtlasEntry };
  textureRemoved: { textureId: string; atlasId: string };
  atlasOptimized: { atlasId: string; beforeUtilization: number; afterUtilization: number };
  memoryPressure: { totalMemory: number; threshold: number };
}

// 装箱节点（用于MaxRects算法）
interface PackingNode {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean;
  down?: PackingNode;
  right?: PackingNode;
}

/**
 * 高级纹理图集管理器
 */
export class TextureAtlas extends EventEmitter<AtlasEvents> {
  private atlases = new Map<string, {
    id: string;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
    entries: Map<string, AtlasEntry>;
    freeRegions: AtlasRegion[];
    utilization: number;
    lastOptimized: number;
  }>();

  private textureMap = new Map<string, AtlasEntry>();
  private config: AtlasConfig;
  private nextAtlasId = 0;
  private memoryUsage = 0;
  private memoryLimit = 256 * 1024 * 1024; // 256MB

  constructor(config?: Partial<AtlasConfig>) {
    super();
    
    this.config = {
      maxWidth: 2048,
      maxHeight: 2048,
      padding: 2,
      powerOfTwo: true,
      allowRotation: false,
      algorithm: 'maxrects',
      ...config
    };
  }

  /**
   * 添加纹理到图集
   */
  addTexture(texture: TextureInfo): AtlasEntry | null {
    // 检查纹理是否已存在
    if (this.textureMap.has(texture.id)) {
      const entry = this.textureMap.get(texture.id)!;
      entry.lastUsedTime = Date.now();
      return entry;
    }

    // 检查内存使用情况
    if (this.memoryUsage > this.memoryLimit) {
      this.handleMemoryPressure();
    }

    // 找到合适的图集或创建新图集
    const entry = this.findBestFit(texture) || this.createNewAtlasWithTexture(texture);
    
    if (entry) {
      this.textureMap.set(texture.id, entry);
      this.drawTextureToAtlas(texture, entry);
      this.emit('textureAdded', { textureId: texture.id, entry });
    }

    return entry;
  }

  /**
   * 批量添加纹理
   */
  addTextures(textures: TextureInfo[]): Map<string, AtlasEntry> {
    const results = new Map<string, AtlasEntry>();
    
    // 按面积排序，大纹理优先
    const sortedTextures = [...textures].sort((a, b) => 
      (b.width * b.height) - (a.width * a.height)
    );

    for (const texture of sortedTextures) {
      const entry = this.addTexture(texture);
      if (entry) {
        results.set(texture.id, entry);
      }
    }

    return results;
  }

  /**
   * 移除纹理
   */
  removeTexture(textureId: string): boolean {
    const entry = this.textureMap.get(textureId);
    if (!entry) return false;

    const atlas = this.atlases.get(entry.atlasId);
    if (atlas) {
      // 标记区域为未使用
      atlas.freeRegions.push({
        x: entry.x,
        y: entry.y,
        width: entry.width,
        height: entry.height,
        used: false
      });
      
      atlas.entries.delete(textureId);
      this.updateAtlasUtilization(entry.atlasId);
    }

    this.textureMap.delete(textureId);
    this.emit('textureRemoved', { textureId, atlasId: entry.atlasId });
    
    return true;
  }

  /**
   * 获取纹理信息
   */
  getTexture(textureId: string): AtlasEntry | null {
    const entry = this.textureMap.get(textureId);
    if (entry) {
      entry.lastUsedTime = Date.now();
    }
    return entry || null;
  }

  /**
   * 获取图集纹理
   */
  getAtlasTexture(atlasId: string): HTMLCanvasElement | null {
    const atlas = this.atlases.get(atlasId);
    return atlas ? atlas.canvas : null;
  }

  /**
   * 优化图集
   */
  optimizeAtlas(atlasId: string): boolean {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return false;

    const beforeUtilization = atlas.utilization;
    
    // 重新打包图集
    if (this.repackAtlas(atlasId)) {
      this.updateAtlasUtilization(atlasId);
      const afterUtilization = this.atlases.get(atlasId)!.utilization;
      
      this.emit('atlasOptimized', {
        atlasId,
        beforeUtilization,
        afterUtilization
      });
      
      return true;
    }

    return false;
  }

  /**
   * 优化所有图集
   */
  optimizeAll(): void {
    for (const atlasId of this.atlases.keys()) {
      this.optimizeAtlas(atlasId);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    let totalTextures = 0;
    let totalUtilization = 0;
    let totalMemory = 0;
    
    for (const atlas of this.atlases.values()) {
      totalTextures += atlas.entries.size;
      totalUtilization += atlas.utilization;
      totalMemory += atlas.width * atlas.height * 4; // RGBA
    }

    return {
      atlasCount: this.atlases.size,
      totalTextures,
      averageUtilization: totalUtilization / this.atlases.size || 0,
      totalMemoryUsage: totalMemory,
      memoryLimit: this.memoryLimit
    };
  }

  /**
   * 查找最佳匹配位置
   */
  private findBestFit(texture: TextureInfo): AtlasEntry | null {
    let bestAtlas: string | null = null;
    let bestScore = Infinity;
    let bestPosition: { x: number; y: number } | null = null;

    for (const [atlasId, atlas] of this.atlases) {
      const position = this.findSpaceInAtlas(atlas, texture.width, texture.height);
      if (position) {
        // 评分：优先使用利用率高的图集
        const score = (1 - atlas.utilization) * 1000 + 
                     Math.abs(position.x + texture.width - atlas.width) +
                     Math.abs(position.y + texture.height - atlas.height);
        
        if (score < bestScore) {
          bestScore = score;
          bestAtlas = atlasId;
          bestPosition = position;
        }
      }
    }

    if (bestAtlas && bestPosition) {
      return this.createAtlasEntry(texture, bestAtlas, bestPosition.x, bestPosition.y);
    }

    return null;
  }

  /**
   * 在图集中查找空间
   */
  private findSpaceInAtlas(atlas: any, width: number, height: number): { x: number; y: number } | null {
    const paddedWidth = width + this.config.padding * 2;
    const paddedHeight = height + this.config.padding * 2;

    switch (this.config.algorithm) {
      case 'maxrects':
        return this.findSpaceMaxRects(atlas, paddedWidth, paddedHeight);
      case 'shelf':
        return this.findSpaceShelf(atlas, paddedWidth, paddedHeight);
      case 'guillotine':
        return this.findSpaceGuillotine(atlas, paddedWidth, paddedHeight);
      default:
        return this.findSpaceMaxRects(atlas, paddedWidth, paddedHeight);
    }
  }

  /**
   * MaxRects算法查找空间
   */
  private findSpaceMaxRects(atlas: any, width: number, height: number): { x: number; y: number } | null {
    let bestX = 0;
    let bestY = 0;
    let bestShortSide = Infinity;
    let bestLongSide = Infinity;
    let found = false;

    for (const region of atlas.freeRegions) {
      if (region.used || region.width < width || region.height < height) {
        continue;
      }

      const leftoverHorizontal = region.width - width;
      const leftoverVertical = region.height - height;
      const shortSide = Math.min(leftoverHorizontal, leftoverVertical);
      const longSide = Math.max(leftoverHorizontal, leftoverVertical);

      if (shortSide < bestShortSide || (shortSide === bestShortSide && longSide < bestLongSide)) {
        bestX = region.x;
        bestY = region.y;
        bestShortSide = shortSide;
        bestLongSide = longSide;
        found = true;
      }
    }

    return found ? { x: bestX + this.config.padding, y: bestY + this.config.padding } : null;
  }

  /**
   * Shelf算法查找空间
   */
  private findSpaceShelf(atlas: any, width: number, height: number): { x: number; y: number } | null {
    // 简化的Shelf算法实现
    for (let y = 0; y < atlas.height - height; y += 32) {
      for (let x = 0; x < atlas.width - width; x += 32) {
        if (this.isSpaceFree(atlas, x, y, width, height)) {
          return { x: x + this.config.padding, y: y + this.config.padding };
        }
      }
    }
    return null;
  }

  /**
   * Guillotine算法查找空间
   */
  private findSpaceGuillotine(atlas: any, width: number, height: number): { x: number; y: number } | null {
    // 简化的Guillotine算法实现
    return this.findSpaceMaxRects(atlas, width, height);
  }

  /**
   * 检查空间是否空闲
   */
  private isSpaceFree(atlas: any, x: number, y: number, width: number, height: number): boolean {
    for (const entry of atlas.entries.values()) {
      if (!(x + width <= entry.x || x >= entry.x + entry.width ||
            y + height <= entry.y || y >= entry.y + entry.height)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 创建新图集
   */
  private createNewAtlasWithTexture(texture: TextureInfo): AtlasEntry | null {
    const atlasId = `atlas_${this.nextAtlasId++}`;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return null;

    // 计算图集尺寸
    let atlasWidth = Math.max(texture.width + this.config.padding * 2, 256);
    let atlasHeight = Math.max(texture.height + this.config.padding * 2, 256);

    if (this.config.powerOfTwo) {
      atlasWidth = this.nextPowerOfTwo(atlasWidth);
      atlasHeight = this.nextPowerOfTwo(atlasHeight);
    }

    atlasWidth = Math.min(atlasWidth, this.config.maxWidth);
    atlasHeight = Math.min(atlasHeight, this.config.maxHeight);

    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    
    // 清空画布
    context.clearRect(0, 0, atlasWidth, atlasHeight);

    const atlas = {
      id: atlasId,
      canvas,
      context,
      width: atlasWidth,
      height: atlasHeight,
      entries: new Map<string, AtlasEntry>(),
      freeRegions: [{
        x: 0,
        y: 0,
        width: atlasWidth,
        height: atlasHeight,
        used: false
      }],
      utilization: 0,
      lastOptimized: Date.now()
    };

    this.atlases.set(atlasId, atlas);
    this.memoryUsage += atlasWidth * atlasHeight * 4;
    
    this.emit('atlasCreated', { 
      atlasId, 
      width: atlasWidth, 
      height: atlasHeight 
    });

    return this.createAtlasEntry(texture, atlasId, this.config.padding, this.config.padding);
  }

  /**
   * 创建图集项
   */
  private createAtlasEntry(texture: TextureInfo, atlasId: string, x: number, y: number): AtlasEntry {
    const atlas = this.atlases.get(atlasId)!;
    
    const entry: AtlasEntry = {
      textureId: texture.id,
      atlasId,
      x,
      y,
      width: texture.width,
      height: texture.height,
      uvX: x / atlas.width,
      uvY: y / atlas.height,
      uvWidth: texture.width / atlas.width,
      uvHeight: texture.height / atlas.height,
      isUsed: true,
      lastUsedTime: Date.now()
    };

    atlas.entries.set(texture.id, entry);
    this.updateAtlasUtilization(atlasId);

    return entry;
  }

  /**
   * 将纹理绘制到图集
   */
  private drawTextureToAtlas(texture: TextureInfo, entry: AtlasEntry): void {
    const atlas = this.atlases.get(entry.atlasId);
    if (!atlas || !texture.data) return;

    try {
      atlas.context.drawImage(
        texture.data as any,
        entry.x,
        entry.y,
        entry.width,
        entry.height
      );
    } catch (error) {
      console.warn(`Failed to draw texture ${texture.id} to atlas:`, error);
    }
  }

  /**
   * 更新图集利用率
   */
  private updateAtlasUtilization(atlasId: string): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return;

    let usedArea = 0;
    for (const entry of atlas.entries.values()) {
      usedArea += entry.width * entry.height;
    }

    atlas.utilization = usedArea / (atlas.width * atlas.height);
  }

  /**
   * 重新打包图集
   */
  private repackAtlas(atlasId: string): boolean {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return false;

    // 收集所有纹理信息
    const textures: Array<{ entry: AtlasEntry; data: ImageData }> = [];
    
    for (const entry of atlas.entries.values()) {
      try {
        const imageData = atlas.context.getImageData(entry.x, entry.y, entry.width, entry.height);
        textures.push({ entry, data: imageData });
      } catch (error) {
        console.warn(`Failed to extract texture data for repacking:`, error);
        return false;
      }
    }

    // 清空画布
    atlas.context.clearRect(0, 0, atlas.width, atlas.height);
    atlas.entries.clear();
    atlas.freeRegions = [{
      x: 0,
      y: 0,
      width: atlas.width,
      height: atlas.height,
      used: false
    }];

    // 重新添加纹理
    for (const { entry, data } of textures) {
      const position = this.findSpaceInAtlas(atlas, entry.width, entry.height);
      if (position) {
        entry.x = position.x;
        entry.y = position.y;
        entry.uvX = position.x / atlas.width;
        entry.uvY = position.y / atlas.height;
        
        atlas.entries.set(entry.textureId, entry);
        atlas.context.putImageData(data, position.x, position.y);
      }
    }

    return true;
  }

  /**
   * 处理内存压力
   */
  private handleMemoryPressure(): void {
    this.emit('memoryPressure', {
      totalMemory: this.memoryUsage,
      threshold: this.memoryLimit
    });

    // 移除最久未使用的纹理
    const entries = Array.from(this.textureMap.values())
      .sort((a, b) => a.lastUsedTime - b.lastUsedTime);

    const removeCount = Math.ceil(entries.length * 0.1); // 移除10%
    for (let i = 0; i < removeCount; i++) {
      this.removeTexture(entries[i].textureId);
    }
  }

  /**
   * 获取下一个2的幂次
   */
  private nextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
  }

  /**
   * 销毁图集
   */
  dispose(): void {
    for (const atlas of this.atlases.values()) {
      atlas.canvas.width = 0;
      atlas.canvas.height = 0;
    }
    
    this.atlases.clear();
    this.textureMap.clear();
    this.memoryUsage = 0;
  }
}

// 全局纹理图集实例
export const globalTextureAtlas = new TextureAtlas();