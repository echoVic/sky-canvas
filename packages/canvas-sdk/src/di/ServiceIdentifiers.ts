/**
 * Canvas SDK 核心服务标识符定义
 * 基于 VSCode DI 架构
 */

import { createServiceIdentifier } from './ServiceIdentifier';

// ============== 核心服务接口 ==============

/**
 * 渲染服务接口
 */
export interface ICanvasRenderingService {
  initialize(canvas: HTMLCanvasElement, config: any): Promise<void>;
  render(): void;
  start(): void;
  stop(): void;
  dispose(): void;
  getRenderEngine(): any;
  isRunning(): boolean;
  getStats(): any;
}

/**
 * 交互服务接口
 */
export interface IInteractionService {
  initialize(canvas: HTMLCanvasElement): void;
  setActiveTool(toolName: string | null): boolean;
  getActiveTool(): any;
  registerTool(tool: any): void;
  unregisterTool(name: string): void;
  setEnabled(enabled: boolean): void;
  enabled: boolean;
  dispose(): void;
}

/**
 * 历史服务接口
 */
export interface IHistoryService {
  execute(command: any): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

/**
 * 形状管理服务接口
 */
export interface IShapeService {
  addShape(shape: any): void;
  removeShape(id: string): void;
  getShape(id: string): any | undefined;
  getShapes(): any[];
  updateShape(id: string, updates: any): void;
  clearShapes(): void;
}

/**
 * 选择服务接口
 */
export interface ISelectionService {
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  getSelectedShapes(): any[];
  isSelected(id: string): boolean;
  multiSelect(shapes: any[]): void;
  addToSelection(shapes: any | any[]): void;
  removeFromSelection(shapes: any | any[]): void;
}

/**
 * 视口服务接口
 */
export interface IViewportService {
  getViewport(): any;
  setViewport(viewport: any): void;
  panViewport(delta: any): void;
  zoomViewport(factor: number, center?: any): void;
  fitToContent(): void;
  resetViewport(): void;
  screenToWorld(point: any): any;
  worldToScreen(point: any): any;
}

/**
 * 事件总线服务接口
 */
export interface IEventBusService {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler?: Function): void;
  once<T>(event: string, handler: (data: T) => void): void;
  removeAllListeners(event?: string): void;
}

/**
 * 动画服务接口
 */
export interface IAnimationService {
  animate(target: any, props: any, config?: any): any;
  createTimeline(): any;
  getTweenEngine(): any;
  stopAll(): void;
  update(deltaTime: number): void;
}

/**
 * 图层服务接口
 */
export interface ILayerService {
  createLayer(id: string, zIndex?: number): any;
  getLayer(id: string): any | undefined;
  removeLayer(id: string): void;
  getLayers(): any[];
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
}

/**
 * 工具服务接口
 */
export interface IToolService {
  registerTool(tool: any): void;
  unregisterTool(name: string): void;
  getTool(name: string): any | undefined;
  getTools(): any[];
  setActiveTool(name: string | null): boolean;
  getActiveTool(): any;
}

/**
 * 导入导出服务接口
 */
export interface IImportExportService {
  exportToSVG(shapes: any[], options?: any): string;
  exportToPNG(canvas: HTMLCanvasElement, options?: any): Promise<Blob>;
  exportToJPEG(canvas: HTMLCanvasElement, options?: any): Promise<Blob>;
  exportToJSON(scene: any): string;
  importFromJSON(jsonData: string): any;
  importFromSVG(svgData: string): any[];
  importFromImage(imageFile: File): Promise<any>;
}

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  remove(key: string): boolean;
  getAll(): Record<string, any>;
  reset(): void;
}

/**
 * 日志服务接口
 */
export interface ILogService {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error'): void;
}

// ============== 服务标识符 ==============

/**
 * 渲染服务标识符
 */
export const ICanvasRenderingService = createServiceIdentifier<ICanvasRenderingService>('canvasRenderingService');

/**
 * 交互服务标识符
 */
export const IInteractionService = createServiceIdentifier<IInteractionService>('interactionService');

/**
 * 历史服务标识符
 */
export const IHistoryService = createServiceIdentifier<IHistoryService>('historyService');

/**
 * 动画服务标识符
 */
export const IAnimationService = createServiceIdentifier<IAnimationService>('animationService');

/**
 * 事件总线服务标识符
 */
export const IEventBusService = createServiceIdentifier<IEventBusService>('eventBusService');

/**
 * 形状管理服务标识符
 */
export const IShapeService = createServiceIdentifier<IShapeService>('shapeService');

/**
 * 图层服务标识符
 */
export const ILayerService = createServiceIdentifier<ILayerService>('layerService');

/**
 * 选择服务标识符
 */
export const ISelectionService = createServiceIdentifier<ISelectionService>('selectionService');

/**
 * 视口服务标识符
 */
export const IViewportService = createServiceIdentifier<IViewportService>('viewportService');

/**
 * 工具服务标识符
 */
export const IToolService = createServiceIdentifier<IToolService>('toolService');

/**
 * 导入导出服务标识符
 */
export const IImportExportService = createServiceIdentifier<IImportExportService>('importExportService');

/**
 * 配置服务标识符
 */
export const IConfigurationService = createServiceIdentifier<IConfigurationService>('configurationService');

/**
 * 日志服务标识符
 */
export const ILogService = createServiceIdentifier<ILogService>('logService');

/**
 * CanvasSDK 服务标识符
 */
export const ICanvasSDK = createServiceIdentifier<any>('canvasSDK');
