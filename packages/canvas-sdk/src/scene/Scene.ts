import { Point, Rect, RenderContext } from '../../types';
import { Transform, Vector2 } from '../math';
import { ISceneNode, SceneNode } from './SceneNode';

/**
 * 场景管理器
 */
export class Scene extends SceneNode {
  private _activeCamera: Camera | null = null;
  private _cameras: Camera[] = [];
  private _layers: Map<string, SceneLayer> = new Map();
  private _defaultLayer: SceneLayer;

  constructor(id: string = 'scene', name?: string) {
    super(id, name);
    
    // 创建默认图层
    this._defaultLayer = new SceneLayer('default', 'Default Layer');
    this._layers.set('default', this._defaultLayer);
    this.addChild(this._defaultLayer);

    // 创建默认摄像机
    const defaultCamera = new Camera('defaultCamera', 'Default Camera');
    this.addCamera(defaultCamera);
    this.setActiveCamera(defaultCamera);
  }

  // 摄像机管理
  addCamera(camera: Camera): void {
    this._cameras.push(camera);
    this.addChild(camera);
  }

  removeCamera(camera: Camera): void {
    const index = this._cameras.indexOf(camera);
    if (index !== -1) {
      this._cameras.splice(index, 1);
      this.removeChild(camera);
      
      if (this._activeCamera === camera) {
        this._activeCamera = this._cameras.length > 0 ? this._cameras[0] : null;
      }
    }
  }

  setActiveCamera(camera: Camera): void {
    if (this._cameras.includes(camera)) {
      this._activeCamera = camera;
    }
  }

  getActiveCamera(): Camera | null {
    return this._activeCamera;
  }

  getCameras(): Camera[] {
    return [...this._cameras];
  }

  // 图层管理
  createLayer(id: string, name?: string, zIndex: number = 0): SceneLayer {
    const layer = new SceneLayer(id, name || id);
    layer.zIndex = zIndex;
    this._layers.set(id, layer);
    this.addChild(layer);
    return layer;
  }

  getLayer(id: string): SceneLayer | undefined {
    return this._layers.get(id);
  }

  getDefaultLayer(): SceneLayer {
    return this._defaultLayer;
  }

  removeLayer(id: string): void {
    const layer = this._layers.get(id);
    if (layer && layer !== this._defaultLayer) {
      this._layers.delete(id);
      this.removeChild(layer);
    }
  }

  // 便利方法：添加节点到默认图层
  addNode(node: ISceneNode): void {
    this._defaultLayer.addChild(node);
  }

  addNodeToLayer(node: ISceneNode, layerId: string): void {
    const layer = this._layers.get(layerId);
    if (layer) {
      layer.addChild(node);
    } else {
      console.warn(`Layer ${layerId} not found, adding to default layer`);
      this._defaultLayer.addChild(node);
    }
  }

  // 查找方法
  findNode(id: string): ISceneNode | null {
    return this.findChildRecursive(id);
  }

  findNodesByType<T extends ISceneNode>(type: new (...args: any[]) => T): T[] {
    const results: T[] = [];
    this.findNodesByTypeRecursive(this, type, results);
    return results;
  }

  private findNodesByTypeRecursive<T extends ISceneNode>(
    node: ISceneNode, 
    type: new (...args: any[]) => T, 
    results: T[]
  ): void {
    if (node instanceof type) {
      results.push(node);
    }
    
    for (const child of node.children) {
      this.findNodesByTypeRecursive(child, type, results);
    }
  }

  // 渲染
  render(context: RenderContext): void {
    if (!this._activeCamera) {
      super.render(context);
      return;
    }

    // 使用活动摄像机的视口进行渲染
    const { ctx } = context;
    
    // 只在Canvas 2D上下文中应用变换
    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.save();
      // 应用摄像机变换
      this._activeCamera.applyViewTransform(ctx);
    }

    // 渲染场景内容
    super.render(context);

    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.restore();
    }
  }

  // 坐标转换
  screenToWorld(screenPoint: Point): Point {
    if (!this._activeCamera) {
      return screenPoint;
    }
    return this._activeCamera.screenToWorld(screenPoint);
  }

  worldToScreen(worldPoint: Point): Point {
    if (!this._activeCamera) {
      return worldPoint;
    }
    return this._activeCamera.worldToScreen(worldPoint);
  }

  protected updateSelf(deltaTime: number): void {
    // 场景级别的更新逻辑
  }

  protected renderSelf(context: RenderContext): void {
    // 场景本身不需要渲染内容
  }

  // 统计信息
  getStats(): {
    nodeCount: number;
    layerCount: number;
    cameraCount: number;
    visibleNodes: number;
  } {
    let nodeCount = 0;
    let visibleNodes = 0;
    
    const countNodes = (node: ISceneNode) => {
      nodeCount++;
      if (node.visible) visibleNodes++;
      
      for (const child of node.children) {
        countNodes(child);
      }
    };
    
    countNodes(this);

    return {
      nodeCount: nodeCount - 1, // 减去场景本身
      layerCount: this._layers.size,
      cameraCount: this._cameras.length,
      visibleNodes: visibleNodes - 1 // 减去场景本身
    };
  }
}

/**
 * 场景图层
 */
export class SceneLayer extends SceneNode {
  public opacity: number = 1.0;
  public blendMode: GlobalCompositeOperation = 'source-over';

  constructor(id: string, name?: string) {
    super(id, name);
  }

