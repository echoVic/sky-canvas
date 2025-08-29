/**
 * 画板SDK核心实现 - 集成交互系统
 */
import { 
  RenderEngine, 
  IRenderLayer, 
  IPoint, 
  IGraphicsContextFactory
  // AdapterFactory  // 暂时注释以避免构建错误
} from '@sky-canvas/render-engine';
import { IShape, IShapeUpdate, IShapeEvent, IShapeSelectionEvent } from '../scene/IShape';
import { EventEmitter } from '../events/EventEmitter';
import { HistoryManager } from '../core/HistoryManager';
import { 
  InteractionManager, 
  IInteractionManager, 
  IInteractionTool, 
  SelectionMode,
  InteractionMode
} from '../interaction';

/**
 * 渲染引擎类型
 */
export type RenderEngineType = 'webgl' | 'canvas2d' | 'webgpu';

/**
 * SDK配置选项
 */
export interface ICanvasSDKConfig {
  renderEngine?: RenderEngineType;
  enableInteraction?: boolean;
  viewport?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zoom?: number;
  };
}

/**
 * SDK事件类型
 */
export interface ICanvasSDKEvents {
  'shapeAdded': IShapeEvent;
  'shapeRemoved': IShapeEvent;
  'shapeUpdated': IShapeEvent;
  'shapeSelected': IShapeSelectionEvent;
  'shapeDeselected': IShapeSelectionEvent;
  'selectionCleared': {};
  'interactionModeChanged': { mode: InteractionMode };
  'viewportChanged': { viewport: any; oldViewport?: any };
  'mousedown': any;
  'mousemove': any;
}

/**
 * 画板SDK核心类 - 集成交互系统
 */
export class CanvasSDK extends EventEmitter<ICanvasSDKEvents> {
  private renderEngine: RenderEngine | null = null;
  private interactionManager: IInteractionManager | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private shapes: Map<string, IShape> = new Map();
  private layers: Map<string, IRenderLayer> = new Map();
  private selectedShapes: Set<string> = new Set();
  private historyManager: HistoryManager = new HistoryManager();
  private isInitializedFlag = false;
  private config: ICanvasSDKConfig = {};

  // 视口状态
  private viewport = {
    x: 0,
    y: 0, 
    width: 800,
    height: 600,
    zoom: 1
  };

  /**
   * 初始化SDK
   * @param canvas 画布元素
   * @param config 配置选项
   */
  async initialize(canvas: HTMLCanvasElement, config: ICanvasSDKConfig = {}): Promise<void> {
    if (this.isInitializedFlag) {
      throw new Error('Canvas SDK already initialized');
    }

    if (!canvas) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvas;
    this.config = {
      renderEngine: 'webgl',
      enableInteraction: true,
      ...config
    };

    // 更新视口
    if (config.viewport) {
      Object.assign(this.viewport, config.viewport);
    } else {
      this.viewport.width = canvas.width || canvas.offsetWidth;
      this.viewport.height = canvas.height || canvas.offsetHeight;
    }

    // 初始化渲染引擎
    await this.initializeRenderEngine();

    // 初始化交互系统
    if (this.config.enableInteraction) {
      await this.initializeInteraction();
    }
    
    this.isInitializedFlag = true;
    console.log('Canvas SDK initialized with:', this.config);
  }

