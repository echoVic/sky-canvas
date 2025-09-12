/**
 * 渲染引擎核心实现
 */
import { 
  IRenderEngine, 
  IRenderLayer, 
  IRenderable, 
  IViewport, 
  IRenderStats, 
  IRenderEngineConfig 
} from './IRenderEngine';
import { IGraphicsContext, IGraphicsContextFactory, IPoint } from '../graphics/IGraphicsContext';
import { DirtyRegionManager } from './DirtyRegionManager';
import { LayerCache } from './LayerCache';
import { BatchManager, createBatchManagerWithDefaultStrategies } from '../batch';

/**
 * 渲染层实现
 */
class RenderLayer implements IRenderLayer {
  private renderables: Map<string, IRenderable> = new Map();

  constructor(
    public readonly id: string,
    public visible: boolean = true,
    public opacity: number = 1,
    public zIndex: number = 0
  ) {}

  addRenderable(renderable: IRenderable): void {
    this.renderables.set(renderable.id, renderable);
  }

  removeRenderable(id: string): void {
    this.renderables.delete(id);
  }

  getRenderables(): IRenderable[] {
    return Array.from(this.renderables.values())
      .filter(r => r.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  clear(): void {
    this.renderables.clear();
  }
}

/**
 * 渲染引擎实现
 */
export class RenderEngine implements IRenderEngine {
  private context: IGraphicsContext | null = null;
  private layers: Map<string, IRenderLayer> = new Map();
  private viewport: IViewport = { 
    x: 0, 
    y: 0, 
    width: 800, 
    height: 600, 
    zoom: 1 
  };
  private config: IRenderEngineConfig;
  private stats: IRenderStats = {
    frameCount: 0,
    fps: 0,
    renderTime: 0,
    objectsRendered: 0
  };

  // 新增的性能优化组件
  private dirtyRegionManager: DirtyRegionManager = new DirtyRegionManager();
  private layerCache: LayerCache = new LayerCache();
  private batchManager: BatchManager | null = null;

  private isRunningFlag = false;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];

  constructor(config: IRenderEngineConfig = {}) {
    this.config = {
      targetFPS: 60,
      enableVSync: true,
      enableCulling: true,
      cullMargin: 50,
      ...config
    };
  }

  async initialize<TCanvas>(
    factory: IGraphicsContextFactory<TCanvas>, 
    canvas: TCanvas
  ): Promise<void> {
    if (this.context) {
      throw new Error('Render engine already initialized');
    }

    if (!factory.isSupported()) {
      throw new Error('Graphics context not supported');
    }

    this.context = await factory.createContext(canvas);
    
    // 初始化批处理管理器 
    // 简化处理，假设我们有 WebGL 上下文
    const gl = (this.context as any).gl;
    if (gl) {
      this.batchManager = createBatchManagerWithDefaultStrategies(gl);
    }
    
    // 设置默认视口
    this.viewport.width = this.context.width;
    this.viewport.height = this.context.height;
  }

  start(): void {
    if (this.isRunningFlag || !this.context) {
      return;
    }

    this.isRunningFlag = true;
    this.lastFrameTime = performance.now();

    if (this.config.enableVSync) {
      this.startVSyncLoop();
    } else {
      this.startCustomLoop();
    }
  }

  stop(): void {
    this.isRunningFlag = false;

    if (this.animationId !== null) {
      if (this.config.enableVSync) {
        cancelAnimationFrame(this.animationId);
      } else {
        clearTimeout(this.animationId);
      }
      this.animationId = null;
    }
  }

  private renderRegion(region: any): void {
    if (!this.context) {
      return;
    }
    
    // 保存当前上下文状态
    this.context.save();
    
    // 设置裁剪区域
    this.context.beginPath();
    this.context.rect(region.x, region.y, region.width, region.height);
    this.context.clip();
    
    // 渲染该区域内的所有层
    this.renderLayers();
    
    // 恢复上下文状态
    this.context.restore();
  }

  render(): void {
    if (!this.context) {
      return;
    }

    const startTime = performance.now();

    // 优化脏区域
    const dirtyRegions = this.dirtyRegionManager.optimizeDirtyRegions();
    
    if (dirtyRegions.length > 0) {
      // 只重绘脏区域
      dirtyRegions.forEach(region => {
        this.renderRegion(region);
      });
    } else {
      // 全屏重绘（首次渲染或需要全屏更新时）
      // 清空画布
      this.context.clear();

      // 设置视口变换
      this.context.save();
      this.setupViewportTransform();

      // 渲染所有层
      this.renderLayers();

      this.context.restore();
    }

    // 更新脏区域管理器为下一帧做准备
    this.dirtyRegionManager.prepareNextFrame();

    // 更新统计信息
    const renderTime = performance.now() - startTime;
    this.updateStats(renderTime);
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  getContext(): IGraphicsContext | null {
    return this.context;
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  getViewport(): IViewport {
    return { ...this.viewport };
  }

  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    const layer = new RenderLayer(id, true, 1, zIndex);
    this.layers.set(id, layer);
    return layer;
  }

  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id);
  }

