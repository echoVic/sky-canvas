import { Point, Rect, RenderContext } from '../../types';
import {
  EventDispatcher,
  EventFactory,
  EventType,
  GestureEvent,
  InputState,
  MouseEvent
} from '../events/EventSystem';
import { GestureRecognizer } from '../events/GestureRecognizer';
import { Vector2 } from '../math';
import { Scene } from '../scene/Scene';
import { ISceneNode } from '../scene/SceneNode';
import { Viewport } from '../scene/Viewport';
import { CollisionDetector } from './CollisionDetection';
import { SelectionManager, SelectionMode } from './SelectionManager';

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
 * 交互工具接口
 */
export interface InteractionTool {
  name: string;
  mode: InteractionMode;
  cursor: string;
  enabled: boolean;
  
  onActivate(): void;
  onDeactivate(): void;
  onMouseDown(event: MouseEvent): boolean;
  onMouseMove(event: MouseEvent): boolean;
  onMouseUp(event: MouseEvent): boolean;
  onGesture(event: GestureEvent): boolean;
  onKeyDown(key: string): boolean;
  onKeyUp(key: string): boolean;
}

/**
 * 选择工具
 */
export class SelectTool implements InteractionTool {
  name = 'select';
  mode = InteractionMode.SELECT;
  cursor = 'default';
  enabled = true;

  private _manager: InteractionManager;
  private _isDragging = false;
  private _dragStart: Point | null = null;
  private _selectionRect: Rect | null = null;

  constructor(manager: InteractionManager) {
    this._manager = manager;
  }

  onActivate(): void {
    this._manager.setCursor(this.cursor);
  }

  onDeactivate(): void {
    this._isDragging = false;
    this._dragStart = null;
    this._selectionRect = null;
  }

  onMouseDown(event: MouseEvent): boolean {
    const worldPos = this._manager.screenToWorld(event.screenPosition);
    const hitNode = this._manager.hitTest(worldPos);

    if (hitNode) {
      // 选择节点
      const mode = event.ctrlKey ? SelectionMode.TOGGLE : 
                   event.shiftKey ? SelectionMode.ADDITIVE : 
                   SelectionMode.SINGLE;
      this._manager.select(hitNode, mode);
    } else {
      // 开始框选
      this._isDragging = true;
      this._dragStart = worldPos;
      
      if (!event.shiftKey && !event.ctrlKey) {
        this._manager.clearSelection();
      }
    }

    return true;
  }

  onMouseMove(event: MouseEvent): boolean {
    if (this._isDragging && this._dragStart) {
      const worldPos = this._manager.screenToWorld(event.screenPosition);
      
      // 更新选择框
      this._selectionRect = {
        x: Math.min(this._dragStart.x, worldPos.x),
        y: Math.min(this._dragStart.y, worldPos.y),
        width: Math.abs(worldPos.x - this._dragStart.x),
        height: Math.abs(worldPos.y - this._dragStart.y)
      };

      return true;
    }

    return false;
  }

