/**
 * 交互管理器实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { 
  IInteractionManager, 
  IInteractionTool, 
  SelectionMode, 
  IMouseEvent, 
  ITouchEvent, 
  IGestureEvent 
} from './types';
import { EventDispatcher, EventFactory, GestureRecognizer, EventType } from './EventSystem';
import { SelectionManager } from './SelectionManager';
import { CollisionDetector } from './CollisionDetector';
import { SelectTool, PanTool, ZoomTool, DrawTool, RectangleTool, CircleTool, DiamondTool } from './tools';
import { IShape } from '../scene/IShape';

/**
 * 输入状态管理
 */
class InputState {
  private mousePosition: IPoint = { x: 0, y: 0 };
  private mouseButtons = new Set<number>();
  private keys = new Set<string>();
  private modifiers = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  };

  setMousePosition(position: IPoint): void {
    this.mousePosition = { ...position };
  }

  getMousePosition(): IPoint {
    return { ...this.mousePosition };
  }

  setMouseButtonDown(button: number): void {
    this.mouseButtons.add(button);
  }

  setMouseButtonUp(button: number): void {
    this.mouseButtons.delete(button);
  }

  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  setKeyDown(key: string): void {
    this.keys.add(key);
  }

  setKeyUp(key: string): void {
    this.keys.delete(key);
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  setModifiers(mods: Partial<typeof this.modifiers>): void {
    Object.assign(this.modifiers, mods);
  }

  getModifiers() {
    return { ...this.modifiers };
  }

  reset(): void {
    this.mouseButtons.clear();
    this.keys.clear();
    this.modifiers = { ctrl: false, shift: false, alt: false, meta: false };
  }
}

/**
 * 交互管理器
 */
export class InteractionManager extends EventDispatcher implements IInteractionManager {
  private canvas: HTMLCanvasElement | null = null;
  private selectionManager: SelectionManager;
  private collisionDetector: CollisionDetector;
  private gestureRecognizer: GestureRecognizer;
  private inputState: InputState;

  private tools = new Map<string, IInteractionTool>();
  private activeTool: IInteractionTool | null = null;
  private _enabled = true;

  // 坐标转换函数
  private screenToWorldFn: ((point: IPoint) => IPoint) | null = null;
  private worldToScreenFn: ((point: IPoint) => IPoint) | null = null;
  
  // 视口控制函数
  private panViewportFn: ((delta: IPoint) => void) | null = null;
  private zoomViewportFn: ((factor: number, center?: IPoint) => void) | null = null;

  private addShapeFn: ((shape: any) => void) | null = null;

  // 事件监听器
  private eventListeners: { [key: string]: (event: any) => void } = {};

  constructor() {
    super();
    
    this.selectionManager = new SelectionManager();
    this.collisionDetector = new CollisionDetector();
    this.gestureRecognizer = new GestureRecognizer();
    this.inputState = new InputState();

    // 监听选择事件
    this.selectionManager.addEventListener(EventType.SELECTION_CHANGE, (event: any) => {
      this.dispatchEvent(event);
    });
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupEventListeners();
    this.initializeDefaultTools();
    this.setActiveTool('select');
  }

  // 设置坐标转换函数
  setCoordinateTransforms(
    screenToWorld: (point: IPoint) => IPoint,
    worldToScreen: (point: IPoint) => IPoint
  ): void {
    this.screenToWorldFn = screenToWorld;
    this.worldToScreenFn = worldToScreen;
  }

  // 设置视口控制函数
  setViewportControls(
    panViewport: (delta: IPoint) => void,
    zoomViewport: (factor: number, center?: IPoint) => void
  ): void {
    this.panViewportFn = panViewport;
    this.zoomViewportFn = zoomViewport;
  }

  // 设置形状添加函数
  setShapeControls(addShape: (shape: any) => void): void {
    this.addShapeFn = addShape;
  }

  // 更新可交互对象
  updateInteractableItems(items: IShape[]): void {
    this.collisionDetector.updateItems(items);
  }

  private initializeDefaultTools(): void {
    // 注册默认工具
    this.registerTool(new SelectTool(this, this.setCursor.bind(this)));
    this.registerTool(new PanTool(
      this, 
      this.setCursor.bind(this),
      this.panViewport.bind(this)
    ));
    this.registerTool(new ZoomTool(
      this,
      this.setCursor.bind(this),
      this.zoomViewport.bind(this)
    ));
    this.registerTool(new DrawTool(
      this,
      this.setCursor.bind(this),
      (shape: any) => this.addShapeFn?.(shape)
    ));
    this.registerTool(new RectangleTool(
      this,
      this.setCursor.bind(this),
      (shape: any) => this.addShapeFn?.(shape)
    ));
    this.registerTool(new CircleTool(
      this,
      this.setCursor.bind(this),
      (shape: any) => this.addShapeFn?.(shape)
    ));
    this.registerTool(new DiamondTool(
      this,
      this.setCursor.bind(this),
      (shape: any) => this.addShapeFn?.(shape)
    ));
  }

