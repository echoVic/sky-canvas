/**
 * 光照管理器
 * 统一管理光源和阴影效果
 */

import {
  ILight,
  IShadow,
  ILightingManager,
  MaterialProperties,
  LightingResult,
  LightingEvents
} from '../types/LightingTypes';
import { Point2D, Vector2D } from '../../animation/types/PathTypes';
import { EventEmitter } from 'eventemitter3';

export class LightingManager extends EventEmitter<LightingEvents> implements ILightingManager {
  private lights: Map<string, ILight> = new Map();
  private shadows: Map<string, IShadow> = new Map();
  
  private lastUpdateTime = 0;
  private animationFrameId: number | null = null;

  constructor() {
    super();
  }

  // 光源管理
  addLight(light: ILight): void {
    this.lights.set(light.id, light);
    this.emit('lightAdded', light);
  }

  removeLight(lightId: string): boolean {
    const light = this.lights.get(lightId);
    if (light) {
      light.dispose();
      this.lights.delete(lightId);
      this.emit('lightRemoved', lightId);
      return true;
    }
    return false;
  }

  getLight(lightId: string): ILight | undefined {
    return this.lights.get(lightId);
  }

  getAllLights(): ILight[] {
    return Array.from(this.lights.values());
  }

  // 阴影管理
  addShadow(shadow: IShadow): void {
    this.shadows.set(shadow.id, shadow);
    this.emit('shadowAdded', shadow);
  }

  removeShadow(shadowId: string): boolean {
    const shadow = this.shadows.get(shadowId);
    if (shadow) {
      shadow.dispose();
      this.shadows.delete(shadowId);
      this.emit('shadowRemoved', shadowId);
      return true;
    }
    return false;
  }

  getShadow(shadowId: string): IShadow | undefined {
    return this.shadows.get(shadowId);
  }

  getAllShadows(): IShadow[] {
    return Array.from(this.shadows.values());
  }

  // 光照计算
  calculateSceneLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult {
    const result: LightingResult = {
      ambient: { r: 0, g: 0, b: 0 },
      diffuse: { r: 0, g: 0, b: 0 },
      specular: { r: 0, g: 0, b: 0 },
      final: { r: 0, g: 0, b: 0 },
      intensity: 0
    };

    let totalIntensity = 0;

    // 遍历所有启用的光源
    for (const light of this.lights.values()) {
      if (!light.enabled) continue;

      const lightResult = light.calculateLighting(position, normal, viewDirection, material);
      
      // 累加光照分量
      result.ambient.r += lightResult.ambient.r;
      result.ambient.g += lightResult.ambient.g;
      result.ambient.b += lightResult.ambient.b;
      
      result.diffuse.r += lightResult.diffuse.r;
      result.diffuse.g += lightResult.diffuse.g;
      result.diffuse.b += lightResult.diffuse.b;
      
      result.specular.r += lightResult.specular.r;
      result.specular.g += lightResult.specular.g;
      result.specular.b += lightResult.specular.b;
      
      totalIntensity += lightResult.intensity;
    }

    // 应用自发光
    if (material.emissiveIntensity > 0) {
      const emissiveColor = this.parseColor(material.emissive);
      const emissiveContribution = {
        r: (emissiveColor.r / 255) * material.emissiveIntensity,
        g: (emissiveColor.g / 255) * material.emissiveIntensity,
        b: (emissiveColor.b / 255) * material.emissiveIntensity
      };
      
      result.ambient.r += emissiveContribution.r;
      result.ambient.g += emissiveContribution.g;
      result.ambient.b += emissiveContribution.b;
    }

    // 计算最终颜色
    result.final = {
      r: this.clamp(result.ambient.r + result.diffuse.r + result.specular.r),
      g: this.clamp(result.ambient.g + result.diffuse.g + result.specular.g),
      b: this.clamp(result.ambient.b + result.diffuse.b + result.specular.b)
    };

    result.intensity = totalIntensity;
    return result;
  }

