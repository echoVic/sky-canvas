/**
 * 混合管理器
 */

import { EventEmitter } from '../../animation/core/EventEmitter';
import {
    BlendColor,
    BlendColorWithMode,
    BlendEvents,
    BlendLayer,
    BlendMode,
    BlendResult,
    BlendStats,
    IBlendManager,
    IBlendOperation
} from '../types/BlendTypes';

export class BlendManager extends EventEmitter<BlendEvents> implements IBlendManager {
  private operations: Map<string, IBlendOperation> = new Map();
  private stats: BlendStats = {
    totalOperations: 0,
    activeOperations: 0,
    totalBlends: 0,
    averageBlendTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0
  };

  constructor() {
    super();
  }

  addBlendOperation(operation: IBlendOperation): void {
    this.operations.set(operation.id, operation);
    this.stats.totalOperations++;
    this.stats.activeOperations++;
    this.emit('blendOperationAdded', operation);
  }

  removeBlendOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.dispose();
      this.operations.delete(operationId);
      this.stats.activeOperations--;
      this.emit('blendOperationRemoved', operationId);
      return true;
    }
    return false;
  }

  getBlendOperation(operationId: string): IBlendOperation | undefined {
    return this.operations.get(operationId);
  }

  getAllBlendOperations(): IBlendOperation[] {
    return Array.from(this.operations.values());
  }

  blend(layers: BlendLayer[]): HTMLCanvasElement | ImageData {
    if (layers.length === 0) {
      throw new Error('No layers to blend');
    }

    const startTime = performance.now();
    this.emit('blendStarted', layers);

    try {
      const visibleLayers = layers.filter(layer => layer.visible && layer.opacity > 0);

      if (visibleLayers.length === 0) {
        throw new Error('No visible layers to blend');
      }

      const bounds = this.calculateBounds(visibleLayers);
      const result = this.performBlend(visibleLayers, bounds);

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateStats(renderTime);

      const blendResult: BlendResult = {
        canvas: result instanceof HTMLCanvasElement ? result : undefined,
        imageData: result instanceof ImageData ? result : undefined,
        bounds,
        blendedLayers: visibleLayers.length,
        renderTime
      };

      this.emit('blendCompleted', blendResult);
      return result;
    } catch (error) {
      this.emit('blendError', error as Error);
      throw error;
    }
  }

  blendColors(colors: BlendColorWithMode[]): BlendColor {
    if (colors.length === 0) {
      throw new Error('No colors to blend');
    }

    if (colors.length === 1) {
      return colors[0].color;
    }

    let result = colors[0].color;

    for (let i = 1; i < colors.length; i++) {
      const colorWithMode = colors[i];
      const operation = this.getBlendOperationByMode(colorWithMode.blendMode);
      
      if (operation) {
        const originalConfig = operation.config;
        operation.updateConfig({ opacity: colorWithMode.opacity });
        
        result = operation.apply(result, colorWithMode.color);
        
        operation.updateConfig(originalConfig);
      }
    }

    return result;
  }

  clear(): void {
    for (const operation of Array.from(this.operations.values())) {
      operation.dispose();
    }
    this.operations.clear();
    this.stats.activeOperations = 0;
  }

  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }

  getStats(): BlendStats {
    return { ...this.stats };
  }

  private performBlend(layers: BlendLayer[], bounds: { x: number; y: number; width: number; height: number }): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const ctx = canvas.getContext('2d')!;

    const firstLayer = layers[0];
    this.drawLayer(ctx, firstLayer, bounds);

    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i];
      this.blendLayer(ctx, layer, bounds);
    }

    return canvas;
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D, 
    layer: BlendLayer, 
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    
    const offsetX = (layer.bounds?.x || 0) - bounds.x;
    const offsetY = (layer.bounds?.y || 0) - bounds.y;
    
    ctx.drawImage(layer.canvas, offsetX, offsetY);
    ctx.restore();
  }

  private blendLayer(
    ctx: CanvasRenderingContext2D,
    layer: BlendLayer,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const baseImageData = ctx.getImageData(0, 0, bounds.width, bounds.height);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bounds.width;
    tempCanvas.height = bounds.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    const offsetX = (layer.bounds?.x || 0) - bounds.x;
    const offsetY = (layer.bounds?.y || 0) - bounds.y;
    
    tempCtx.globalAlpha = layer.opacity;
    tempCtx.drawImage(layer.canvas, offsetX, offsetY);
    
    const overlayImageData = tempCtx.getImageData(0, 0, bounds.width, bounds.height);
    
    const operation = this.getBlendOperationByMode(layer.blendMode);
    if (operation) {
      const blendedData = operation.applyToImageData(baseImageData, overlayImageData);
      ctx.putImageData(blendedData, 0, 0);
    } else {
      ctx.putImageData(overlayImageData, 0, 0);
    }
  }

  private getBlendOperationByMode(mode: BlendMode): IBlendOperation | undefined {
    for (const operation of Array.from(this.operations.values())) {
      if (operation.mode === mode) {
        return operation;
      }
    }
    return undefined;
  }

  private calculateBounds(layers: BlendLayer[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const layer of layers) {
      const bounds = layer.bounds || { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
      
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private updateStats(renderTime: number): void {
    this.stats.totalBlends++;
    this.stats.averageBlendTime = 
      (this.stats.averageBlendTime * (this.stats.totalBlends - 1) + renderTime) / this.stats.totalBlends;
  }
}