  // 工具管理
  registerTool(tool: IInteractionTool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): void {
    if (this.activeTool?.name === name) {
      this.setActiveTool(null);
    }
    this.tools.delete(name);
  }

  setActiveTool(name: string | null): boolean {
    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    if (name && this.tools.has(name)) {
      this.activeTool = this.tools.get(name)!;
      this.activeTool.onActivate();
      return true;
    } else {
      this.activeTool = null;
      this.setCursor('default');
      return false;
    }
  }

  getActiveTool(): IInteractionTool | null {
    return this.activeTool;
  }

  // 坐标转换
  screenToWorld(screenPoint: IPoint): IPoint {
    return this.screenToWorldFn ? this.screenToWorldFn(screenPoint) : screenPoint;
  }

  worldToScreen(worldPoint: IPoint): IPoint {
    return this.worldToScreenFn ? this.worldToScreenFn(worldPoint) : worldPoint;
  }

  // 碰撞检测
  hitTest(worldPoint: IPoint): any | null {
    return this.collisionDetector.hitTest(worldPoint);
  }

  hitTestAll(worldPoint: IPoint): any[] {
    return this.collisionDetector.hitTestAll(worldPoint);
  }

  // 选择管理
  select(target: any | any[], mode?: SelectionMode): boolean {
    return this.selectionManager.select(target, mode);
  }

  deselect(target: any | any[]): boolean {
    return this.selectionManager.deselect(target);
  }

  clearSelection(): boolean {
    return this.selectionManager.clearSelection();
  }

  selectInBounds(bounds: { x: number; y: number; width: number; height: number }, mode?: SelectionMode): boolean {
    const items = this.collisionDetector.boundsTest(bounds);
    return this.selectionManager.select(items, mode);
  }

  getSelectedItems(): any[] {
    return this.selectionManager.getSelectedItems();
  }

  isSelected(target: any): boolean {
    return this.selectionManager.isSelected(target);
  }

  // 视口控制
  panViewport(delta: IPoint): void {
    if (this.panViewportFn) {
      this.panViewportFn(delta);
    }
  }

  zoomViewport(factor: number, center?: IPoint): void {
    if (this.zoomViewportFn) {
      this.zoomViewportFn(factor, center);
    }
  }

  // 光标管理
  setCursor(cursor: string): void {
    if (this.canvas) {
      this.canvas.style.cursor = cursor;
    }
  }

  // 事件处理
  private setupEventListeners(): void {
    if (!this.canvas) return;

    // 鼠标事件
    this.eventListeners.mousedown = this.handleMouseDown.bind(this);
    this.eventListeners.mousemove = this.handleMouseMove.bind(this);
    this.eventListeners.mouseup = this.handleMouseUp.bind(this);
    this.eventListeners.wheel = this.handleWheel.bind(this);
    this.eventListeners.contextmenu = this.handleContextMenu.bind(this);

    // 触摸事件
    this.eventListeners.touchstart = this.handleTouchStart.bind(this);
    this.eventListeners.touchmove = this.handleTouchMove.bind(this);
    this.eventListeners.touchend = this.handleTouchEnd.bind(this);
    this.eventListeners.touchcancel = this.handleTouchCancel.bind(this);

    // 键盘事件
    this.eventListeners.keydown = this.handleKeyDown.bind(this);
    this.eventListeners.keyup = this.handleKeyUp.bind(this);

    // 注册事件监听器
    for (const [type, listener] of Object.entries(this.eventListeners)) {
      if (type.startsWith('key')) {
        window.addEventListener(type, listener);
      } else {
        this.canvas.addEventListener(type, listener as EventListener);
      }
    }

    // 手势事件
    this.gestureRecognizer.addEventListener(EventType.GESTURE_START, this.handleGesture.bind(this));
    this.gestureRecognizer.addEventListener(EventType.GESTURE_CHANGE, this.handleGesture.bind(this));
    this.gestureRecognizer.addEventListener(EventType.GESTURE_END, this.handleGesture.bind(this));
  }

  private handleMouseDown(nativeEvent: MouseEvent): void {
    if (!this.enabled) return;

    nativeEvent.preventDefault();
    
    // 获取Canvas相对坐标
    const canvasRect = this.canvas?.getBoundingClientRect();
    const screenPos = {
      x: nativeEvent.clientX - (canvasRect?.left || 0),
      y: nativeEvent.clientY - (canvasRect?.top || 0)
    };
    const worldPos = this.screenToWorld(screenPos);
    const event = EventFactory.createMouseEvent(EventType.MOUSE_DOWN, nativeEvent, worldPos, screenPos);
    
    this.inputState.setMousePosition(event.screenPosition);
    this.inputState.setMouseButtonDown(event.button);
    this.inputState.setModifiers({
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    });

    if (this.activeTool) {
      this.activeTool.onMouseDown(event);
    }

    this.dispatchEvent(event);
  }