  onMouseUp(event: MouseEvent): boolean {
    if (this._isDragging && this._selectionRect) {
      // 框选
      const mode = event.shiftKey ? SelectionMode.ADDITIVE : SelectionMode.MULTIPLE;
      this._manager.selectInBounds(this._selectionRect, mode);
      
      this._isDragging = false;
      this._dragStart = null;
      this._selectionRect = null;
      return true;
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onGesture(_event: GestureEvent): boolean {
    return false;
  }

  onKeyDown(key: string): boolean {
    if (key === 'Delete' || key === 'Backspace') {
      // 删除选中的节点
      const selected = this._manager.getSelectedNodes();
      for (const node of selected) {
        node.removeFromParent();
      }
      this._manager.clearSelection();
      return true;
    }

    return false;
  }

  onKeyUp(key: string): boolean {
    return false;
  }

  getSelectionRect(): Rect | null {
    return this._selectionRect;
  }
}

/**
 * 平移工具
 */
export class PanTool implements InteractionTool {
  name = 'pan';
  mode = InteractionMode.PAN;
  cursor = 'grab';
  enabled = true;

  private _manager: InteractionManager;
  private _isPanning = false;
  private _lastPosition: Point | null = null;

  constructor(manager: InteractionManager) {
    this._manager = manager;
  }

  onActivate(): void {
    this._manager.setCursor(this.cursor);
  }

  onDeactivate(): void {
    this._isPanning = false;
    this._lastPosition = null;
  }

  onMouseDown(event: MouseEvent): boolean {
    this._isPanning = true;
    this._lastPosition = event.screenPosition;
    this._manager.setCursor('grabbing');
    return true;
  }

  onMouseMove(event: MouseEvent): boolean {
    if (this._isPanning && this._lastPosition) {
      const delta = new Vector2(
        event.screenPosition.x - this._lastPosition.x,
        event.screenPosition.y - this._lastPosition.y
      );

      this._manager.panViewport(delta);
      this._lastPosition = event.screenPosition;
      return true;
    }

    return false;
  }

  onMouseUp(_event: MouseEvent): boolean {
    if (this._isPanning) {
      this._isPanning = false;
      this._lastPosition = null;
      this._manager.setCursor(this.cursor);
      return true;
    }

    return false;
  }

  onGesture(event: GestureEvent): boolean {
    if (event.type === EventType.GESTURE_CHANGE) {
      // 处理触摸平移
      this._manager.panViewport(event.deltaTranslation);
      return true;
    }

    return false;
  }

  onKeyDown(key: string): boolean {
    return false;
  }

  onKeyUp(key: string): boolean {
    return false;
  }
}

/**
 * 缩放工具
 */
export class ZoomTool implements InteractionTool {
  name = 'zoom';
  mode = InteractionMode.ZOOM;
  cursor = 'zoom-in';
  enabled = true;

  private _manager: InteractionManager;

  constructor(manager: InteractionManager) {
    this._manager = manager;
  }

  onActivate(): void {
    this._manager.setCursor(this.cursor);
  }

  onDeactivate(): void {
    // 无需清理
  }

  onMouseDown(event: MouseEvent): boolean {
    const worldPos = this._manager.screenToWorld(event.screenPosition);
    const zoomFactor = event.button === 0 ? 1.2 : 0.8; // 左键放大，右键缩小
    
    this._manager.zoomViewport(zoomFactor, worldPos);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMouseMove(_event: MouseEvent): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMouseUp(_event: MouseEvent): boolean {
    return false;
  }

  onGesture(event: GestureEvent): boolean {
    if (event.type === EventType.GESTURE_CHANGE && event.deltaScale !== 0) {
      const zoomFactor = 1 + event.deltaScale * 0.01;
      this._manager.zoomViewport(zoomFactor, event.center);
      return true;
    }

    return false;
  }

  onKeyDown(key: string): boolean {
    return false;
  }

  onKeyUp(key: string): boolean {
    return false;
  }
}

/**
 * 交互管理器
 */
export class InteractionManager extends EventDispatcher {
  private _canvas: HTMLCanvasElement | null = null;
  private _scene: Scene | null = null;
  private _viewport: Viewport | null = null;
  private _selectionManager: SelectionManager;
  private _collisionDetector: CollisionDetector;
  private _gestureRecognizer: GestureRecognizer;
  private _inputState: InputState;

  private _tools: Map<string, InteractionTool> = new Map();
  private _activeTool: InteractionTool | null = null;
  private _enabled: boolean = true;

  // 事件监听器
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _eventListeners: { [key: string]: (event: any) => void } = {};

  constructor() {
    super();
    
    this._selectionManager = new SelectionManager();
    this._collisionDetector = new CollisionDetector();
    this._gestureRecognizer = new GestureRecognizer();
    this._inputState = new InputState();

    // 注册默认工具
    this.registerTool(new SelectTool(this));
    this.registerTool(new PanTool(this));
    this.registerTool(new ZoomTool(this));

    // 设置默认工具
    this.setActiveTool('select');

    // 监听选择事件
    this._selectionManager.addEventListener(EventType.SELECTION_CHANGE, (event) => {
      this.dispatchEvent(event);
    });
  }

  // 初始化
  initialize(canvas: HTMLCanvasElement, scene: Scene, viewport: Viewport): void {
    this._canvas = canvas;
    this._scene = scene;
    this._viewport = viewport;

    this.setupEventListeners();
    this.updateCollisionNodes();
  }

  // 工具管理
  registerTool(tool: InteractionTool): void {
    this._tools.set(tool.name, tool);
  }

  unregisterTool(name: string): void {
    if (this._activeTool?.name === name) {
      this.setActiveTool(null);
    }
    this._tools.delete(name);
  }

  setActiveTool(name: string | null): boolean {
    if (this._activeTool) {
      this._activeTool.onDeactivate();
    }

    if (name && this._tools.has(name)) {
      this._activeTool = this._tools.get(name)!;
      this._activeTool.onActivate();
      return true;
    } else {
      this._activeTool = null;
      this.setCursor('default');
      return false;
    }
  }

  getActiveTool(): InteractionTool | null {
    return this._activeTool;
  }

  getTools(): InteractionTool[] {
    return Array.from(this._tools.values());
  }

  // 坐标转换
  screenToWorld(screenPoint: Point): Point {
    if (!this._viewport) return screenPoint;
    const worldPos = this._viewport.screenToWorld(screenPoint);
    return { x: worldPos.x, y: worldPos.y };
  }

  worldToScreen(worldPoint: Point): Point {
    if (!this._viewport) return worldPoint;
    const screenPos = this._viewport.worldToScreen(worldPoint);
    return { x: screenPos.x, y: screenPos.y };
  }

  // 碰撞检测
  hitTest(worldPoint: Point): ISceneNode | null {
    if (!this._scene) return null;
    return this._collisionDetector.pointTest(worldPoint);
  }

  hitTestAll(worldPoint: Point): ISceneNode[] {
    if (!this._scene) return [];
    return this._collisionDetector.pointTestAll(worldPoint);
  }

  // 选择管理
  select(node: ISceneNode | ISceneNode[], mode?: SelectionMode): boolean {
    return this._selectionManager.select(node, mode);
  }

  deselect(node: ISceneNode | ISceneNode[]): boolean {
    return this._selectionManager.deselect(node);
  }

  clearSelection(): boolean {
    return this._selectionManager.clearSelection();
  }

  selectInBounds(bounds: Rect, mode?: SelectionMode): boolean {
    if (!this._scene) return false;
    const nodes = this._collisionDetector.boundsTest(bounds);
    return this._selectionManager.select(nodes, mode);
  }

  getSelectedNodes(): ISceneNode[] {
    return this._selectionManager.getSelectedNodes();
  }

  isSelected(node: ISceneNode): boolean {
    return this._selectionManager.isSelected(node);
  }

  // 视口控制
  panViewport(delta: Vector2): void {
    if (!this._viewport) return;
    
    // 转换屏幕坐标的平移到世界坐标
    const worldDelta = delta.multiplyScalar(-1 / this._viewport.zoom);
    this._viewport.panBy(worldDelta);
  }

  zoomViewport(factor: number, center?: Point): void {
    if (!this._viewport) return;
    
    if (center) {
      const worldCenter = this._viewport.screenToWorld(center);
      this._viewport.setZoom(this._viewport.zoom * factor, { x: worldCenter.x, y: worldCenter.y });
    } else {
      this._viewport.setZoom(this._viewport.zoom * factor);
    }
  }

  // 光标管理
  setCursor(cursor: string): void {
    if (this._canvas) {
      this._canvas.style.cursor = cursor;
    }
  }

  // 事件处理
  private setupEventListeners(): void {
    if (!this._canvas) return;

    // 鼠标事件
    this._eventListeners.mousedown = this.handleMouseDown.bind(this);
    this._eventListeners.mousemove = this.handleMouseMove.bind(this);
    this._eventListeners.mouseup = this.handleMouseUp.bind(this);
    this._eventListeners.wheel = this.handleWheel.bind(this);
    this._eventListeners.contextmenu = this.handleContextMenu.bind(this);

    // 触摸事件
    this._eventListeners.touchstart = this.handleTouchStart.bind(this);
    this._eventListeners.touchmove = this.handleTouchMove.bind(this);
    this._eventListeners.touchend = this.handleTouchEnd.bind(this);
    this._eventListeners.touchcancel = this.handleTouchCancel.bind(this);

    // 键盘事件
    this._eventListeners.keydown = this.handleKeyDown.bind(this);
    this._eventListeners.keyup = this.handleKeyUp.bind(this);

    // 注册事件监听器
    for (const [type, listener] of Object.entries(this._eventListeners)) {
      if (type.startsWith('key')) {
        window.addEventListener(type, listener);
      } else {
        this._canvas.addEventListener(type, listener);
      }
    }

    // 手势事件
    this._gestureRecognizer.addEventListener(EventType.GESTURE_START, this.handleGesture.bind(this));
    this._gestureRecognizer.addEventListener(EventType.GESTURE_CHANGE, this.handleGesture.bind(this));
    this._gestureRecognizer.addEventListener(EventType.GESTURE_END, this.handleGesture.bind(this));
  }

  private handleMouseDown(nativeEvent: globalThis.MouseEvent): void {
    if (!this._enabled || !this._viewport) return;

    nativeEvent.preventDefault();
    
    const worldPos = this.screenToWorld({ x: nativeEvent.clientX, y: nativeEvent.clientY });
    const event = EventFactory.createMouseEvent(EventType.MOUSE_DOWN, nativeEvent, worldPos);
    
    this._inputState.setMousePosition(event.screenPosition);
    this._inputState.setMouseButtonDown(event.button);
    this._inputState.setModifiers({
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    });

    if (this._activeTool) {
      this._activeTool.onMouseDown(event);
    }

    this.dispatchEvent(event);
  }

  private handleMouseMove(nativeEvent: globalThis.MouseEvent): void {
    if (!this._enabled || !this._viewport) return;

    const worldPos = this.screenToWorld({ x: nativeEvent.clientX, y: nativeEvent.clientY });
    const event = EventFactory.createMouseEvent(EventType.MOUSE_MOVE, nativeEvent, worldPos);
    
    this._inputState.setMousePosition(event.screenPosition);

    if (this._activeTool) {
      this._activeTool.onMouseMove(event);
    }

    this.dispatchEvent(event);
  }

  private handleMouseUp(nativeEvent: globalThis.MouseEvent): void {
    if (!this._enabled || !this._viewport) return;

    const worldPos = this.screenToWorld({ x: nativeEvent.clientX, y: nativeEvent.clientY });
    const event = EventFactory.createMouseEvent(EventType.MOUSE_UP, nativeEvent, worldPos);
    
    this._inputState.setMouseButtonUp(event.button);

    if (this._activeTool) {
      this._activeTool.onMouseUp(event);
    }

    this.dispatchEvent(event);
  }

  private handleWheel(nativeEvent: WheelEvent): void {
    if (!this._enabled || !this._viewport) return;

    nativeEvent.preventDefault();
    
    const zoomFactor = nativeEvent.deltaY > 0 ? 0.9 : 1.1;
    const center = { x: nativeEvent.clientX, y: nativeEvent.clientY };
    this.zoomViewport(zoomFactor, center);
  }

  private handleContextMenu(nativeEvent: globalThis.MouseEvent): void {
    nativeEvent.preventDefault();
  }

  private handleTouchStart(nativeEvent: globalThis.TouchEvent): void {
    if (!this._enabled || !this._viewport) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.touches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_START, nativeEvent, worldPositions);
    this._gestureRecognizer.handleTouchStart(event);
    this.dispatchEvent(event);
  }

  private handleTouchMove(nativeEvent: globalThis.TouchEvent): void {
    if (!this._enabled || !this._viewport) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.touches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_MOVE, nativeEvent, worldPositions);
    this._gestureRecognizer.handleTouchMove(event);
    this.dispatchEvent(event);
  }

  private handleTouchEnd(nativeEvent: globalThis.TouchEvent): void {
    if (!this._enabled || !this._viewport) return;

    nativeEvent.preventDefault();
    
    const worldPositions = Array.from(nativeEvent.changedTouches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_END, nativeEvent, worldPositions);
    this._gestureRecognizer.handleTouchEnd(event);
    this.dispatchEvent(event);
  }

  private handleTouchCancel(nativeEvent: globalThis.TouchEvent): void {
    if (!this._enabled || !this._viewport) return;

    const worldPositions = Array.from(nativeEvent.changedTouches).map(touch => 
      this.screenToWorld({ x: touch.clientX, y: touch.clientY })
    );
    
    const event = EventFactory.createTouchEvent(EventType.TOUCH_CANCEL, nativeEvent, worldPositions);
    this._gestureRecognizer.handleTouchCancel(event);
    this.dispatchEvent(event);
  }

  private handleKeyDown(nativeEvent: KeyboardEvent): void {
    if (!this._enabled) return;

    this._inputState.setKeyDown(nativeEvent.key);
    
    if (this._activeTool) {
      this._activeTool.onKeyDown(nativeEvent.key);
    }
  }

  private handleKeyUp(nativeEvent: KeyboardEvent): void {
    if (!this._enabled) return;

    this._inputState.setKeyUp(nativeEvent.key);
    
    if (this._activeTool) {
      this._activeTool.onKeyUp(nativeEvent.key);
    }
  }

  private handleGesture(event: GestureEvent): void {
    if (!this._enabled) return;

    if (this._activeTool) {
      this._activeTool.onGesture(event);
    }

    this.dispatchEvent(event);
  }

  // 更新碰撞检测节点
  updateCollisionNodes(): void {
    if (!this._scene) return;

    this._collisionDetector.clear();
    
    const addNodeRecursive = (node: ISceneNode) => {
      if (node.visible && node.enabled) {
        this._collisionDetector.addNode(node);
      }
      
      for (const child of node.children) {
        addNodeRecursive(child);
      }
    };

    addNodeRecursive(this._scene);
  }

  // 渲染调试信息
  renderDebug(context: RenderContext): void {
    if (!this._enabled) return;

    const { ctx } = context;
    
    // 只在Canvas 2D上下文中渲染调试信息
    if (!(ctx instanceof CanvasRenderingContext2D)) {
      return;
    }
    
    // 渲染选择框
    const selectTool = this._tools.get('select') as SelectTool;
    if (selectTool) {
      const selectionRect = selectTool.getSelectionRect();
      if (selectionRect) {
        ctx.save();
        ctx.strokeStyle = '#007acc';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
        ctx.restore();
      }
    }

    // 渲染选中节点的边界框
    const selectedNodes = this.getSelectedNodes();
    for (const node of selectedNodes) {
      const bounds = node.getBounds();
      ctx.save();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.restore();
    }
  }

  // 启用/禁用
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this._selectionManager.enabled = enabled;
    this._collisionDetector.enabled = enabled;
    this._gestureRecognizer.setEnabled(enabled);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  // 获取管理器
  getSelectionManager(): SelectionManager {
    return this._selectionManager;
  }

  getCollisionDetector(): CollisionDetector {
    return this._collisionDetector;
  }

  getGestureRecognizer(): GestureRecognizer {
    return this._gestureRecognizer;
  }

  getInputState(): InputState {
    return this._inputState;
  }

  // 销毁
  dispose(): void {
    if (this._canvas) {
      // 移除事件监听器
      for (const [type, listener] of Object.entries(this._eventListeners)) {
        if (type.startsWith('key')) {
          window.removeEventListener(type, listener);
        } else {
          this._canvas.removeEventListener(type, listener);
        }
      }
    }

    this._selectionManager.removeAllListeners();
    this._collisionDetector.clear();
    this._gestureRecognizer.dispose();
    this._inputState.reset();

    if (this._activeTool) {
      this._activeTool.onDeactivate();
    }

    this._tools.clear();
    this.removeAllListeners();
  }
}