  private async initializeRenderEngine(): Promise<void> {
    if (!this.canvas) throw new Error('Canvas not available');

    this.renderEngine = new RenderEngine({
      targetFPS: 60,
      enableVSync: true,
      enableCulling: true
    });

    // 选择图形上下文工厂 - 临时内联实现
    let factory: IGraphicsContextFactory<HTMLCanvasElement> | null = null;
    switch (this.config.renderEngine) {
      case 'webgl':
        // 创建临时的 WebGL 工厂
        factory = {
          isSupported: () => {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              return !!gl;
            } catch {
              return false;
            }
          },
          createContext: async (canvas: HTMLCanvasElement) => {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl || !(gl instanceof WebGLRenderingContext)) {
              throw new Error('WebGL not supported');
            }
            // 返回一个简单的图形上下文对象
            return {
              width: canvas.width,
              height: canvas.height,
              clear: (color?: string) => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
              },
              save: () => {},
              restore: () => {},
              translate: () => {},
              rotate: () => {},
              scale: () => {},
              setOpacity: () => {},
              setStrokeStyle: () => {},
              setFillStyle: () => {},
              setLineWidth: () => {},
              setLineDash: () => {},
              drawRect: () => {},
              drawCircle: () => {},
              drawLine: () => {},
              drawImage: () => {},
              screenToWorld: (point: any) => point,
              worldToScreen: (point: any) => point,
              dispose: () => {}
            };
          }
        };
        console.log('Using temporary WebGL adapter');
        break;
      case 'canvas2d':
        console.warn('Canvas2D adapter temporarily disabled');
        break;
      case 'webgpu':
        console.warn('WebGPU not implemented, adapter temporarily disabled');
        // factory = AdapterFactory.createWebGLAdapter();
        break;
      default:
        // 默认使用 WebGL，复用上面的工厂代码
        factory = {
          isSupported: () => {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              return !!gl;
            } catch {
              return false;
            }
          },
          createContext: async (canvas: HTMLCanvasElement) => {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl || !(gl instanceof WebGLRenderingContext)) {
              throw new Error('WebGL not supported');
            }
            return {
              width: canvas.width,
              height: canvas.height,
              clear: (color?: string) => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
              },
              save: () => {},
              restore: () => {},
              translate: () => {},
              rotate: () => {},
              scale: () => {},
              setOpacity: () => {},
              setStrokeStyle: () => {},
              setFillStyle: () => {},
              setLineWidth: () => {},
              setLineDash: () => {},
              drawRect: () => {},
              drawCircle: () => {},
              drawLine: () => {},
              drawImage: () => {},
              screenToWorld: (point: any) => point,
              worldToScreen: (point: any) => point,
              dispose: () => {}
            };
          }
        };
        console.log('Using default temporary WebGL adapter');
    }

    if (factory) {
      await this.renderEngine.initialize(factory, this.canvas);
      this.renderEngine.setViewport(this.viewport);
    } else {
      console.warn('No graphics adapter available, rendering disabled');
    }
  }

  private async initializeInteraction(): Promise<void> {
    if (!this.canvas) throw new Error('Canvas not available');

    this.interactionManager = new InteractionManager();
    this.interactionManager.initialize(this.canvas);

    // 设置坐标转换函数
    this.interactionManager.setCoordinateTransforms(
      this.screenToWorld.bind(this),
      this.worldToScreen.bind(this)
    );

    // 设置视口控制函数
    this.interactionManager.setViewportControls(
      this.panViewport.bind(this),
      this.zoomViewport.bind(this)
    );

    // 设置形状控制函数
    this.interactionManager.setShapeControls(this.addShape.bind(this));

    // 监听交互事件
    this.setupInteractionEvents();

    // 更新可交互对象
    this.updateInteractableItems();
  }

  private setupInteractionEvents(): void {
    if (!this.interactionManager) return;

    // 监听选择变化事件
    this.interactionManager.addEventListener('selectionchange', (event) => {
      this.handleSelectionChange(event);
    });

    // 监听其他交互事件
    this.interactionManager.addEventListener('mousedown', (event) => {
      this.emit('mousedown', event);
    });

    this.interactionManager.addEventListener('mousemove', (event) => {
      this.emit('mousemove', event);
    });
  }

  private handleSelectionChange(event: any): void {
    // 同步SDK内部选择状态与交互管理器
    this.selectedShapes.clear();
    const selectedItems = event.selected || [];
    
    selectedItems.forEach((item: IShape) => {
      this.selectedShapes.add(item.id);
    });

    // 发出相应事件
    if (selectedItems.length === 0) {
      this.emit('selectionCleared', {});
    } else {
      selectedItems.forEach((shape: IShape) => {
        this.emit('shapeSelected', { shape, selected: true });
      });
    }
  }

  private updateInteractableItems(): void {
    if (!this.interactionManager) return;
    
    const shapes = Array.from(this.shapes.values());
    this.interactionManager.updateInteractableItems(shapes);
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  // === 形状管理 ===

  /**
   * 添加形状
   * @param shape 形状对象
   */
  addShape(shape: IShape): void {
    this.shapes.set(shape.id, shape);
    
    // 记录历史
    this.historyManager.execute({
      execute: () => this.shapes.set(shape.id, shape),
      undo: () => this.shapes.delete(shape.id)
    });

    // 更新可交互对象
    this.updateInteractableItems();

    this.emit('shapeAdded', { shape });
  }

  /**
   * 移除形状
   * @param id 形状ID
   */
  removeShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      this.shapes.delete(id);
      this.selectedShapes.delete(id);
      
      // 记录历史
      this.historyManager.execute({
        execute: () => {
          this.shapes.delete(id);
          this.selectedShapes.delete(id);
        },
        undo: () => this.shapes.set(id, shape)
      });

      // 更新可交互对象
      this.updateInteractableItems();

      shape.dispose();
      this.emit('shapeRemoved', { shape });
    }
  }

  /**
   * 获取形状
   * @param id 形状ID
   */
  getShape(id: string): IShape | undefined {
    return this.shapes.get(id);
  }

  /**
   * 获取所有形状
   */
  getShapes(): IShape[] {
    return Array.from(this.shapes.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 更新形状
   * @param id 形状ID
   * @param updates 更新数据
   */
  updateShape(id: string, updates: IShapeUpdate): void {
    const shape = this.shapes.get(id);
    if (shape) {
      const oldData = {
        position: { ...shape.position },
        size: { ...shape.size },
        visible: shape.visible,
        zIndex: shape.zIndex
      };

      // 应用更新
      if (updates.position) {
        shape.position = { ...shape.position, ...updates.position };
      }
      if (updates.size) {
        shape.size = { ...shape.size, ...updates.size };
      }
      if (updates.visible !== undefined) {
        shape.visible = updates.visible;
      }
      if (updates.zIndex !== undefined) {
        shape.zIndex = updates.zIndex;
      }

      // 记录历史
      this.historyManager.execute({
        execute: () => {
          if (updates.position) {
            shape.position = { ...shape.position, ...updates.position };
          }
          if (updates.size) {
            shape.size = { ...shape.size, ...updates.size };
          }
          if (updates.visible !== undefined) {
            shape.visible = updates.visible;
          }
          if (updates.zIndex !== undefined) {
            shape.zIndex = updates.zIndex;
          }
        },
        undo: () => {
          shape.position = oldData.position;
          shape.size = oldData.size;
          shape.visible = oldData.visible;
          shape.zIndex = oldData.zIndex;
        }
      });

      this.emit('shapeUpdated', { shape });
    }
  }

  /**
   * 清空所有形状
   */
  clearShapes(): void {
    const shapesToRemove = Array.from(this.shapes.values());
    
    for (const shape of shapesToRemove) {
      shape.dispose();
    }
    
    this.shapes.clear();
    this.selectedShapes.clear();
    
    // 记录历史
    this.historyManager.execute({
      execute: () => {
        this.shapes.clear();
        this.selectedShapes.clear();
      },
      undo: () => {
        for (const shape of shapesToRemove) {
          this.shapes.set(shape.id, shape);
        }
      }
    });
  }

  // === 图层管理 ===

  /**
   * 创建图层
   * @param id 图层ID
   * @param zIndex Z轴层级
   */
  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    if (!this.renderEngine) {
      throw new Error('SDK not initialized');
    }

    const layer = this.renderEngine.createLayer(id, zIndex);
    this.layers.set(id, layer);
    return layer;
  }

  /**
   * 获取图层
   * @param id 图层ID
   */
  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id);
  }

  /**
   * 移除图层
   * @param id 图层ID
   */
  removeLayer(id: string): void {
    if (this.renderEngine) {
      this.renderEngine.removeLayer(id);
    }
    this.layers.delete(id);
  }

  /**
   * 获取所有图层
   */
  getLayers(): IRenderLayer[] {
    return Array.from(this.layers.values());
  }

  // === 选择系统 ===

  /**
   * 选择形状
   * @param id 形状ID
   */
  selectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      this.selectedShapes.add(id);
      this.emit('shapeSelected', { shape, selected: true });
    }
  }

  /**
   * 取消选择形状
   * @param id 形状ID
   */
  deselectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape && this.selectedShapes.has(id)) {
      this.selectedShapes.delete(id);
      this.emit('shapeDeselected', { shape, selected: false });
    }
  }

  /**
   * 清空所有选择
   */
  clearSelection(): void {
    this.selectedShapes.clear();
    this.emit('selectionCleared', {});
  }

  /**
   * 检查形状是否被选中
   * @param id 形状ID
   */
  isSelected(id: string): boolean {
    return this.selectedShapes.has(id);
  }

  /**
   * 获取所有被选中的形状
   */
  getSelectedShapes(): IShape[] {
    return Array.from(this.selectedShapes)
      .map(id => this.shapes.get(id))
      .filter((shape): shape is IShape => shape !== undefined);
  }

  // === 点击测试 ===

  /**
   * 点击测试
   * @param point 测试点
   */
  hitTest(point: IPoint): IShape | null {
    // 从上到下测试形状（按zIndex倒序）
    const sortedShapes = this.getShapes().reverse();
    
    for (const shape of sortedShapes) {
      if (shape.visible && shape.hitTest(point)) {
        return shape;
      }
    }
    
    return null;
  }

  // === 历史记录 ===

  /**
   * 撤销操作
   */
  undo(): void {
    this.historyManager.undo();
  }

  /**
   * 重做操作
   */
  redo(): void {
    this.historyManager.redo();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  // === 交互系统API ===

  /**
   * 获取交互管理器
   */
  getInteractionManager(): IInteractionManager | null {
    return this.interactionManager;
  }

  /**
   * 设置交互模式
   * @param mode 交互模式
   */
  setInteractionMode(mode: InteractionMode): boolean {
    if (!this.interactionManager) return false;

    let toolName: string | null = null;
    switch (mode) {
      case InteractionMode.SELECT:
        toolName = 'select';
        break;
      case InteractionMode.PAN:
        toolName = 'pan';
        break;
      case InteractionMode.ZOOM:
        toolName = 'zoom';
        break;
      case InteractionMode.DRAW:
        toolName = 'draw';
        break;
      case InteractionMode.NONE:
        toolName = null;
        break;
      default:
        return false;
    }

    const success = this.interactionManager.setActiveTool(toolName);
    if (success) {
      this.emit('interactionModeChanged', { mode });
    }
    return success;
  }

  /**
   * 直接设置工具（按工具名称）
   * @param toolName 工具名称
   * @returns 是否设置成功
   */
  setTool(toolName: string | null): boolean {
    if (!this.interactionManager) return false;

    const success = this.interactionManager.setActiveTool(toolName);
    if (success) {
      // 根据工具名称推断交互模式
      let mode = InteractionMode.NONE;
      switch (toolName) {
        case 'select':
          mode = InteractionMode.SELECT;
          break;
        case 'pan':
          mode = InteractionMode.PAN;
          break;
        case 'zoom':
          mode = InteractionMode.ZOOM;
          break;
        case 'draw':
        case 'rectangle':
        case 'circle':
        case 'diamond':
          mode = InteractionMode.DRAW;
          break;
      }
      this.emit('interactionModeChanged', { mode });
    }
    return success;
  }

  /**
   * 获取当前交互模式
   */
  getInteractionMode(): InteractionMode {
    if (!this.interactionManager) return InteractionMode.NONE;
    
    const activeTool = this.interactionManager.getActiveTool();
    return activeTool ? activeTool.mode : InteractionMode.NONE;
  }

  /**
   * 注册自定义交互工具
   * @param tool 交互工具
   */
  registerInteractionTool(tool: IInteractionTool): void {
    if (this.interactionManager) {
      this.interactionManager.registerTool(tool);
    }
  }

  /**
   * 注销交互工具
   * @param name 工具名称
   */
  unregisterInteractionTool(name: string): void {
    if (this.interactionManager) {
      this.interactionManager.unregisterTool(name);
    }
  }

  /**
   * 启用/禁用交互系统
   * @param enabled 是否启用
   */
  setInteractionEnabled(enabled: boolean): void {
    if (this.interactionManager) {
      this.interactionManager.setEnabled(enabled);
    }
  }

  /**
   * 检查交互系统是否启用
   */
  isInteractionEnabled(): boolean {
    return this.interactionManager ? this.interactionManager.enabled : false;
  }

  // === 视口控制API ===

  /**
   * 获取视口信息
   */
  getViewport() {
    return { ...this.viewport };
  }

  /**
   * 设置视口
   * @param viewport 视口参数
   */
  setViewport(viewport: Partial<typeof this.viewport>): void {
    const oldViewport = { ...this.viewport };
    Object.assign(this.viewport, viewport);
    
    // 更新渲染引擎视口
    if (this.renderEngine) {
      this.renderEngine.setViewport(this.viewport);
    }

    this.emit('viewportChanged', { 
      viewport: this.viewport,
      oldViewport 
    });
  }

  /**
   * 平移视口
   * @param delta 平移量
   */
  panViewport(delta: IPoint): void {
    // 转换屏幕坐标的平移到世界坐标
    const worldDelta = {
      x: -delta.x / this.viewport.zoom,
      y: -delta.y / this.viewport.zoom
    };
    
    this.setViewport({
      x: this.viewport.x + worldDelta.x,
      y: this.viewport.y + worldDelta.y
    });
  }

  /**
   * 缩放视口
   * @param factor 缩放因子
   * @param center 缩放中心点（屏幕坐标）
   */
  zoomViewport(factor: number, center?: IPoint): void {
    const newZoom = Math.max(0.1, Math.min(10, this.viewport.zoom * factor));
    
    if (center) {
      // 以指定点为中心缩放
      const worldCenter = this.screenToWorld(center);
      const zoomRatio = newZoom / this.viewport.zoom;
      
      this.setViewport({
        zoom: newZoom,
        x: worldCenter.x - (worldCenter.x - this.viewport.x) * zoomRatio,
        y: worldCenter.y - (worldCenter.y - this.viewport.y) * zoomRatio
      });
    } else {
      // 以视口中心缩放
      this.setViewport({ zoom: newZoom });
    }
  }

  /**
   * 适应到内容
   */
  fitToContent(): void {
    const shapes = this.getShapes();
    if (shapes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // 计算内容边界
    shapes.forEach(shape => {
      const bounds = shape.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 计算合适的缩放比例
    const zoomX = this.viewport.width / contentWidth;
    const zoomY = this.viewport.height / contentHeight;
    const zoom = Math.min(zoomX, zoomY) * 0.9; // 留一些边距

    this.setViewport({
      x: minX - (this.viewport.width / zoom - contentWidth) / 2,
      y: minY - (this.viewport.height / zoom - contentHeight) / 2,
      zoom: zoom
    });
  }

  /**
   * 重置视口到默认状态
   */
  resetViewport(): void {
    this.setViewport({
      x: 0,
      y: 0,
      zoom: 1
    });
  }

  // === 坐标转换API ===

  /**
   * 屏幕坐标转世界坐标
   * @param screenPoint 屏幕坐标点
   */
  screenToWorld(screenPoint: IPoint): IPoint {
    if (this.renderEngine) {
      return this.renderEngine.screenToWorld(screenPoint);
    }
    
    // 简化实现
    return {
      x: (screenPoint.x + this.viewport.x) / this.viewport.zoom,
      y: (screenPoint.y + this.viewport.y) / this.viewport.zoom
    };
  }

  /**
   * 世界坐标转屏幕坐标
   * @param worldPoint 世界坐标点
   */
  worldToScreen(worldPoint: IPoint): IPoint {
    if (this.renderEngine) {
      return this.renderEngine.worldToScreen(worldPoint);
    }
    
    // 简化实现
    return {
      x: worldPoint.x * this.viewport.zoom - this.viewport.x,
      y: worldPoint.y * this.viewport.zoom - this.viewport.y
    };
  }

  /**
   * 高级碰撞检测 - 点测试
   * @param worldPoint 世界坐标点
   */
  hitTestAdvanced(worldPoint: IPoint): IShape[] {
    if (this.interactionManager) {
      return this.interactionManager.hitTestAll(worldPoint);
    }
    
    // 回退到基础实现
    const hit = this.hitTest(worldPoint);
    return hit ? [hit] : [];
  }

  /**
   * 高级碰撞检测 - 区域测试
   * @param bounds 区域边界
   */
  hitTestBounds(bounds: { x: number; y: number; width: number; height: number }): IShape[] {
    if (this.interactionManager) {
      const collisionDetector = this.interactionManager.getCollisionDetector();
      return collisionDetector.boundsTest(bounds);
    }
    
    // 简化实现
    return this.getShapes().filter(shape => {
      const shapeBounds = shape.getBounds();
      return this.boundsIntersect(bounds, shapeBounds);
    });
  }

  private boundsIntersect(bounds1: any, bounds2: any): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  // === 渲染控制API ===

  /**
   * 开始渲染循环
   */
  startRender(): void {
    if (this.renderEngine) {
      this.renderEngine.start();
    }
    
    // 启动自定义渲染循环来确保shapes被渲染
    this.startShapeRenderLoop();
  }

  /**
   * 停止渲染循环
   */
  stopRender(): void {
    if (this.renderEngine) {
      this.renderEngine.stop();
    }
    
    this.stopShapeRenderLoop();
  }
  
  private renderLoopId: number | null = null;
  
  /**
   * 启动形状渲染循环
   */
  private startShapeRenderLoop(): void {
    if (this.renderLoopId !== null) return;
    
    const loop = () => {
      // 渲染所有形状
      this.renderShapes();
      
      // 继续下一帧
      this.renderLoopId = requestAnimationFrame(loop);
    };
    
    this.renderLoopId = requestAnimationFrame(loop);
  }
  
  /**
   * 停止形状渲染循环
   */
  private stopShapeRenderLoop(): void {
    if (this.renderLoopId !== null) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  /**
   * 手动触发一次渲染
   */
  render(): void {
    if (this.renderEngine) {
      this.renderEngine.render();
    }
    
    // 渲染所有形状
    this.renderShapes();
  }
  
  /**
   * 渲染形状到画布
   */
  private renderShapes(): void {
    if (!this.canvas) return;
    
    let context: CanvasRenderingContext2D | null = null;
    
    // 尝试获取2D上下文进行形状渲染
    if (this.config.renderEngine === 'canvas2d') {
      context = this.canvas.getContext('2d');
    } else {
      // 对于WebGL，创建叠加的2D画布来绘制形状
      context = this.getOrCreateOverlayContext();
    }
    
    if (context) {
      // 清除画布
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      
      // 简化的渲染：先不应用复杂的视口变换
      context.save();
      
      // 渲染所有形状
      const sortedShapes = Array.from(this.shapes.values())
        .filter(shape => shape && shape.visible)
        .sort((a, b) => a.zIndex - b.zIndex);
        
      for (const shape of sortedShapes) {
        try {
          shape.render(context);
        } catch (error) {
          console.warn('Failed to render shape:', shape.id, error);
        }
      }
      
      // 渲染正在绘制的临时形状
      this.renderCurrentDrawing(context);
      
      context.restore();
    }
  }
  
  /**
   * 渲染正在绘制的临时形状
   */
  private renderCurrentDrawing(context: CanvasRenderingContext2D): void {
    if (!this.interactionManager) return;
    
    const activeTool = this.interactionManager.getActiveTool();
    if (!activeTool) return;
    
    // 检查工具是否正在绘制，并获取当前形状进行预览
    const toolInstance = activeTool as any;
    if (toolInstance.isCurrentlyDrawing && toolInstance.isCurrentlyDrawing() && toolInstance.getCurrentShape) {
      const currentShape = toolInstance.getCurrentShape();
      if (currentShape && currentShape.render) {
        try {
          // 设置预览样式（半透明）
          context.save();
          context.globalAlpha = 0.8;
          currentShape.render(context);
          context.restore();
        } catch (error) {
          console.warn('Failed to render current drawing:', error);
          context.restore(); // 确保恢复状态
        }
      }
    }
  }

  /**
   * 获取或创建2D叠加画布上下文
   */
  private getOrCreateOverlayContext(): CanvasRenderingContext2D | null {
    if (!this.canvas || !this.canvas.parentElement) return null;
    
    let overlay = document.getElementById('canvas-2d-overlay') as HTMLCanvasElement;
    
    if (!overlay) {
      overlay = document.createElement('canvas');
      overlay.id = 'canvas-2d-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1';
      
      // 将叠加层添加到主画布的父元素，使其与主画布重叠
      this.canvas.parentElement.style.position = 'relative';
      this.canvas.parentElement.appendChild(overlay);
    }
    
    // 确保叠加层尺寸与主画布一致
    if (overlay.width !== this.canvas.width || overlay.height !== this.canvas.height) {
      overlay.width = this.canvas.width;
      overlay.height = this.canvas.height;
      overlay.style.width = this.canvas.style.width || this.canvas.width + 'px';
      overlay.style.height = this.canvas.style.height || this.canvas.height + 'px';
    }
    
    return overlay.getContext('2d');
  }

  /**
   * 检查是否正在渲染
   */
  isRendering(): boolean {
    return this.renderEngine ? this.renderEngine.isRunning() : false;
  }

  /**
   * 获取渲染统计信息
   */
  getRenderStats() {
    return this.renderEngine ? this.renderEngine.getStats() : null;
  }

  // === 资源管理 ===

  /**
   * 销毁SDK
   */
  dispose(): void {
    // 清理所有形状
    for (const shape of this.shapes.values()) {
      shape.dispose();
    }
    
    this.shapes.clear();
    this.layers.clear();
    this.selectedShapes.clear();
    
    // 销毁渲染引擎
    if (this.renderEngine) {
      this.renderEngine.dispose();
      this.renderEngine = null;
    }
    
    this.canvas = null;
    this.isInitializedFlag = false;
    
    // 清理事件监听器
    this.removeAllListeners();
  }
}