  protected updateSelf(deltaTime: number): void {
    // 图层级别的更新逻辑
  }

  protected renderSelf(context: RenderContext): void {
    const { ctx } = context;
    
    // 只在Canvas 2D上下文中应用图层样式
    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.globalAlpha *= this.opacity;
      ctx.globalCompositeOperation = this.blendMode;
    }
  }
}

/**
 * 摄像机类
 */
export class Camera extends SceneNode {
  public zoom: number = 1.0;
  public viewport: Rect = { x: 0, y: 0, width: 800, height: 600 };
  public followTarget: ISceneNode | null = null;
  public followOffset: Vector2 = new Vector2(0, 0);
  public followSpeed: number = 1.0;
  
  private _viewMatrix: Transform | null = null;
  private _viewMatrixDirty: boolean = true;

  constructor(id: string, name?: string) {
    super(id, name);
  }

  // 视口管理
  setViewport(viewport: Rect): void {
    this.viewport = { ...viewport };
    this._viewMatrixDirty = true;
  }

  getViewport(): Rect {
    return { ...this.viewport };
  }

  // 缩放控制
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this._viewMatrixDirty = true;
  }

  zoomIn(factor: number = 1.2): void {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor: number = 1.2): void {
    this.setZoom(this.zoom / factor);
  }

  zoomToFit(bounds: Rect, padding: number = 50): void {
    const scaleX = (this.viewport.width - padding * 2) / bounds.width;
    const scaleY = (this.viewport.height - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY);
    
    this.setZoom(scale);
    this.lookAt(new Vector2(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    ));
  }

  // 摄像机移动
  lookAt(target: Vector2): void {
    this.transform.setPosition(target);
    this._viewMatrixDirty = true;
  }

  pan(delta: Vector2): void {
    this.transform.translate(delta);
    this._viewMatrixDirty = true;
  }

  // 跟随目标
  setFollowTarget(target: ISceneNode | null, offset?: Vector2): void {
    this.followTarget = target;
    if (offset) {
      this.followOffset = offset.clone();
    }
  }

  // 坐标转换
  screenToWorld(screenPoint: Point): Point {
    const viewMatrix = this.getViewMatrix();
    const screenVector = new Vector2(
      screenPoint.x - this.viewport.width / 2,
      screenPoint.y - this.viewport.height / 2
    );
    
    // 应用逆变换
    const worldVector = viewMatrix.inverseTransformPoint(screenVector);
    return { x: worldVector.x, y: worldVector.y };
  }

  worldToScreen(worldPoint: Point): Point {
    const viewMatrix = this.getViewMatrix();
    const worldVector = new Vector2(worldPoint.x, worldPoint.y);
    
    // 应用视图变换
    const screenVector = viewMatrix.transformPoint(worldVector);
    return {
      x: screenVector.x + this.viewport.width / 2,
      y: screenVector.y + this.viewport.height / 2
    };
  }

  // 视图变换
  applyViewTransform(ctx: CanvasRenderingContext2D): void {
    const viewMatrix = this.getViewMatrix();
    const matrix = viewMatrix.matrix;
    const e = matrix.elements;
    
    // 移动到视口中心
    ctx.translate(this.viewport.width / 2, this.viewport.height / 2);
    
    // 应用视图变换
    ctx.transform(e[0], e[1], e[3], e[4], e[6], e[7]);
  }

  private getViewMatrix(): Transform {
    if (this._viewMatrixDirty) {
      this.updateViewMatrix();
    }
    return this._viewMatrix!;
  }

  private updateViewMatrix(): void {
    // 创建视图矩阵：缩放 -> 旋转 -> 平移
    const position = this.transform.position;
    const rotation = this.transform.rotation;
    
    this._viewMatrix = new Transform();
    this._viewMatrix.setScale(this.zoom, this.zoom);
    this._viewMatrix.setRotation(-rotation); // 摄像机旋转是反向的
    this._viewMatrix.setPosition(-position.x * this.zoom, -position.y * this.zoom);
    
    this._viewMatrixDirty = false;
  }

  protected updateSelf(deltaTime: number): void {
    // 跟随目标
    if (this.followTarget) {
      const targetWorldTransform = this.followTarget.getWorldTransform();
      const targetPosition = targetWorldTransform.position.add(this.followOffset);
      
      if (this.followSpeed >= 1.0) {
        this.lookAt(targetPosition);
      } else {
        const currentPosition = this.transform.position;
        const lerpedPosition = currentPosition.lerp(targetPosition, this.followSpeed * deltaTime / 16.67); // 60fps基准
        this.lookAt(lerpedPosition);
      }
    }
  }

  protected renderSelf(context: RenderContext): void {
    // 摄像机本身不需要渲染
  }

  // 视锥体检测
  isInView(bounds: Rect): boolean {
    const viewBounds = this.getViewBounds();
    return !(bounds.x + bounds.width < viewBounds.x || 
             viewBounds.x + viewBounds.width < bounds.x || 
             bounds.y + bounds.height < viewBounds.y || 
             viewBounds.y + viewBounds.height < bounds.y);
  }

  getViewBounds(): Rect {
    const position = this.transform.position;
    const halfWidth = this.viewport.width / (2 * this.zoom);
    const halfHeight = this.viewport.height / (2 * this.zoom);
    
    return {
      x: position.x - halfWidth,
      y: position.y - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2
    };
  }
}