  removeLayer(id: string): void {
    this.layers.delete(id);
  }

  screenToWorld(point: IPoint): IPoint {
    if (!this.context) {
      return point;
    }

    const screenPoint = this.context.screenToWorld(point);
    return {
      x: (screenPoint.x + this.viewport.x) / this.viewport.zoom,
      y: (screenPoint.y + this.viewport.y) / this.viewport.zoom
    };
  }

  worldToScreen(point: IPoint): IPoint {
    if (!this.context) {
      return point;
    }

    const worldPoint = {
      x: point.x * this.viewport.zoom - this.viewport.x,
      y: point.y * this.viewport.zoom - this.viewport.y
    };

    return this.context.worldToScreen(worldPoint);
  }

  getStats(): IRenderStats {
    return { ...this.stats };
  }

  // 新增的性能优化方法
  /**
   * 标记区域为脏区域
   */
  markRegionDirty(bounds: any): void {
    this.dirtyRegionManager.markRegionDirty(bounds);
  }

  /**
   * 使图层缓存失效
   */
  invalidateLayerCache(layerId: string): void {
    this.layerCache.invalidateCache(layerId);
  }

  /**
   * 获取缓存内存使用量
   */
  getCacheMemoryUsage(): number {
    return this.layerCache.getCacheMemoryUsage();
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    this.layerCache.cleanupExpiredCache();
  }

  /**
   * 点击测试 - 查找指定位置的可渲染对象
   * @param point 屏幕坐标点
   * @returns 命中的可渲染对象，如果没有则返回null
   */
  hitTest(point: IPoint): IRenderable | null {
    const worldPoint = this.screenToWorld(point);
    
    // 从上到下遍历层（按z轴倒序）
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    
    for (const layer of sortedLayers) {
      const renderables = layer.getRenderables().reverse(); // 从上到下
      
      for (const renderable of renderables) {
        if (renderable.hitTest(worldPoint)) {
          return renderable;
        }
      }
    }
    
    return null;
  }

  /**
   * 获取视口内的对象
   * @returns 视口范围内的所有可渲染对象
   */
  getObjectsInViewport(): IRenderable[] {
    const cullMargin = this.config.cullMargin || 50;
    const viewportBounds = {
      x: this.viewport.x - cullMargin,
      y: this.viewport.y - cullMargin,
      width: this.viewport.width / this.viewport.zoom + cullMargin * 2,
      height: this.viewport.height / this.viewport.zoom + cullMargin * 2
    };
    
    const result: IRenderable[] = [];
    
    for (const layer of this.layers.values()) {
      if (!layer.visible) continue;
      
      for (const renderable of layer.getRenderables()) {
        if (this.boundsIntersect(renderable.getBounds(), viewportBounds)) {
          result.push(renderable);
        }
      }
    }
    
    return result;
  }

