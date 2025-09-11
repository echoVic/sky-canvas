/**
 * 复合操作类型定义
 */

// Canvas 2D 复合操作模式
export enum CompositeOperation {
  // 标准操作
  SOURCE_OVER = 'source-over',
  SOURCE_ATOP = 'source-atop',
  SOURCE_IN = 'source-in',
  SOURCE_OUT = 'source-out',
  
  // 目标操作
  DESTINATION_OVER = 'destination-over',
  DESTINATION_ATOP = 'destination-atop',
  DESTINATION_IN = 'destination-in',
  DESTINATION_OUT = 'destination-out',
  
  // 特殊操作
  LIGHTER = 'lighter',
  COPY = 'copy',
  XOR = 'xor',
  
  // 混合操作
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  DARKEN = 'darken',
  LIGHTEN = 'lighten',
  COLOR_DODGE = 'color-dodge',
  COLOR_BURN = 'color-burn',
  HARD_LIGHT = 'hard-light',
  SOFT_LIGHT = 'soft-light',
  DIFFERENCE = 'difference',
  EXCLUSION = 'exclusion',
  HUE = 'hue',
  SATURATION = 'saturation',
  COLOR = 'color',
  LUMINOSITY = 'luminosity'
}

// 复合操作配置
export interface CompositeConfig {
  operation: CompositeOperation;
  globalAlpha: number;
  enabled: boolean;
  preserveCanvas?: boolean;
  clipToRegion?: boolean;
}

// 复合操作接口
export interface ICompositeOperation {
  readonly id: string;
  readonly operation: CompositeOperation;
  readonly config: CompositeConfig;
  
  apply(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void;
  
  applyToImageData(
    destData: ImageData,
    sourceData: ImageData,
    targetData?: ImageData
  ): ImageData;
  
  updateConfig(config: Partial<CompositeConfig>): void;
  clone(): ICompositeOperation;
  dispose(): void;
}

// 复合操作管理器接口
export interface ICompositeManager {
  addCompositeOperation(operation: ICompositeOperation): void;
  removeCompositeOperation(operationId: string): boolean;
  getCompositeOperation(operationId: string): ICompositeOperation | undefined;
  getAllCompositeOperations(): ICompositeOperation[];
  
  composite(layers: CompositeLayer[]): HTMLCanvasElement;
  clear(): void;
  dispose(): void;
}

// 复合层数据
export interface CompositeLayer {
  id: string;
  canvas: HTMLCanvasElement;
  imageData?: ImageData;
  operation: CompositeOperation;
  globalAlpha: number;
  visible: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mask?: HTMLCanvasElement | ImageData;
}

// 复合结果
export interface CompositeResult {
  canvas: HTMLCanvasElement;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  compositedLayers: number;
  renderTime: number;
}

// 复合事件类型
export type CompositeEvents = {
  compositeOperationAdded: (operation: ICompositeOperation) => void;
  compositeOperationRemoved: (operationId: string) => void;
  compositeOperationUpdated: (operation: ICompositeOperation) => void;
  compositeStarted: (layers: CompositeLayer[]) => void;
  compositeCompleted: (result: CompositeResult) => void;
  compositeError: (error: Error) => void;
};

// 复合统计信息
export interface CompositeStats {
  totalOperations: number;
  activeOperations: number;
  totalComposites: number;
  averageCompositeTime: number;
  memoryUsage: number;
}

// 复合性能配置
export interface CompositePerformanceConfig {
  useOffscreenCanvas: boolean;
  enableBatching: boolean;
  maxBatchSize: number;
  enableWorkers: boolean;
  workerCount: number;
}

// 复合上下文
export interface CompositeContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  offscreenCanvas?: OffscreenCanvas;
  performanceConfig: CompositePerformanceConfig;
}

// 复合模式分类
export enum CompositeCategory {
  SOURCE = 'source',
  DESTINATION = 'destination',
  SPECIAL = 'special',
  BLEND = 'blend'
}

// 复合模式信息
export interface CompositeModeInfo {
  name: string;
  description: string;
  category: CompositeCategory;
  supported: boolean;
}

// 导出所有类型
export type AnyCompositeConfig = CompositeConfig;
export type CompositeOperationType = CompositeOperation;