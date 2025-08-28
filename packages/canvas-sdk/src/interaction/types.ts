/**
 * 交互系统核心接口
 */
import { IPoint } from '@sky-canvas/render-engine';

/**
 * 交互模式枚举
 */
export enum InteractionMode {
  SELECT = 'select',
  PAN = 'pan',
  ZOOM = 'zoom',
  DRAW = 'draw',
  EDIT = 'edit',
  NONE = 'none'
}

/**
 * 选择模式枚举
 */
export enum SelectionMode {
  SINGLE = 'single',      // 单选
  MULTIPLE = 'multiple',  // 多选
  ADDITIVE = 'additive',  // 添加式选择
  TOGGLE = 'toggle'       // 切换选择
}

/**
 * 鼠标事件接口
 */
export interface IMouseEvent {
  type: string;
  screenPosition: IPoint;
  worldPosition: IPoint;
  button: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  timestamp: number;
}

/**
 * 触摸事件接口
 */
export interface ITouchEvent {
  type: string;
  touches: IPoint[];
  timestamp: number;
}

/**
 * 手势事件接口
 */
export interface IGestureEvent {
  type: string;
  center: IPoint;
  deltaTranslation: IPoint;
  deltaScale: number;
  deltaRotation: number;
  timestamp: number;
}

/**
 * 交互工具接口
 */
export interface IInteractionTool {
  name: string;
  mode: InteractionMode;
  cursor: string;
  enabled: boolean;
  
  onActivate(): void;
  onDeactivate(): void;
  onMouseDown(event: IMouseEvent): boolean;
  onMouseMove(event: IMouseEvent): boolean;
  onMouseUp(event: IMouseEvent): boolean;
  onGesture(event: IGestureEvent): boolean;
  onKeyDown(key: string): boolean;
  onKeyUp(key: string): boolean;
}

/**
 * 碰撞检测接口
 */
export interface ICollisionDetector {
  hitTest(point: IPoint): any | null;
  hitTestAll(point: IPoint): any[];
  boundsTest(bounds: { x: number; y: number; width: number; height: number }): any[];
  clear(): void;
  enabled: boolean;
}

/**
 * 选择管理器接口
 */
export interface ISelectionManager {
  select(target: any | any[], mode?: SelectionMode): boolean;
  deselect(target: any | any[]): boolean;
  clearSelection(): boolean;
  getSelectedItems(): any[];
  isSelected(target: any): boolean;
  enabled: boolean;
}

/**
 * 交互管理器接口
 */
export interface IInteractionManager {
  // 初始化
  initialize(canvas: HTMLCanvasElement): void;
  
  // 工具管理
  registerTool(tool: IInteractionTool): void;
  unregisterTool(name: string): void;
  setActiveTool(name: string | null): boolean;
  getActiveTool(): IInteractionTool | null;
  
  // 坐标转换
  screenToWorld(screenPoint: IPoint): IPoint;
  worldToScreen(worldPoint: IPoint): IPoint;
  
  // 碰撞检测
  hitTest(worldPoint: IPoint): any | null;
  hitTestAll(worldPoint: IPoint): any[];
  
  // 选择管理
  select(target: any | any[], mode?: SelectionMode): boolean;
  deselect(target: any | any[]): boolean;
  clearSelection(): boolean;
  getSelectedItems(): any[];
  isSelected(target: any): boolean;
  
  // 视口控制
  panViewport(delta: IPoint): void;
  zoomViewport(factor: number, center?: IPoint): void;
  
  // 光标管理
  setCursor(cursor: string): void;
  
  // 启用/禁用
  setEnabled(enabled: boolean): void;
  get enabled(): boolean;
  
  // 事件监听
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  
  // 销毁
  dispose(): void;
}