  /**
   * 检查两个边界框是否相交
   */
  private boundsIntersect(a: any, b: any): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  dispose(): void {
    this.stop();

    if (this.context) {
      this.context.dispose();
      this.context = null;
    }

    this.layers.clear();
  }

  // 私有方法
  private startVSyncLoop(): void {
    const loop = () => {
      if (!this.isRunningFlag) return;

      this.render();
      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private startCustomLoop(): void {
    const targetInterval = 1000 / (this.config.targetFPS || 60);

    const loop = () => {
      if (!this.isRunningFlag) return;

      this.render();
      this.animationId = setTimeout(loop, targetInterval) as unknown as number;
    };

    this.animationId = setTimeout(loop, targetInterval) as unknown as number;
  }

  private setupViewportTransform(): void {
    if (!this.context) return;

    this.context.scale(this.viewport.zoom, this.viewport.zoom);
    this.context.translate(-this.viewport.x, -this.viewport.y);
  }

  private renderLayers(): void {
    if (!this.context) return;

    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    let objectsRendered = 0;

    for (const layer of sortedLayers) {
      this.context.save();
      this.context.setOpacity(layer.opacity);

      const renderables = layer.getRenderables();

      // 检查图层是否可以缓存
      if (this.canCacheLayer(layer, renderables)) {
        // 从缓存渲染
        try {
          this.layerCache.renderFromCache(layer.id, this.context as any, { x: 0, y: 0 });
          objectsRendered += renderables.length;
        } catch (error) {
          // 缓存失败则正常渲染
          this.renderLayerRenderables(renderables);
          objectsRendered += renderables.length;
        }
      } else {
        // 使用批处理优化渲染
        if (renderables.length > 10) {
          // 使用批处理渲染
          this.renderWithBatching(renderables);
          objectsRendered += renderables.length;
        } else {
          // 正常渲染
          this.renderLayerRenderables(renderables);
          objectsRendered += renderables.length;
        }
      }

      this.context.restore();
    }

    this.stats.objectsRendered = objectsRendered;
  }

  private renderLayerRenderables(renderables: IRenderable[]): void {
    if (!this.context) {
      return;
    }
    
    for (const renderable of renderables) {
      this.context.save();
      renderable.render(this.context);
      
      // 更新脏区域管理器中的形状状态
      this.dirtyRegionManager.updateCurrentFrameShape(renderable as any);
      
      this.context.restore();
    }
  }

  private renderWithBatching(renderables: IRenderable[]): void {
    // 分类渲染对象以便批处理
    const renderableGroups = this.groupRenderablesByType(renderables);
    
    // 对每组同类型渲染对象进行批处理渲染
    for (const [renderableType, groupRenderables] of renderableGroups.entries()) {
      if (groupRenderables.length > 10 && this.batchManager) {
        // 使用实例化渲染策略
        this.batchManager.setStrategy('instanced');
        groupRenderables.forEach(renderable => {
          // 创建适配器将 IRenderEngine.IRenderable 转换为批处理系统的 IRenderable
          const batchRenderable = this.adaptRenderable(renderable);
          this.batchManager!.addRenderable(batchRenderable);
        });
        // 批处理管理器会在 flush 时处理渲染
      } else {
        // 正常渲染
        this.renderLayerRenderables(groupRenderables);
      }
    }
    
    // 执行批处理渲染
    if (this.batchManager) {
      // 这里需要适当的投影矩阵，简化处理
      const projectionMatrix = { multiply: (m: any) => m } as any; // 占位符
      this.batchManager.flush(projectionMatrix);
    }
  }

  private groupRenderablesByType(renderables: IRenderable[]): Map<string, IRenderable[]> {
    const groups = new Map<string, IRenderable[]>();
    
    renderables.forEach(renderable => {
      const type = renderable.constructor.name;
      const group = groups.get(type) || [];
      group.push(renderable);
      groups.set(type, group);
    });
    
    return groups;
  }

  private canCacheLayer(layer: IRenderLayer, renderables: IRenderable[]): boolean {
    // 静态图层可以缓存（没有动画或频繁变化的元素）
    return renderables.every(renderable => !this.isRenderableAnimating(renderable));
  }

  private isRenderableAnimating(renderable: IRenderable): boolean {
    // 简化实现，实际应用中需要检查动画状态
    return false;
  }

  private updateStats(renderTime: number): void {
    this.stats.frameCount++;
    this.stats.renderTime = renderTime;

    // 计算FPS
    const currentTime = performance.now();
    this.frameTimeHistory.push(currentTime);

    // 保持最近1秒的帧时间记录
    while (this.frameTimeHistory.length > 0) {
      const firstFrameTime = this.frameTimeHistory[0];
      if (firstFrameTime !== undefined && currentTime - firstFrameTime > 1000) {
        this.frameTimeHistory.shift();
      } else {
        break;
      }
    }

    this.stats.fps = this.frameTimeHistory.length;
    this.lastFrameTime = currentTime;
  }

  /**
   * 适配器：将 IRenderEngine.IRenderable 转换为批处理系统的 IRenderable
   */
  private adaptRenderable(renderable: IRenderable): import('../batch').IRenderable {
    // 从可渲染对象中提取几何数据
    const geometryData = this.extractGeometryFromRenderable(renderable);
    
    return {
      getVertices: () => geometryData.vertices,
      getIndices: () => geometryData.indices,
      getShader: () => this.determineShaderType(renderable),
      getBlendMode: () => this.determineBlendMode(renderable),
      getZIndex: () => renderable.zIndex || 0
    };
  }

  /**
   * 从可渲染对象中提取几何数据
   */
  private extractGeometryFromRenderable(renderable: IRenderable): { vertices: Float32Array; indices: Uint16Array } {
    // 如果是 RenderableShapeView 类型，可以直接访问其实体数据
    if ((renderable as any).getEntity) {
      const entity = (renderable as any).getEntity();
      return this.createGeometryFromEntity(entity);
    }
    
    // 对于其他类型的可渲染对象，从边界框生成基本几何体
    const bounds = renderable.getBounds();
    return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  /**
   * 从形状实体创建几何数据
   */
  private createGeometryFromEntity(entity: any): { vertices: Float32Array; indices: Uint16Array } {
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');
    
    // 解析颜色
    const color = this.parseEntityColor(entity);
    const { position, scale } = entity.transform;

    switch (entity.type) {
      case 'rectangle': {
        const { size, borderRadius } = entity;
        if (borderRadius && borderRadius > 0) {
          // 对于圆角矩形，使用多边形近似
          const points = this.generateRoundedRectPoints(
            position.x, position.y, 
            size.width * scale.x, size.height * scale.y, 
            borderRadius
          );
          const geometryData = GeometryGenerator.createPolygon(points, color);
          return { vertices: geometryData.vertices, indices: geometryData.indices };
        } else {
          const geometryData = GeometryGenerator.createRectangle(
            position.x, position.y,
            size.width * scale.x, size.height * scale.y,
            color
          );
          return { vertices: geometryData.vertices, indices: geometryData.indices };
        }
      }
      
      case 'circle': {
        const { radius } = entity;
        const geometryData = GeometryGenerator.createCircle(
          position.x, position.y,
          radius * Math.max(scale.x, scale.y),
          32, // segments
          color
        );
        return { vertices: geometryData.vertices, indices: geometryData.indices };
      }
      
      case 'path': {
        // 对于路径，简化处理，返回包围盒矩形
        const bounds = this.calculateEntityBounds(entity);
        return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height, color);
      }
      
      case 'text': {
        // 对于文本，创建文本边界框
        const bounds = this.calculateTextBounds(entity);
        return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height, color);
      }
      
      default: {
        // 未知类型，使用包围盒
        const bounds = this.calculateEntityBounds(entity);
        return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height, color);
      }
    }
  }