  private handleMouseMove(nativeEvent: MouseEvent): void {
    if (!this.enabled) return;

    // 获取Canvas相对坐标
    const canvasRect = this.canvas?.getBoundingClientRect();
    const screenPos = {
      x: nativeEvent.clientX - (canvasRect?.left || 0),
      y: nativeEvent.clientY - (canvasRect?.top || 0)
    };
    const worldPos = this.screenToWorld(screenPos);
    const event = EventFactory.createMouseEvent(EventType.MOUSE_MOVE, nativeEvent, worldPos, screenPos);
    
    this.inputState.setMousePosition(event.screenPosition);

    if (this.activeTool) {
      this.activeTool.onMouseMove(event);
    }

    this.dispatchEvent(event);
  }

  private handleMouseUp(nativeEvent: MouseEvent): void {
    if (!this.enabled) return;

    // 获取Canvas相对坐标
    const canvasRect = this.canvas?.getBoundingClientRect();
    const screenPos = {
      x: nativeEvent.clientX - (canvasRect?.left || 0),
      y: nativeEvent.clientY - (canvasRect?.top || 0)
    };
    const worldPos = this.screenToWorld(screenPos);
    const event = EventFactory.createMouseEvent(EventType.MOUSE_UP, nativeEvent, worldPos, screenPos);
    
    this.inputState.setMouseButtonUp(event.button);

    if (this.activeTool) {
      this.activeTool.onMouseUp(event);
    }

    this.dispatchEvent(event);
  }

  private handleWheel(nativeEvent: WheelEvent): void {
    if (!this.enabled) return;

    nativeEvent.preventDefault();
    
    const zoomFactor = nativeEvent.deltaY > 0 ? 0.9 : 1.1;
    const center = { x: nativeEvent.clientX, y: nativeEvent.clientY };
    this.zoomViewport(zoomFactor, center);
  }

  private handleContextMenu(nativeEvent: MouseEvent): void {
    nativeEvent.preventDefault();
  }

  private handleTouchStart(nativeEvent: TouchEvent): void {
    if (!this.enabled) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.touches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_START, nativeEvent, worldPositions);
    this.gestureRecognizer.handleTouchStart(event);
    this.dispatchEvent(event);
  }

  private handleTouchMove(nativeEvent: TouchEvent): void {
    if (!this.enabled) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.touches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_MOVE, nativeEvent, worldPositions);
    this.gestureRecognizer.handleTouchMove(event);
    this.dispatchEvent(event);
  }

  private handleTouchEnd(nativeEvent: TouchEvent): void {
    if (!this.enabled) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.changedTouches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_END, nativeEvent, worldPositions);
    this.gestureRecognizer.handleTouchEnd(event);
    this.dispatchEvent(event);
  }

  private handleTouchCancel(nativeEvent: TouchEvent): void {
    if (!this.enabled) return;

    const worldPositions = Array.from(nativeEvent.changedTouches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_CANCEL, nativeEvent, worldPositions);
    this.gestureRecognizer.handleTouchCancel(event);
    this.dispatchEvent(event);
  }

  private handleKeyDown(nativeEvent: KeyboardEvent): void {
    if (!this.enabled) return;

    this.inputState.setKeyDown(nativeEvent.key);
    
    if (this.activeTool) {
      this.activeTool.onKeyDown(nativeEvent.key);
    }
  }

  private handleKeyUp(nativeEvent: KeyboardEvent): void {
    if (!this.enabled) return;

    this.inputState.setKeyUp(nativeEvent.key);
    
    if (this.activeTool) {
      this.activeTool.onKeyUp(nativeEvent.key);
    }
  }

  private handleGesture(event: IGestureEvent): void {
    if (!this.enabled) return;

    if (this.activeTool) {
      this.activeTool.onGesture(event);
    }

    this.dispatchEvent(event);
  }

  // 启用/禁用
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.selectionManager.enabled = enabled;
    this.collisionDetector.enabled = enabled;
    this.gestureRecognizer.setEnabled(enabled);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  // 获取管理器
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector;
  }

  getGestureRecognizer(): GestureRecognizer {
    return this.gestureRecognizer;
  }

  getInputState(): InputState {
    return this.inputState;
  }

  // 销毁
  dispose(): void {
    if (this.canvas) {
      // 移除事件监听器
      for (const [type, listener] of Object.entries(this.eventListeners)) {
        if (type.startsWith('key')) {
          window.removeEventListener(type, listener);
        } else {
          this.canvas.removeEventListener(type, listener as EventListener);
        }
      }
    }

    this.selectionManager.removeAllListeners();
    this.collisionDetector.clear();
    this.gestureRecognizer.dispose();
    this.inputState.reset();

    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    this.tools.clear();
    this.removeAllListeners();
  }
}