  // 渲染阴影
  renderAllShadows(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    try {
      // 按类型和层次顺序渲染阴影
      const sortedShadows = this.getSortedShadows();
      
      for (const shadow of sortedShadows) {
        if (shadow.enabled) {
          // 这里需要传入实际的渲染目标
          // 在实际使用中，应该传入要投射阴影的对象
          // shadow.render(ctx, targetObject);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * 批量更新光源位置
   */
  updateLightPositions(positions: { [lightId: string]: Point2D }): void {
    for (const [lightId, position] of Object.entries(positions)) {
      const light = this.lights.get(lightId);
      if (light && 'setPosition' in light) {
        (light as any).setPosition(position);
        this.emit('lightUpdated', light);
      }
    }
  }

  /**
   * 批量更新光源强度
   */
  updateLightIntensities(intensities: { [lightId: string]: number }): void {
    for (const [lightId, intensity] of Object.entries(intensities)) {
      const light = this.lights.get(lightId);
      if (light) {
        light.updateConfig({ intensity } as any);
        this.emit('lightUpdated', light);
      }
    }
  }

  /**
   * 启用/禁用所有光源
   */
  setAllLightsEnabled(enabled: boolean): void {
    for (const light of this.lights.values()) {
      light.enabled = enabled;
      this.emit('lightUpdated', light);
    }
  }

  /**
   * 启用/禁用所有阴影
   */
  setAllShadowsEnabled(enabled: boolean): void {
    for (const shadow of this.shadows.values()) {
      shadow.enabled = enabled;
      this.emit('shadowUpdated', shadow);
    }
  }

  // 更新光照系统
  update(deltaTime: number): void {
    const currentTime = performance.now();
    
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = currentTime;
      return;
    }

    const dt = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 更新动画光源（如果有的话）
    for (const light of this.lights.values()) {
      if ('update' in light) {
        (light as any).update(dt);
      }
    }

    // 更新动画阴影（如果有的话）
    for (const shadow of this.shadows.values()) {
      if ('update' in shadow) {
        (shadow as any).update(dt);
      }
    }
  }

  // 清除所有光源和阴影
  clear(): void {
    // 清理所有光源
    for (const light of this.lights.values()) {
      light.dispose();
    }
    this.lights.clear();

    // 清理所有阴影
    for (const shadow of this.shadows.values()) {
      shadow.dispose();
    }
    this.shadows.clear();
  }

  // 获取统计信息
  getStats() {
    const activeLights = Array.from(this.lights.values()).filter(l => l.enabled).length;
    const activeShadows = Array.from(this.shadows.values()).filter(s => s.enabled).length;

    return {
      totalLights: this.lights.size,
      activeLights,
      totalShadows: this.shadows.size,
      activeShadows
    };
  }

  /**
   * 创建光照预览
   */
  createLightingPreview(
    width: number,
    height: number,
    material: MaterialProperties
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    
    // 为每个像素计算光照
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const position = { x, y };
        const normal = { x: 0, y: -1 }; // 假设法线向上
        const viewDirection = { x: 0, y: 0 }; // 简化的视角方向
        
        const lighting = this.calculateSceneLighting(position, normal, viewDirection, material);
        
        const index = (y * width + x) * 4;
        imageData.data[index] = lighting.final.r * 255;
        imageData.data[index + 1] = lighting.final.g * 255;
        imageData.data[index + 2] = lighting.final.b * 255;
        imageData.data[index + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * 获取排序后的阴影列表
   */
  private getSortedShadows(): IShadow[] {
    return Array.from(this.shadows.values()).sort((a, b) => {
      // 按类型排序：投影 > 内阴影 > 其他
      const typeOrder = { 'drop-shadow': 1, 'inner-shadow': 2, 'box-shadow': 3, 'text-shadow': 4, 'cast-shadow': 5 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 10;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 10;
      
      return aOrder - bOrder;
    });
  }

  /**
   * 解析颜色字符串
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }
    }
    return { r: 255, g: 255, b: 255 };
  }

  /**
   * 限制值在指定范围内
   */
  private clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 启动自动更新循环
   */
  startUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      return;
    }
    
    const updateLoop = () => {
      this.update(16); // 假设60FPS
      this.animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    this.animationFrameId = requestAnimationFrame(updateLoop);
  }

  /**
   * 停止自动更新循环
   */
  stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.stopUpdateLoop();
    this.clear();
    this.removeAllListeners();
  }
}