  /**
   * 创建矩形几何体
   */
  private createRectangleGeometry(
    x: number, y: number, width: number, height: number, 
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): { vertices: Float32Array; indices: Uint16Array } {
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');
    const geometryData = GeometryGenerator.createRectangle(x, y, width, height, color);
    return { vertices: geometryData.vertices, indices: geometryData.indices };
  }

  /**
   * 解析实体颜色
   */
  private parseEntityColor(entity: any): [number, number, number, number] {
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');
    
    if (entity.style.fillColor) {
      return GeometryGenerator.parseColor(entity.style.fillColor);
    } else if (entity.style.strokeColor) {
      return GeometryGenerator.parseColor(entity.style.strokeColor);
    }
    
    return [1, 1, 1, 1]; // 默认白色
  }

  /**
   * 生成圆角矩形顶点
   */
  private generateRoundedRectPoints(
    x: number, y: number, width: number, height: number, radius: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const segments = 8; // 每个角的分段数
    
    // 限制圆角半径
    const maxRadius = Math.min(width, height) / 2;
    const r = Math.min(radius, maxRadius);
    
    // 右上角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2);
      points.push({
        x: x + width - r + Math.cos(angle) * r,
        y: y + r - Math.sin(angle) * r
      });
    }
    
    // 右下角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + Math.PI / 2;
      points.push({
        x: x + width - r + Math.cos(angle) * r,
        y: y + height - r - Math.sin(angle) * r
      });
    }
    
    // 左下角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + Math.PI;
      points.push({
        x: x + r + Math.cos(angle) * r,
        y: y + height - r - Math.sin(angle) * r
      });
    }
    
    // 左上角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + (3 * Math.PI / 2);
      points.push({
        x: x + r + Math.cos(angle) * r,
        y: y + r - Math.sin(angle) * r
      });
    }
    
    return points;
  }

  /**
   * 计算实体包围盒
   */
  private calculateEntityBounds(entity: any): { x: number; y: number; width: number; height: number } {
    const { position, scale } = entity.transform;
    
    switch (entity.type) {
      case 'rectangle':
        return {
          x: position.x,
          y: position.y,
          width: entity.size.width * scale.x,
          height: entity.size.height * scale.y
        };
      case 'circle':
        const radius = entity.radius * Math.max(scale.x, scale.y);
        return {
          x: position.x - radius,
          y: position.y - radius,
          width: radius * 2,
          height: radius * 2
        };
      case 'text':
        return this.calculateTextBounds(entity);
      default:
        return { x: position.x, y: position.y, width: 100, height: 100 };
    }
  }

  /**
   * 计算文本包围盒
   */
  private calculateTextBounds(entity: any): { x: number; y: number; width: number; height: number } {
    const { position, scale } = entity.transform;
    const { content, fontSize } = entity;
    
    // 简化的文本尺寸计算
    const estimatedWidth = content.length * fontSize * 0.6 * scale.x;
    const estimatedHeight = fontSize * scale.y;
    
    return {
      x: position.x,
      y: position.y - estimatedHeight, // 文本基线调整
      width: estimatedWidth,
      height: estimatedHeight
    };
  }

  /**
   * 确定着色器类型
   */
  private determineShaderType(renderable: IRenderable): string {
    // 如果是形状视图，根据实体类型选择着色器
    if ((renderable as any).getEntity) {
      const entity = (renderable as any).getEntity();
      switch (entity.type) {
        case 'text':
          return 'text'; // 文本着色器
        case 'circle':
          return 'circle'; // 圆形着色器（可能需要抗锯齿）
        default:
          return 'basic'; // 基础着色器
      }
    }
    
    return 'basic';
  }

  /**
   * 确定混合模式
   */
  private determineBlendMode(renderable: IRenderable): number {
    // 如果是形状视图，根据样式确定混合模式
    if ((renderable as any).getEntity) {
      const entity = (renderable as any).getEntity();
      const opacity = entity.style.opacity || 1;
      
      if (opacity < 1) {
        return 1; // Alpha blending
      }
    }
    
    return 0; // 默认混合模式
  }
}