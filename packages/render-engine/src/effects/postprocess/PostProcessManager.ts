/**
 * 后处理效果管理器
 */

import { EventEmitter } from '../../animation/core/EventEmitter';
import {
    IPostProcessEffect,
    IPostProcessManager,
    PostProcessEvents,
    PostProcessLayer,
    PostProcessResult,
    PostProcessStats,
    PostProcessType
} from '../types/PostProcessTypes';

export class PostProcessManager extends EventEmitter<PostProcessEvents> implements IPostProcessManager {
  private effects: Map<string, IPostProcessEffect> = new Map();
  private stats: PostProcessStats = {
    totalEffects: 0,
    activeEffects: 0,
    totalProcesses: 0,
    averageProcessTime: 0,
    memoryUsage: 0
  };

  constructor() {
    super();
  }

  addEffect(effect: IPostProcessEffect): void {
    this.effects.set(effect.id, effect);
    this.stats.totalEffects++;
    this.stats.activeEffects++;
    this.emit('effectAdded', effect);
  }

  removeEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.dispose();
      this.effects.delete(effectId);
      this.stats.activeEffects--;
      this.emit('effectRemoved', effectId);
      return true;
    }
    return false;
  }

  getEffect(effectId: string): IPostProcessEffect | undefined {
    return this.effects.get(effectId);
  }

  getAllEffects(): IPostProcessEffect[] {
    return Array.from(this.effects.values());
  }

  process(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const startTime = performance.now();
    
    try {
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processedData = this.processImageData(imageData);
      
      const result = document.createElement('canvas');
      result.width = canvas.width;
      result.height = canvas.height;
      const resultCtx = result.getContext('2d')!;
      resultCtx.putImageData(processedData, 0, 0);

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateStats(renderTime);

      const processResult: PostProcessResult = {
        canvas: result,
        imageData: processedData,
        processedEffects: this.getEnabledEffects().length,
        renderTime
      };

      this.emit('processCompleted', processResult);
      return result;
    } catch (error) {
      this.emit('processError', error as Error);
      throw error;
    }
  }

  processImageData(imageData: ImageData): ImageData {
    const startTime = performance.now();
    this.emit('processStarted', [{ id: 'main', canvas: document.createElement('canvas'), effects: this.getAllEffects(), enabled: true }]);

    try {
      const enabledEffects = this.getEnabledEffects();
      
      if (enabledEffects.length === 0) {
        return imageData;
      }

      let currentData = imageData;
      let tempData = new ImageData(imageData.width, imageData.height);

      // 按顺序应用所有启用的效果
      for (let i = 0; i < enabledEffects.length; i++) {
        const effect = enabledEffects[i];
        
        try {
          if (i === enabledEffects.length - 1) {
            // 最后一个效果，直接输出到最终结果
            currentData = effect.apply(currentData);
          } else {
            // 中间效果，使用临时数据
            const nextData = effect.apply(currentData, tempData);
            currentData = nextData;
            tempData = new ImageData(imageData.width, imageData.height);
          }
        } catch (effectError) {
          console.warn(`Effect ${effect.type} failed:`, effectError);
          continue;
        }
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateStats(renderTime);

      const processResult: PostProcessResult = {
        canvas: document.createElement('canvas'),
        imageData: currentData,
        processedEffects: enabledEffects.length,
        renderTime
      };

      this.emit('processCompleted', processResult);
      return currentData;
    } catch (error) {
      this.emit('processError', error as Error);
      throw error;
    }
  }

  processLayers(layers: PostProcessLayer[]): HTMLCanvasElement {
    const startTime = performance.now();
    this.emit('processStarted', layers);

    try {
      const visibleLayers = layers.filter(layer => layer.enabled);
      
      if (visibleLayers.length === 0) {
        throw new Error('No enabled layers to process');
      }

      // 计算合成画布尺寸
      const bounds = this.calculateBounds(visibleLayers);
      const result = document.createElement('canvas');
      result.width = bounds.width;
      result.height = bounds.height;
      const ctx = result.getContext('2d')!;

      // 处理每个图层
      for (const layer of visibleLayers) {
        const processedCanvas = this.processLayerEffects(layer);
        
        // 应用图层混合
        if (layer.blend) {
          ctx.save();
          ctx.globalCompositeOperation = layer.blend.mode;
          ctx.globalAlpha = layer.blend.opacity;
          ctx.drawImage(processedCanvas, 0, 0);
          ctx.restore();
        } else {
          ctx.drawImage(processedCanvas, 0, 0);
        }
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateStats(renderTime);

      const processResult: PostProcessResult = {
        canvas: result,
        processedEffects: this.getTotalEffectsCount(visibleLayers),
        renderTime
      };

      this.emit('processCompleted', processResult);
      return result;
    } catch (error) {
      this.emit('processError', error as Error);
      throw error;
    }
  }

  clear(): void {
    for (const effect of Array.from(this.effects.values())) {
      effect.dispose();
    }
    this.effects.clear();
    this.stats.activeEffects = 0;
  }

  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }

  getStats(): PostProcessStats {
    return { ...this.stats };
  }

  private getEnabledEffects(): IPostProcessEffect[] {
    return Array.from(this.effects.values()).filter(effect => effect.config.enabled);
  }

  private processLayerEffects(layer: PostProcessLayer): HTMLCanvasElement {
    if (layer.effects.length === 0) {
      return layer.canvas;
    }

    const ctx = layer.canvas.getContext('2d')!;
    let imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);

    // 应用图层的所有效果
    for (const effect of layer.effects) {
      if (effect.config.enabled) {
        imageData = effect.apply(imageData);
      }
    }

    // 创建结果画布
    const result = document.createElement('canvas');
    result.width = layer.canvas.width;
    result.height = layer.canvas.height;
    const resultCtx = result.getContext('2d')!;
    resultCtx.putImageData(imageData, 0, 0);

    return result;
  }

  private calculateBounds(layers: PostProcessLayer[]): { width: number; height: number } {
    let maxWidth = 0;
    let maxHeight = 0;

    for (const layer of layers) {
      maxWidth = Math.max(maxWidth, layer.canvas.width);
      maxHeight = Math.max(maxHeight, layer.canvas.height);
    }

    return { width: maxWidth, height: maxHeight };
  }

  private getTotalEffectsCount(layers: PostProcessLayer[]): number {
    return layers.reduce((count, layer) => count + layer.effects.length, 0);
  }

  private updateStats(renderTime: number): void {
    this.stats.totalProcesses++;
    this.stats.averageProcessTime = 
      (this.stats.averageProcessTime * (this.stats.totalProcesses - 1) + renderTime) / this.stats.totalProcesses;
    
    // 估算内存使用量
    this.stats.memoryUsage = this.effects.size * 2048; // 简单估算
  }

  // 便捷方法：按类型获取效果
  getEffectsByType(type: PostProcessType): IPostProcessEffect[] {
    return Array.from(this.effects.values()).filter(effect => effect.type === type);
  }

  // 便捷方法：启用/禁用效果
  enableEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.updateConfig({ enabled: true });
      this.emit('effectUpdated', effect);
      return true;
    }
    return false;
  }

  disableEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.updateConfig({ enabled: false });
      this.emit('effectUpdated', effect);
      return true;
    }
    return false;
  }

  // 便捷方法：设置效果强度
  setEffectIntensity(effectId: string, intensity: number): boolean {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.updateConfig({ intensity: Math.max(0, Math.min(1, intensity)) });
      this.emit('effectUpdated', effect);
      return true;
    }
    return false;
  }

  // 便捷方法：重置所有效果
  resetAllEffects(): void {
    for (const effect of Array.from(this.effects.values())) {
      effect.updateConfig({ enabled: false, intensity: 0 });
    }
  }

  // 便捷方法：获取性能统计
  getPerformanceReport(): {
    totalEffects: number;
    activeEffects: number;
    averageProcessTime: number;
    effectsPerformance: Array<{ type: PostProcessType; count: number }>;
  } {
    const effectTypes: Record<PostProcessType, number> = {} as Record<PostProcessType, number>;
    
    for (const effect of Array.from(this.effects.values())) {
      effectTypes[effect.type] = (effectTypes[effect.type] || 0) + 1;
    }

    return {
      totalEffects: this.stats.totalEffects,
      activeEffects: this.stats.activeEffects,
      averageProcessTime: this.stats.averageProcessTime,
      effectsPerformance: Object.entries(effectTypes).map(([type, count]) => ({
        type: type as PostProcessType,
        count
      }))
    };
  }
}