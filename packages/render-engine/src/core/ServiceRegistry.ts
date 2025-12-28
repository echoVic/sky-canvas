/**
 * 服务注册表 - 统一管理所有系统服务
 * 基于VSCode的服务注册机制
 */

import { ServiceCollection, createDecorator } from './ServiceCollection';

// 核心服务接口定义
export const ICanvasService = createDecorator<ICanvasService>('canvasService');
export const IRenderEngineService = createDecorator<IRenderEngineService>('renderEngineService');
export const IInteractionService = createDecorator<IInteractionService>('interactionService');
export const IConfigurationService = createDecorator<IConfigurationService>('configurationService');
export const IEventBusService = createDecorator<IEventBusService>('eventBusService');
export const IExtensionService = createDecorator<IExtensionService>('extensionService');

// 业务服务接口定义
export const ISceneService = createDecorator<ISceneService>('sceneService');
export const ISelectionService = createDecorator<ISelectionService>('selectionService');
export const IHistoryService = createDecorator<IHistoryService>('historyService');
export const IToolService = createDecorator<IToolService>('toolService');

// 渲染服务接口定义 - forward declarations
interface IWebGLRenderer {
  initialize(): Promise<void>;
  render(scene: any): void;
  dispose(): void;
}

interface IWebGPURenderer {
  initialize(): Promise<void>;
  render(scene: any): void;
  dispose(): void;
}

interface ICanvas2DRenderer {
  initialize(): Promise<void>;
  render(scene: any): void;
  dispose(): void;
}

export const IWebGLRenderer = createDecorator<IWebGLRenderer>('webglRenderer');
export const IWebGPURenderer = createDecorator<IWebGPURenderer>('webgpuRenderer');
export const ICanvas2DRenderer = createDecorator<ICanvas2DRenderer>('canvas2dRenderer');

// 服务接口定义
export interface ICanvasService {
  initialize(): Promise<void>;
  createCanvas(container: HTMLElement): ICanvas;
  getActiveCanvas(): ICanvas | undefined;
  dispose(): void;
}

export interface IRenderEngineService {
  initialize(): Promise<void>;
  createRenderer(type: 'webgl' | 'webgpu' | 'canvas2d'): Promise<IRenderer>;
  getActiveRenderer(): IRenderer | undefined;
  requestRender(): void;
}

export interface IInteractionService {
  initialize(): Promise<void>;
  attachToCanvas(canvas: ICanvas): void;
  detachFromCanvas(canvas: ICanvas): void;
  getCurrentTool(): ITool | undefined;
  setTool(tool: ITool): void;
}

export interface IConfigurationService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
  onDidChangeConfiguration: IEvent<IConfigurationChangeEvent>;
}

export interface IEventBusService {
  emit<T>(eventName: string, data: T): void;
  on<T>(eventName: string, listener: (data: T) => void): IDisposable;
  once<T>(eventName: string, listener: (data: T) => void): IDisposable;
}

export interface IExtensionService {
  initialize(): Promise<void>;
  activateExtension(extensionId: string): Promise<void>;
  deactivateExtension(extensionId: string): Promise<void>;
  getExtension(extensionId: string): IExtension | undefined;
  getAllExtensions(): IExtension[];
}

export interface ISceneService {
  createScene(name: string): IScene;
  getActiveScene(): IScene | undefined;
  setActiveScene(scene: IScene): void;
  getAllScenes(): IScene[];
  deleteScene(sceneId: string): void;
}

export interface ISelectionService {
  getSelection(): IShape[];
  setSelection(shapes: IShape[]): void;
  addToSelection(shape: IShape): void;
  removeFromSelection(shape: IShape): void;
  clearSelection(): void;
  onSelectionChanged: IEvent<ISelectionChangedEvent>;
}

export interface IHistoryService {
  execute(command: ICommand): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export interface IToolService {
  registerTool(tool: ITool): void;
  unregisterTool(toolId: string): void;
  getTool(toolId: string): ITool | undefined;
  getAllTools(): ITool[];
  getActiveTool(): ITool | undefined;
  setActiveTool(toolId: string): void;
}

// 基础类型定义
export interface ICanvas {
  readonly id: string;
  readonly element: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D | WebGLRenderingContext | any; // WebGPU context
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface IRenderer {
  readonly type: string;
  initialize(): Promise<void>;
  render(scene: IScene, viewport: IViewport): void;
  dispose(): void;
}

export interface IScene {
  readonly id: string;
  readonly name: string;
  readonly shapes: ReadonlyArray<IShape>;
  addShape(shape: IShape): void;
  removeShape(shape: IShape): void;
  findShapeById(id: string): IShape | undefined;
  clear(): void;
}

export interface IShape {
  readonly id: string;
  readonly type: string;
  position: Vector2;
  readonly bounds: Rectangle;
  contains(point: Vector2): boolean;
  intersects(bounds: Rectangle): boolean;
  clone(): IShape;
  serialize(): any;
}

export interface ITool {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly category: string;
  activate(): void;
  deactivate(): void;
  onMouseDown?(event: IMouseEvent): void;
  onMouseMove?(event: IMouseEvent): void;
  onMouseUp?(event: IMouseEvent): void;
}

export interface IExtension {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly manifest: IExtensionManifest;
  activate(context: IExtensionContext): Promise<void>;
  deactivate(): Promise<void>;
}

export interface ICommand {
  readonly id: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

export interface IEvent<T> {
  (listener: (e: T) => any, thisArg?: any, disposables?: IDisposable[]): IDisposable;
}

export interface IDisposable {
  dispose(): void;
}

export interface IViewport {
  readonly bounds: Rectangle;
  readonly zoom: number;
  readonly center: Vector2;
  worldToScreen(point: Vector2): Vector2;
  screenToWorld(point: Vector2): Vector2;
}

// 基础数学类型
export interface Vector2 {
  x: number;
  y: number;
  clone(): Vector2;
  add(other: Vector2): Vector2;
  subtract(other: Vector2): Vector2;
  multiply(scalar: number): Vector2;
  length(): number;
  normalize(): Vector2;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  contains(point: Vector2): boolean;
  intersects(other: Rectangle): boolean;
  union(other: Rectangle): Rectangle;
}

// 事件类型定义
export interface ISelectionChangedEvent {
  readonly selection: ReadonlyArray<IShape>;
  readonly previousSelection: ReadonlyArray<IShape>;
}

export interface IConfigurationChangeEvent {
  readonly affectsConfiguration: (section: string) => boolean;
}

export interface IMouseEvent {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export interface IExtensionManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly main: string;
  readonly contributes: any;
}

export interface IExtensionContext {
  readonly subscriptions: IDisposable[];
  readonly workspaceState: any;
  readonly globalState: any;
  readonly extensionPath: string;
  asAbsolutePath(relativePath: string): string;
}

/**
 * 服务注册表 - 注册所有系统服务
 */
export class ServiceRegistry {
  static registerServices(services: ServiceCollection): void {
    // 核心服务注册将在具体实现类中完成
    // 这里只定义接口和注册结构
  }
}
